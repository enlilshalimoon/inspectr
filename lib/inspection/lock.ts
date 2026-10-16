import type { SupabaseClient } from "@supabase/supabase-js";

// A finalized (or delivered) report is locked: the PDF and the client link
// must say the same thing, so nothing about it can change until the inspector
// re-opens it, which sends them back through finalize and a fresh PDF.

export const LOCKED_MESSAGE =
  "This report is finalized and locked. Re-open it on the Finalize tab to make changes.";

export function isLockedStatus(status: string | null | undefined): boolean {
  return status === "finalized" || status === "delivered";
}

// Status to set when (re-)finalizing. A report that already went to the client
// stays "delivered" so the inspection list and nudges don't treat it as unsent.
export function finalizedStatus(deliveredAt: string | null | undefined): "finalized" | "delivered" {
  return deliveredAt ? "delivered" : "finalized";
}

// The first-report feedback email goes out once per inspector, on the first
// inspection they ever finalize, never on a re-finalize after Re-open.
export function isFirstFinalize(previousFinalizedAt: string | null | undefined, finalizedCount: number): boolean {
  return !previousFinalizedAt && finalizedCount === 1;
}

// Returns LOCKED_MESSAGE if the inspection (looked up directly or through one
// of its findings or photos) is locked, "not found" text if RLS hides it, or
// null when edits are allowed.
export async function lockError(
  supabase: SupabaseClient,
  target: { inspectionId: string } | { findingId: string } | { photoId: string },
): Promise<string | null> {
  let inspectionId: string | null = null;
  if ("inspectionId" in target) {
    inspectionId = target.inspectionId;
  } else {
    const table = "findingId" in target ? "findings" : "photos";
    const id = "findingId" in target ? target.findingId : target.photoId;
    const { data } = await supabase.from(table).select("inspection_id").eq("id", id).maybeSingle();
    inspectionId = (data?.inspection_id as string | undefined) ?? null;
    if (!inspectionId) return "Not found.";
  }
  const { data: insp } = await supabase
    .from("inspections")
    .select("status")
    .eq("id", inspectionId)
    .maybeSingle();
  if (!insp) return "Inspection not found.";
  return isLockedStatus(insp.status as string) ? LOCKED_MESSAGE : null;
}
