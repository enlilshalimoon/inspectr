// POST /api/ai/process-photo
// Body: { photo_id: string }
//
// Runs the full per-photo AI pipeline:
//   1. Vision analysis (Claude Haiku) -> photos.ai_analysis
//   2. Load any voice transcript already attached to the photo
//   3. Finding draft (Claude Sonnet) -> insert into findings
//
// Idempotent: if vision already ran we reuse it; if a finding already exists
// for the photo we return it instead of creating a duplicate.
//
// Section: a photo uploaded with no section ("Auto" on the capture screen) is
// filed into the section the vision model recognised, creating that section if
// the inspection doesn't have it yet (pool, fireplace, outbuilding).
//
// Dismissed: if the inspector deleted this photo's finding, a plain call does
// nothing. Only an explicit regenerate (Try again / a new voice note) re-drafts.
//
// Auth: relies on the user's Supabase session cookie + RLS. The route never
// touches another inspector's photos.

import { NextResponse, type NextRequest } from "next/server";
import { lockError } from "@/lib/inspection/lock";
import { findOrCreateSection } from "@/lib/inspection/sections-db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzePhoto, draftFinding, UnsupportedImageError } from "@/lib/ai/anthropic";
import {
  isFindingDismissed,
  resolveSectionType,
  withDismissed,
} from "@/lib/inspection/photos";
import type {
  Photo,
  VoiceNote,
  Inspection,
  InspectionSection,
  SectionType,
  VisionAnalysis,
} from "@/lib/supabase/types";

