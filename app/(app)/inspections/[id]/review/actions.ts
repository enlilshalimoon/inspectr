"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { renderInspectionPdf } from "@/lib/pdf/render";

// All actions enforce RLS via the user's session client (no service role).
// Each one revalidates the review page so server-rendered state stays in sync.

const SEVERITY = z.enum(["info", "monitor", "minor_repair", "major_repair", "safety_hazard"]);

const updateSchema = z.object({
  finding_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().min(1).max(4000).optional(),
  recommended_action: z.string().max(2000).optional().nullable(),
  severity: SEVERITY.optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateFinding(input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { inspector_edited: true };
  for (const k of ["title", "description", "recommended_action", "severity"] as const) {
    if (parsed.data[k] !== undefined) patch[k] = parsed.data[k];
  }

  const { error } = await supabase
    .from("findings")
    .update(patch)
    .eq("id", parsed.data.finding_id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/inspections/${parsed.data.inspection_id}/review`);
  return { ok: true };
}

const approveSchema = z.object({
  finding_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
  approved: z.boolean(),
});

export async function setFindingApproved(input: z.infer<typeof approveSchema>): Promise<ActionResult> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("findings")
    .update({ is_approved: parsed.data.approved })
    .eq("id", parsed.data.finding_id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/inspections/${parsed.data.inspection_id}/review`);
  return { ok: true };
}

const bulkApproveSchema = z.object({
  inspection_id: z.string().uuid(),
  section_id: z.string().uuid().nullable(),
});

export async function approveAllInSection(
  input: z.infer<typeof bulkApproveSchema>,
): Promise<ActionResult> {
  const parsed = bulkApproveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  let q = supabase
    .from("findings")
    .update({ is_approved: true })
    .eq("inspection_id", parsed.data.inspection_id);
  q = parsed.data.section_id ? q.eq("section_id", parsed.data.section_id) : q.is("section_id", null);
  const { error } = await q;

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/inspections/${parsed.data.inspection_id}/review`);
  return { ok: true };
}

const finalizeSchema = z.object({ inspection_id: z.string().uuid() });

export type FinalizeResult =
  | { ok: true; share_slug: string; pdf_path: string }
  | { ok: false; error: string };

export async function finalizeInspection(
  input: z.infer<typeof finalizeSchema>,
): Promise<FinalizeResult> {
  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const inspectionId = parsed.data.inspection_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Verify we own this inspection + check unapproved count
  const { data: insp, error: inspErr } = await supabase
    .from("inspections")
    .select("id, share_url_slug, status")
    .eq("id", inspectionId)
    .maybeSingle();
  if (inspErr || !insp) return { ok: false, error: "Inspection not found." };

  const { count: unapproved, error: countErr } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", inspectionId)
    .eq("is_approved", false);
  if (countErr) return { ok: false, error: countErr.message };
  if ((unapproved ?? 0) > 0) {
    return {
      ok: false,
      error: `${unapproved} finding${unapproved === 1 ? "" : "s"} still need approval before finalizing.`,
    };
  }

  // Mark finalized FIRST so the PDF picks up the timestamp
  const finalizedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("inspections")
    .update({ status: "finalized", finalized_at: finalizedAt })
    .eq("id", inspectionId);
  if (updErr) return { ok: false, error: updErr.message };

  // Render PDF
  let pdfBuf: Buffer;
  try {
    pdfBuf = await renderInspectionPdf(inspectionId, "session");
  } catch (err) {
    console.error("[finalize] pdf render failed:", err);
    return { ok: false, error: "PDF rendering failed." };
  }

  // Upload to private report-assets bucket. Path is scoped per RLS policy.
  const pdfPath = `${user.id}/${inspectionId}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("report-assets")
    .upload(pdfPath, pdfBuf, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });
  if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

  await supabase.from("inspections").update({ pdf_url: pdfPath }).eq("id", inspectionId);

  revalidatePath(`/inspections/${inspectionId}/review`);
  revalidatePath(`/inspections/${inspectionId}/finalize`);
  return { ok: true, share_slug: insp.share_url_slug as string, pdf_path: pdfPath };
}

const deleteSchema = z.object({
  finding_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
});

export async function deleteFinding(input: z.infer<typeof deleteSchema>): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase.from("findings").delete().eq("id", parsed.data.finding_id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/inspections/${parsed.data.inspection_id}/review`);
  return { ok: true };
}
