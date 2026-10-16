// Shared compliance content for the PDF (lib/pdf/report.tsx) and the client
// web report (app/(client)/report/[slug]/page.tsx), so both say the same thing.

import type { Severity } from "@/lib/supabase/types";
import { labelForSection } from "@/lib/supabase/sections";
import { SYSTEM_STATUS_LABEL, type SectionStatus } from "@/lib/inspection/system-status";
import {
  NC_SUMMARY_SEVERITIES,
  STANDARD_EXCLUSIONS,
  STANDARD_LIMITATIONS,
  STATE_NAMES,
  WI_SUMMARY_LABEL,
  defaultSop,
  normState,
  statePacks,
  type StatePack,
} from "./state-rules";

export interface ComplianceInput {
  licenseState: string | null;
  propertyState: string | null;
  sopStandard: string | null;
  yearBuilt: number | null;
  sections: { section_type: string; status: SectionStatus | null }[];
}

export interface Compliance {
  sop: string;
  scopeStatement: string;
  // Systems not inspected, with reasons (limited-scope notice; OH, MD, VA...).
  notInspected: { label: string; reason: string | null }[];
  limitations: readonly string[];
  packs: StatePack[];
  // KY: itemized exclusions (systems not inspected + standard exclusions).
  exclusions: string[] | null;
  ncSummary: boolean;
  wiSummary: boolean;
  flagUnreasonableRisk: boolean;
}

export function buildCompliance(input: ComplianceInput): Compliance {
  const sop = input.sopStandard?.trim() || defaultSop(input.licenseState);
  const packs = statePacks([input.licenseState, input.propertyState], {
    yearBuilt: input.yearBuilt,
  });
  const notInspected = input.sections
    .filter((s) => s.status?.status === "not_inspected")
    .map((s) => ({ label: labelForSection(s.section_type as never), reason: s.status?.reason ?? null }));

  const scopeStatement =
    `This inspection was performed in accordance with ${sop}. ` +
    "The systems inventory lists every system covered and whether it was inspected, not inspected, or not present. " +
    (notInspected.length
      ? "This was a limited inspection: the systems marked Not inspected were outside its scope, for the reasons given."
      : "All systems present at the property were inspected, subject to the limitations below.");

  const listExclusions = packs.some((p) => p.listExclusions);
  return {
    sop,
    scopeStatement,
    notInspected,
    limitations: STANDARD_LIMITATIONS,
    packs,
    exclusions: listExclusions
      ? [
          ...notInspected.map((n) => `${n.label}: not inspected${n.reason ? ` (${n.reason})` : ""}`),
          ...STANDARD_EXCLUSIONS,
        ]
      : null,
    ncSummary: packs.some((p) => p.summary === "nc"),
    wiSummary: packs.some((p) => p.summary === "wi"),
    flagUnreasonableRisk: packs.some((p) => p.flagUnreasonableRisk),
  };
}

export interface SummaryFinding {
  section_type: string;
  severity: Severity;
  title: string;
  recommended_action: string | null;
}

export function ncSummaryItems<T extends SummaryFinding>(findings: T[]): T[] {
  return findings.filter((f) => NC_SUMMARY_SEVERITIES.includes(f.severity));
}

export function wiSummaryGroups<T extends SummaryFinding>(
  findings: T[],
): { defects: T[]; other: (T & { label: string })[] } {
  const defects = findings.filter((f) => WI_SUMMARY_LABEL[f.severity] === "Defect");
  const other = findings
    .filter((f) => WI_SUMMARY_LABEL[f.severity] !== "Defect")
    .map((f) => ({ ...f, label: WI_SUMMARY_LABEL[f.severity] }));
  return { defects, other };
}

// Every finding needs a repair / monitor / further-evaluation recommendation
// (FL 61-30.801, OH 4764.01(D)). Used when the inspector left it blank.
export const DEFAULT_RECOMMENDATION: Record<Severity, string | null> = {
  safety_hazard: "Correction by a qualified professional is recommended as soon as possible.",
  major_repair: "Further evaluation and repair by a qualified contractor is recommended.",
  minor_repair: "Repair by a qualified contractor or handyman is recommended.",
  monitor: "Monitor this condition and have it evaluated if it changes.",
  info: null,
};

export function recommendationFor(f: { severity: Severity; recommended_action: string | null }): string | null {
  return f.recommended_action?.trim() || DEFAULT_RECOMMENDATION[f.severity];
}

export function statusLabel(s: SectionStatus | null): string {
  return s ? SYSTEM_STATUS_LABEL[s.status] : "Not recorded";
}

export function licenseLine(i: {
  license_number: string | null;
  license_state: string | null;
  license_expires?: string | null;
}): string | null {
  if (!i.license_number) return null;
  const st = normState(i.license_state);
  return [
    `License ${i.license_number}${st ? ` (${STATE_NAMES[st] ?? st})` : ""}`,
    i.license_expires ? `expires ${formatDateOnly(i.license_expires)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

// "2027-03-31" → "March 31, 2027" without the UTC-midnight off-by-one.
export function formatDateOnly(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
