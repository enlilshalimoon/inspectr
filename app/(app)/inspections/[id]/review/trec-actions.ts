"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { lockError } from "@/lib/inspection/lock";
import { canRemoveItem, containsCostEstimate, hasAnyBox, type ItemEntry } from "@/lib/trec/form";
import { REI76_ITEM_IDS, trecItem } from "@/lib/trec/rei76";
import type { ActionResult } from "./actions";

// Edits to inspections.report_form for the Texas REI 7-6 report. Every write
// is one key, applied atomically by patch_report_form() (migration 0005) under
// the inspector's own session, so RLS decides which inspection can change.

const COST_ERROR =
  "Remove the dollar amount or cost estimate. Lookover reports never include repair costs.";

async function patch(inspectionId: string, path: string[], value: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const locked = await lockError(supabase, { inspectionId });
  if (locked) return { ok: false, error: locked };

  const { error } = await supabase.rpc("patch_report_form", {
    p_inspection_id: inspectionId,
    p_path: path,
    p_value: value ?? null,
  });
  if (error) {
    console.error("[trec] patch_report_form failed:", error);
    return {
      ok: false,
      error: /patch_report_form|report_form/.test(error.message)
        ? "TREC form storage isn't set up yet (database migration 0005)."
        : error.message,
    };
  }
  revalidatePath(`/inspections/${inspectionId}/review`);
  revalidatePath(`/inspections/${inspectionId}/finalize`);
  return { ok: true };
}

const itemSchema = z.object({
  inspection_id: z.string().uuid(),
  item_id: z.string().refine((id) => REI76_ITEM_IDS.has(id), "Unknown form item."),
  entry: z.object({
    i: z.boolean().optional(),
    ni: z.boolean().optional(),
    np: z.boolean().optional(),
    d: z.boolean().optional(),
    comment: z.string().max(4000).optional(),
    fields: z.record(z.string(), z.string().max(300)).optional(),
    removed: z.boolean().optional(),
  }),
});

export async function saveTrecItem(input: z.infer<typeof itemSchema>): Promise<ActionResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { inspection_id, item_id, entry } = parsed.data;
  const item = trecItem(item_id)!;

  if (entry.removed && !canRemoveItem(item)) {
    return { ok: false, error: "Only “Other” and optional-system items can be left off the form." };
  }
  const fields: Record<string, string> = {};
  for (const [label, value] of Object.entries(entry.fields ?? {})) {
    if (!item.fields.includes(label)) return { ok: false, error: `“${label}” isn't a field of this item.` };
    if (value.trim()) fields[label] = value.trim();
  }
  if (containsCostEstimate(entry.comment) || Object.values(fields).some(containsCostEstimate)) {
    return { ok: false, error: COST_ERROR };
  }

  const clean: ItemEntry = {};
  for (const k of ["i", "ni", "np", "d"] as const) if (entry[k]) clean[k] = true;
  if (entry.comment?.trim()) clean.comment = entry.comment.trim();
  if (Object.keys(fields).length) clean.fields = fields;
  if (entry.removed) clean.removed = true;

  // An empty entry goes back to the draft (derived from findings).
  const empty = !hasAnyBox(clean) && !clean.comment && !clean.fields && !clean.removed;
  return patch(inspection_id, ["items", item_id], empty ? null : clean);
}

const assignSchema = z.object({
  inspection_id: z.string().uuid(),
  finding_id: z.string().uuid(),
  // null = back to the automatic suggestion
  item_id: z
    .string()
    .refine((id) => REI76_ITEM_IDS.has(id), "Unknown form item.")
    .nullable(),
});

export async function assignFindingToItem(input: z.infer<typeof assignSchema>): Promise<ActionResult> {
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { inspection_id, finding_id, item_id } = parsed.data;
  return patch(inspection_id, ["finding_items", finding_id], item_id);
}

const detailSchema = z.discriminatedUnion("key", [
  z.object({ inspection_id: z.string().uuid(), key: z.literal("use_trec"), value: z.boolean() }),
  z.object({ inspection_id: z.string().uuid(), key: z.literal("additional_info"), value: z.string().max(8000) }),
  z.object({ inspection_id: z.string().uuid(), key: z.literal("sponsor_name"), value: z.string().max(200) }),
  z.object({ inspection_id: z.string().uuid(), key: z.literal("sponsor_license"), value: z.string().max(50) }),
]);

export async function saveTrecDetail(input: z.infer<typeof detailSchema>): Promise<ActionResult> {
  const parsed = detailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { inspection_id, key, value } = parsed.data;
  if (typeof value === "string") {
    if (key === "additional_info" && containsCostEstimate(value)) return { ok: false, error: COST_ERROR };
    return patch(inspection_id, [key], value.trim() ? value.trim() : null);
  }
  // use_trec: only store the opt-out; true is the default for TX.
  return patch(inspection_id, [key], value ? null : false);
}
