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
// Auth: relies on the user's Supabase session cookie + RLS. The route never
// touches another inspector's photos.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzePhoto, draftFinding } from "@/lib/ai/anthropic";
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

  // ---------------------------------------------------------------------
  // Stage 1: vision analysis (or reuse if already cached on the row)
  // ---------------------------------------------------------------------
  let visionAnalysis: VisionAnalysis | null = (photo.ai_analysis ??
    null) as VisionAnalysis | null;

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
      return NextResponse.json(
        { error: "vision analysis failed", detail: msg(err) },
        { status: 502 },
      );
    }

    await supabase.from("photos").update({ ai_analysis: visionAnalysis }).eq("id", photo.id);
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
      reused: true,
    });
  }
  if (existing && regenerate) {
    if (existing.inspector_edited || existing.is_approved) {
      // Inspector already touched this one — don't blow it away.
      return NextResponse.json({
        vision_analysis: visionAnalysis,
        finding: existing,
        reused: true,
        regenerate_skipped: true,
      });
    }
    await supabase.from("findings").delete().eq("id", existing.id);
  }

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
      section: sectionType ?? visionAnalysis.section,
      vision_analysis: visionAnalysis,
      transcript,
      property_context,
    });
  } catch (err) {
    console.error("[draft] failed:", err);
    return NextResponse.json(
      { error: "finding draft failed", detail: msg(err) },
      { status: 502 },
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("findings")
    .insert({
      inspection_id: photo.inspection_id,
      section_id: photo.section_id,
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
      { error: "could not save finding", detail: insErr?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    vision_analysis: visionAnalysis,
    finding: inserted,
    reused: false,
  });
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
