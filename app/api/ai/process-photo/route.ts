// POST /api/ai/process-photo
// Body: { photo_id: string }
//
// Runs the full per-photo AI pipeline:
//   1. Vision analysis (Claude Haiku) -> photos.ai_analysis
//   2. Load any voice transcript already attached to the photo
//   3. Finding drafts (Claude Sonnet) -> insert into findings, one row per
//      distinct defect in the photo, each in its own section, all pointing at
//      this photo (see lib/ai/multi-defect.ts)
//
// Idempotent: if vision already ran we reuse it; if findings already exist
// for the photo we return them instead of creating duplicates.
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
import { analyzePhoto, draftFindings, UnsupportedImageError } from "@/lib/ai/anthropic";
import { sameDefect, severityRank, type DraftedFinding } from "@/lib/ai/multi-defect";
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
  Severity,
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
  // Check for existing findings (a photo can carry several, one per defect).
  // Reuse them unless the caller asked to regenerate (after a voice note
  // arrives and we want to fold it in). Regenerate only replaces drafts the
  // inspector hasn't touched — edited or approved findings are never
  // overwritten, and new drafts that repeat one of them are dropped.
  // ---------------------------------------------------------------------
  const { data: existingRows } = await supabase
    .from("findings")
    .select(FINDING_COLS + ", inspector_edited")
    .eq("photo_id", photo.id)
    .order("created_at");
  const existing = (existingRows ?? []) as unknown as ExistingFinding[];

  if (existing.length && !regenerate) {
    return NextResponse.json(reply(visionAnalysis, existing, sectionId, { reused: true }));
  }
  const kept = existing.filter((f) => f.inspector_edited || f.is_approved);
  const replaceable = existing.filter((f) => !f.inspector_edited && !f.is_approved);
  if (existing.length && regenerate && !replaceable.length) {
    // Inspector already touched every finding on this photo — don't blow them away.
    return NextResponse.json(
      reply(visionAnalysis, existing, sectionId, { reused: true, regenerate_skipped: true }),
    );
  }
  // Old drafts are only removed once their replacements are written below,
  // so a failed re-draft never leaves the photo with no findings.

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

  const photoSection: SectionType =
    sectionType ?? resolveSectionType(visionAnalysis.section) ?? "interior";
  let drafts: DraftedFinding[];
  try {
    drafts = await draftFindings({
      section: photoSection,
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

  if (!existing.length) {
    // Two requests can race for the same photo (capture reopened while a draft
    // was in flight). If the other one finished first, keep its drafts.
    const { data: raced } = await supabase
      .from("findings")
      .select(FINDING_COLS)
      .eq("photo_id", photo.id)
      .order("created_at");
    if (raced?.length) {
      return NextResponse.json(
        reply(visionAnalysis, raced as unknown as ExistingFinding[], sectionId, { reused: true }),
      );
    }
  }

  // Drop drafts that repeat a finding the inspector already edited/approved.
  const fresh = drafts.filter((d) => !kept.some((k) => sameDefect(k.title, d.title)));
  if (!fresh.length) {
    return NextResponse.json(reply(visionAnalysis, existing, sectionId, { reused: true }));
  }

  // Each defect goes in its own section. The photo's own section is used for
  // drafts in that system; any other section is found or created.
  const sectionIds = new Map<SectionType, string | null>();
  if (sectionId) sectionIds.set(photoSection, sectionId);
  async function sectionFor(type: SectionType): Promise<string | null> {
    if (!sectionIds.has(type)) {
      sectionIds.set(type, await findOrCreateSection(supabase, photo.inspection_id, type));
    }
    return sectionIds.get(type) ?? sectionId;
  }
  const rows = [];
  for (const d of fresh) {
    rows.push({
      inspection_id: photo.inspection_id,
      section_id: await sectionFor(d.section),
      photo_id: photo.id,
      severity: d.severity,
      title: d.title,
      description: d.description,
      recommended_action: d.recommended_action,
      ai_confidence: d.confidence,
      is_approved: false,
      inspector_edited: false,
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("findings")
    .insert(rows)
    .select(FINDING_COLS);

  if (insErr || !inserted?.length) {
    return NextResponse.json(
      {
        error: "could not save finding",
        message: "Couldn't save the drafted finding. Tap Try again.",
        detail: insErr?.message,
      },
      { status: 500 },
    );
  }

  if (replaceable.length) {
    await supabase
      .from("findings")
      .delete()
      .in(
        "id",
        replaceable.map((f) => f.id),
      );
  }
  if (dismissed) {
    await supabase
      .from("photos")
      .update({ ai_analysis: withDismissed(visionAnalysis, false) })
      .eq("id", photo.id);
  }

  return NextResponse.json(
    reply(visionAnalysis, [...(inserted as unknown as ExistingFinding[]), ...kept], sectionId, {
      reused: false,
    }),
  );
}

const FINDING_COLS =
  "id, section_id, severity, title, description, recommended_action, ai_confidence, is_approved";

type ExistingFinding = {
  id: string;
  section_id: string | null;
  severity: Severity;
  title: string;
  description: string;
  recommended_action: string | null;
  ai_confidence: number | null;
  is_approved: boolean;
  inspector_edited?: boolean;
};

// `finding` (the most severe) stays for older clients; `findings` is the full
// list when one photo showed several defects.
function reply(
  vision: VisionAnalysis | null,
  findings: ExistingFinding[],
  sectionId: string | null,
  extra: Record<string, unknown>,
) {
  const sorted = [...findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  return {
    vision_analysis: vision,
    finding: sorted[0] ?? null,
    findings: sorted,
    section_id: sectionId,
    ...extra,
  };
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
