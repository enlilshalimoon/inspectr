// Per-section systems inventory: was each SOP system inspected, not
// inspected (and why), or not present? Most licensed states require this in
// the report (FL §468.8323, OH 4764.01, VA 18VAC15-40-130, OR 812-008), and
// Oregon rejects deficiency-only reports outright.
//
// Storage: inspection_sections.system_status (jsonb, migration 0004). Until
// the founder runs that SQL, the column doesn't exist, so writes fall back to
// inspection_sections.inspector_notes (unused elsewhere) as a prefixed JSON
// string. Reads accept either; the migration moves fallback values over.

import { STANDARD_SECTIONS } from "@/lib/supabase/sections";
import type { SectionType } from "@/lib/supabase/types";

export const SYSTEM_STATUSES = ["inspected", "not_inspected", "not_present"] as const;
export type SystemStatus = (typeof SYSTEM_STATUSES)[number];

export const SYSTEM_STATUS_LABEL: Record<SystemStatus, string> = {
  inspected: "Inspected",
  not_inspected: "Not inspected",
  not_present: "Not present",
};

export interface SectionStatus {
  status: SystemStatus;
  // Why it wasn't inspected (inaccessible, utilities off, stored items...).
  reason: string | null;
  // Materials / type / method of observation, e.g. "Asphalt shingle; viewed from ladder at eaves".
  description: string | null;
}

export const NOTES_FALLBACK_PREFIX = "lookover:system_status:";

function coerce(value: unknown): SectionStatus | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!SYSTEM_STATUSES.includes(v.status as SystemStatus)) return null;
  const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : null);
  return { status: v.status as SystemStatus, reason: str(v.reason), description: str(v.description) };
}

// Accepts a raw inspection_sections row (select "*"), with or without the
// system_status column.
export function readSectionStatus(row: {
  system_status?: unknown;
  inspector_notes?: string | null;
}): SectionStatus | null {
  const fromColumn = coerce(row.system_status);
  if (fromColumn) return fromColumn;
  const notes = row.inspector_notes;
  if (typeof notes === "string" && notes.startsWith(NOTES_FALLBACK_PREFIX)) {
    try {
      return coerce(JSON.parse(notes.slice(NOTES_FALLBACK_PREFIX.length)));
    } catch {
      return null;
    }
  }
  return null;
}

export function encodeNotesFallback(s: SectionStatus): string {
  return NOTES_FALLBACK_PREFIX + JSON.stringify(s);
}

// PostgREST reports an unknown column as PGRST204 ("Could not find the 'x'
// column ... in the schema cache"); Postgres itself uses 42703.
export function isMissingColumnError(
  err: { code?: string; message?: string } | null | undefined,
  column: string,
): boolean {
  if (!err) return false;
  if (err.code === "PGRST204" || err.code === "42703") return true;
  return (err.message ?? "").includes(column) && /column/i.test(err.message ?? "");
}

// A "Not inspected" status without a reason doesn't meet the rule, so it
// counts as incomplete.
export function isStatusComplete(s: SectionStatus | null): boolean {
  if (!s) return false;
  if (s.status === "not_inspected") return !!s.reason;
  return true;
}

// Sections the finalize step should warn about: every required standard
// section, plus any optional section that has a row (it was used), whose
// status is missing or incomplete. Returned in report order.
export function sectionsNeedingStatus(
  rows: { section_type: string; system_status?: unknown; inspector_notes?: string | null }[],
): SectionType[] {
  const byType = new Map(rows.map((r) => [r.section_type, r]));
  return STANDARD_SECTIONS.filter((def) => def.required || byType.has(def.type))
    .filter((def) => {
      const row = byType.get(def.type);
      return !isStatusComplete(row ? readSectionStatus(row) : null);
    })
    .map((def) => def.type);
}
