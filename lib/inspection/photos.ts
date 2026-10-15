// Small pure helpers shared by the capture page, the AI route and the reports.
// Kept free of Supabase/React imports so they're unit-testable (`npm test`).

import { STANDARD_SECTIONS } from "@/lib/supabase/sections";
import type { SectionType } from "@/lib/supabase/types";

const SECTION_TYPES = new Set<string>(STANDARD_SECTIONS.map((s) => s.type));

// The vision model's section guess, if it's one we know. Anything else (a typo,
// a made-up section) returns null so the photo stays where it is.
export function resolveSectionType(value: unknown): SectionType | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return SECTION_TYPES.has(v) ? (v as SectionType) : null;
}

export function sectionOrder(type: SectionType): number {
  return STANDARD_SECTIONS.find((s) => s.type === type)?.order ?? 999;
}

// When an inspector deletes a photo's finding, the photo stays (it's still
// evidence) but must not be re-drafted behind their back. The flag lives on
// photos.ai_analysis so no schema change is needed.
export const DISMISSED_KEY = "finding_dismissed";

export function isFindingDismissed(aiAnalysis: unknown): boolean {
  return (
    !!aiAnalysis &&
    typeof aiAnalysis === "object" &&
    (aiAnalysis as Record<string, unknown>)[DISMISSED_KEY] === true
  );
}

export function withDismissed(aiAnalysis: unknown, dismissed: boolean): Record<string, unknown> {
  const base =
    aiAnalysis && typeof aiAnalysis === "object" ? { ...(aiAnalysis as Record<string, unknown>) } : {};
  if (dismissed) base[DISMISSED_KEY] = true;
  else delete base[DISMISSED_KEY];
  return base;
}

// A logo path is only trusted if it sits in the inspector's own folder. The
// public report signs it with the service-role key, so an arbitrary path could
// otherwise expose another inspector's files.
export function isOwnStoragePath(path: string | null | undefined, userId: string): boolean {
  if (!path) return false;
  return path.startsWith(`${userId}/`) && !path.includes("..");
}