const body = z.object({
  photo_id: z.string().uuid(),
  regenerate: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { photo_id, regenerate } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Load photo. RLS scopes to inspector's own.
  const { data: photoRow, error: photoErr } = await supabase
    .from("photos")
    .select("id, inspection_id, section_id, storage_path, ai_analysis")
    .eq("id", photo_id)
    .maybeSingle();

  if (photoErr || !photoRow) {
    return NextResponse.json({ error: "photo not found" }, { status: 404 });
  }
  const photo = photoRow as Pick<
    Photo,
    "id" | "inspection_id" | "section_id" | "storage_path" | "ai_analysis"
  >;

  // A finalized report is locked: no new or re-drafted findings until the
  // inspector re-opens it.
  const locked = await lockError(supabase, { inspectionId: photo.inspection_id });
  if (locked) {
    return NextResponse.json({ error: "report locked", message: locked }, { status: 409 });
  }

  // ---------------------------------------------------------------------
  // Stage 1: vision analysis (or reuse if already cached on the row)
  // ---------------------------------------------------------------------
  const dismissed = isFindingDismissed(photo.ai_analysis);
  if (dismissed && !regenerate) {
    return NextResponse.json({
      finding: null,
      dismissed: true,
      section_id: photo.section_id,
    });
  }

  // Cached vision result, minus our own bookkeeping flag. A row holding only
  // the flag (no real analysis) is treated as not analysed yet.
  const cached = photo.ai_analysis ? withDismissed(photo.ai_analysis, false) : null;
  let visionAnalysis: VisionAnalysis | null =
    cached && "primary_subject" in cached ? (cached as unknown as VisionAnalysis) : null;

  // Look up section type for hint
  let sectionType: SectionType | undefined;
  if (photo.section_id) {
    const { data: sect } = await supabase
      .from("inspection_sections")
      .select("section_type")
      .eq("id", photo.section_id)
      .maybeSingle();
    if (sect) sectionType = (sect as InspectionSection).section_type;
  }

  if (!visionAnalysis) {
    const { data: signed, error: signErr } = await supabase.storage
      .from("inspection-media")
      .createSignedUrl(photo.storage_path, 60 * 5);
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        { error: "could not sign storage url" },
        { status: 500 },
      );
    }

    try {
      visionAnalysis = await analyzePhoto(signed.signedUrl, sectionType);
    } catch (err) {
      console.error("[vision] failed:", err);
      // UnsupportedImageError carries a message written for the inspector
      // (e.g. "this is a HEIC"). Anything else is an infrastructure problem
      // they can retry, so we keep the internals out of the UI.
      const userMessage =
        err instanceof UnsupportedImageError
          ? err.message
          : "Couldn't analyze this photo. Tap retry — if it keeps failing, the photo may be corrupted.";
      return NextResponse.json(
        { error: "vision analysis failed", message: userMessage, detail: msg(err) },
        { status: 502 },
      );
    }

    await supabase.from("photos").update({ ai_analysis: visionAnalysis }).eq("id", photo.id);
  }

  // ---------------------------------------------------------------------
  // File an "Auto" photo into the section the vision model recognised.
  // ---------------------------------------------------------------------
  let sectionId = photo.section_id;
  if (!sectionId && visionAnalysis) {
    const detected = resolveSectionType(visionAnalysis.section);
    if (detected) {
      sectionId = await findOrCreateSection(supabase, photo.inspection_id, detected);
      if (sectionId) {
        sectionType = detected;
        await supabase.from("photos").update({ section_id: sectionId }).eq("id", photo.id);
      }
    }
  }

  // ---------------------------------------------------------------------
  // Check for existing finding. Reuse it unless caller asked to regenerate
  // (which happens after a voice note arrives and we want to fold it in).
  // We only delete inspector-untouched drafts — never overwrite edits.
  // ---------------------------------------------------------------------
  const { data: existingFindings } = await supabase
    .from("findings")
    .select("id, severity, title, description, recommended_action, ai_confidence, is_approved, inspector_edited")
    .eq("photo_id", photo.id)
    .limit(1);

  const existing = existingFindings?.[0];
  if (existing && !regenerate) {
    return NextResponse.json({
      vision_analysis: visionAnalysis,
      finding: existing,
      section_id: sectionId,
      reused: true,
    });
  }
  if (existing && regenerate && (existing.inspector_edited || existing.is_approved)) {
    // Inspector already touched this one — don't blow it away.
    return NextResponse.json({
      vision_analysis: visionAnalysis,
      finding: existing,
      section_id: sectionId,
      reused: true,
      regenerate_skipped: true,
    });
  }
  // The old draft (if any) is only removed once its replacement is written
  // below, so a failed re-draft never leaves the photo with no finding.

  // ---------------------------------------------------------------------
  // Stage 2: gather any existing voice transcript for the photo
  // ---------------------------------------------------------------------
  const { data: vnRows } = await supabase
    .from("voice_notes")
    .select("transcript, transcript_status")
    .eq("photo_id", photo.id);
  const transcript =
    (vnRows as Pick<VoiceNote, "transcript" | "transcript_status">[] | null)
      ?.filter((v) => v.transcript_status === "completed" && v.transcript)
      ?.map((v) => v.transcript!.trim())
      ?.join("\n") ?? "";

  // ---------------------------------------------------------------------
  // Load property context for the prompt
  // ---------------------------------------------------------------------
  const { data: insp } = await supabase
    .from("inspections")
    .select("property_year_built, property_sqft, property_type")
    .eq("id", photo.inspection_id)
    .maybeSingle();
  const property_context = insp
    ? {
        year_built: (insp as Inspection).property_year_built,
        sqft: (insp as Inspection).property_sqft,
        property_type: (insp as Inspection).property_type,
      }
    : undefined;

  // ---------------------------------------------------------------------
  // Stage 3: finding draft
  // ---------------------------------------------------------------------
  if (!visionAnalysis) {
    return NextResponse.json({ error: "no vision analysis available" }, { status: 500 });
  }

  let finding;
  try {
    finding = await draftFinding({
      section: sectionType ?? resolveSectionType(visionAnalysis.section) ?? "interior",
      vision_analysis: visionAnalysis,
      transcript,
      property_context,
    });
  } catch (err) {
    console.error("[draft] failed:", err);
    return NextResponse.json(
      {
        error: "finding draft failed",
        message: "Read the photo fine, but drafting the finding failed. Tap retry.",
        detail: msg(err),
      },
      { status: 502 },
    );
  }

  if (!existing) {
    // Two requests can race for the same photo (capture reopened while a draft
    // was in flight). If the other one finished first, keep its draft.
    const { data: raced } = await supabase
      .from("findings")
      .select("id, severity, title, description, recommended_action, ai_confidence, is_approved")
      .eq("photo_id", photo.id)
      .limit(1);
    if (raced?.[0]) {
      return NextResponse.json({
        vision_analysis: visionAnalysis,
        finding: raced[0],
        section_id: sectionId,
        reused: true,
      });
    }
  }

  const { data: inserted, error: insErr } = await supabase
    .from("findings")
    .insert({
      inspection_id: photo.inspection_id,
      section_id: sectionId,
      photo_id: photo.id,
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      recommended_action: finding.recommended_action,
      ai_confidence: finding.confidence,
      is_approved: false,
      inspector_edited: false,
    })
    .select("id, severity, title, description, recommended_action, ai_confidence, is_approved")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      {
        error: "could not save finding",
        message: "Couldn't save the drafted finding. Tap Try again.",
        detail: insErr?.message,
      },
      { status: 500 },
    );
  }

  if (existing) await supabase.from("findings").delete().eq("id", existing.id);
  if (dismissed) {
    await supabase
      .from("photos")
      .update({ ai_analysis: withDismissed(visionAnalysis, false) })
      .eq("id", photo.id);
  }

  return NextResponse.json({
    vision_analysis: visionAnalysis,
    finding: inserted,
    section_id: sectionId,
    reused: false,
  });
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
