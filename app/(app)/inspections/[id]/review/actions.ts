"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
