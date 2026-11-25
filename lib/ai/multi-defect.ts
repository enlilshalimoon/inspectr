// One photo can show more than one defect (a water heater with a missing TPR
// discharge pipe AND a corroded gas connector). The drafting model returns a
// list; these pure helpers turn that raw list into clean, deduped drafts and
// back the inspector's merge / split tools on the review page.
//
// Kept free of Supabase/React/SDK imports so they're unit-testable (`npm test`).

import { resolveSectionType } from "@/lib/inspection/photos";
import type { SectionType, Severity } from "@/lib/supabase/types";

// More than this from a single photo is almost always the model listing the
// same thing several ways. The inspector can still split by hand.
export const MAX_FINDINGS_PER_PHOTO = 4;

const SEVERITY_RANK: Severity[] = ["info", "monitor", "minor_repair", "major_repair", "safety_hazard"];
const SEVERITIES = new Set<string>(SEVERITY_RANK);

export type DraftedFinding = {
  section: SectionType;
  severity: Severity;
  title: string;
  description: string;
  recommended_action: string;
  confidence: number;
};

export function severityRank(s: Severity): number {
  return SEVERITY_RANK.indexOf(s);
}

export function higherSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b;
}

// Accepts what the model returned: { findings: [...] } (current prompt), a bare
// array, or a single finding object (older prompt / benchmark stub). Drops
// entries without a title or description, clamps the rest, files each one into
// its own section (falling back to the photo's), dedupes, and caps the count.
export function normalizeDrafts(raw: unknown, fallbackSection: SectionType): DraftedFinding[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { findings?: unknown }).findings)
      ? (raw as { findings: unknown[] }).findings
      : raw && typeof raw === "object"
        ? [raw]
        : [];

  const clean: DraftedFinding[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const description = typeof r.description === "string" ? r.description.trim() : "";
    if (!title || !description) continue;
    const severity = typeof r.severity === "string" && SEVERITIES.has(r.severity) ? (r.severity as Severity) : "monitor";
    const conf = typeof r.confidence === "number" && Number.isFinite(r.confidence) ? r.confidence : 0.5;
    clean.push({
      section: resolveSectionType(r.section) ?? fallbackSection,
      severity,
      title,
      description,
      recommended_action: typeof r.recommended_action === "string" ? r.recommended_action.trim() : "",
      confidence: Math.min(1, Math.max(0, conf)),
    });
  }
  return dedupeDrafts(clean).slice(0, MAX_FINDINGS_PER_PHOTO);
}

// Two drafts describing the same defect collapse into one, keeping the first
// one's wording and the higher of the two severities (conservative toward the
// client: a duplicate never hides a worse rating).
export function dedupeDrafts(drafts: DraftedFinding[]): DraftedFinding[] {
  const out: DraftedFinding[] = [];
  for (const d of drafts) {
    const dup = out.findIndex((o) => sameDefect(o.title, d.title));
    if (dup === -1) {
      out.push(d);
    } else {
      out[dup] = { ...out[dup], severity: higherSeverity(out[dup].severity, d.severity) };
    }
  }
  return out;
}

// Words that say nothing about which defect it is.
const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "at", "in", "on", "to", "for", "with", "near", "by",
  "is", "are", "was", "be", "not", "no", "observed", "noted", "visible", "possible", "area",
]);

function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
      .filter((w) => w && !STOP.has(w)),
  );
}

// True when two titles name the same defect: identical after normalising, or
// sharing most of their meaningful words (Jaccard > 0.6).
export function sameDefect(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return a.trim().toLowerCase() === b.trim().toLowerCase();
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared) > 0.6;
}

// ---------------------------------------------------------------------------
// Inspector tools on the review page
// ---------------------------------------------------------------------------

type MergeText = {
  severity: Severity;
  title: string;
  description: string;
  recommended_action: string | null;
};

function joinDistinct(a: string | null | undefined, b: string | null | undefined, sep: string): string {
  const x = (a ?? "").trim();
  const y = (b ?? "").trim();
  if (!y || x.includes(y)) return x;
  if (!x || y.includes(x)) return y;
  return `${x}${sep}${y}`;
}

// Folds `other` into `keep`: keep's title, both descriptions and actions
// (without repeating text already there), and the higher severity.
export function mergeFindingText(keep: MergeText, other: MergeText): MergeText {
  const action = joinDistinct(keep.recommended_action, other.recommended_action, " ");
  return {
    severity: higherSeverity(keep.severity, other.severity),
    title: keep.title,
    description: joinDistinct(keep.description, other.description, "\n\n"),
    recommended_action: action || null,
  };
}

// "Split" adds a second finding on the same photo with this text. It can't be
// approved until the inspector writes the real finding over it.
export const SPLIT_TITLE = "Another issue in this photo";
export const SPLIT_DESCRIPTION = "Describe the other issue visible in this photo.";

export function isSplitPlaceholder(f: { title?: string | null; description?: string | null }): boolean {
  return f.title?.trim() === SPLIT_TITLE || f.description?.trim() === SPLIT_DESCRIPTION;
}
