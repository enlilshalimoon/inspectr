// Scoring for the /try real-photo accuracy eval (scripts/try-eval.ts,
// labels in db/try-eval/cases.json). Pure so it's unit-tested and the scorer
// can be checked without a model key.
//
// A run is "correct" when the section is one the label accepts, the result
// (defect / no_defect / unclear) is one the label accepts, and, for a defect,
// the finding names the labeled condition and no condition the photo doesn't
// show. A "confident wrong defect" is what the inspector complained about: a
// finding presented as a defect (severity above info) that the photo doesn't
// support.

import type { PhotoFindingResult } from "@/lib/ai/prompts";

export interface EvalLabel {
  id: string;
  photo: string;
  // "*" accepts any section (e.g. an unreadable photo).
  sections: string[] | "*";
  results: PhotoFindingResult[];
  // For a defect: every group needs at least one match (case-insensitive
  // substring) across the findings and the evidence.
  defect_keywords?: string[][];
  // A match in a defect title means it named a condition the photo doesn't show.
  forbidden_in_title?: string[];
  // When set, fewer findings than this is a miss (a two-defect photo).
  min_findings?: number;
  evidence: string;
}

export interface EvalFinding {
  result: PhotoFindingResult;
  section: string;
  severity: string;
  title: string;
  description: string;
  recommended_action?: string;
}

export interface EvalOutput {
  result: PhotoFindingResult;
  section: string;
  severity: string;
  title: string;
  description: string;
  evidence?: string;
  recommended_action?: string;
  findings?: EvalFinding[];
}

export interface EvalScore {
  correct: boolean;
  confidentWrongDefect: boolean;
  reasons: string[];
}

const has = (text: string, needle: string) => text.toLowerCase().includes(needle.toLowerCase());

function listedFindings(out: EvalOutput): EvalFinding[] {
  if (out.findings && out.findings.length) return out.findings;
  return [
    {
      result: out.result,
      section: out.section,
      severity: out.severity,
      title: out.title,
      description: out.description,
    },
  ];
}

function findingText(f: EvalFinding): string {
  return `${f.title} ${f.description}`;
}

// A confident defect is supported when its own text matches at least one
// keyword group. An extra invented defect (right lead finding, wrong second
// one) fails this even if the combined text still contains the real condition.
function supported(label: EvalLabel, f: EvalFinding): boolean {
  if (!label.defect_keywords?.length) return true;
  const text = findingText(f);
  return label.defect_keywords.some((group) => group.some((k) => has(text, k)));
}

export function scoreOutput(label: EvalLabel, out: EvalOutput): EvalScore {
  const findings = listedFindings(out);
  const reasons: string[] = [];
  const sectionOk = label.sections === "*" || findings.every((f) => label.sections.includes(f.section));
  if (!sectionOk) {
    const bad = findings
      .map((f) => f.section)
      .filter((section) => label.sections !== "*" && !label.sections.includes(section));
    reasons.push(`section ${bad.join("/")} not in ${(label.sections as string[]).join("/")}`);
  }

  const resultOk = label.results.includes(out.result);
  if (!resultOk) reasons.push(`result ${out.result} not in ${label.results.join("/")}`);

  const expectsDefect = label.results.includes("defect");
  const confident = findings.filter((f) => f.result === "defect" && f.severity !== "info");
  let defectWrong = false;

  if (confident.length && !expectsDefect) {
    defectWrong = true;
    reasons.push("returned a defect");
  }

  if (out.result === "defect" && expectsDefect) {
    const text = [out.evidence ?? "", ...findings.map(findingText)].join(" ");
    for (const group of label.defect_keywords ?? []) {
      if (!group.some((k) => has(text, k))) {
        defectWrong = true;
        reasons.push(`missing any of: ${group.join(", ")}`);
      }
    }
  }

  for (const f of confident) {
    const hit = (label.forbidden_in_title ?? []).find((k) => has(f.title, k));
    if (hit) {
      defectWrong = true;
      reasons.push(`title claims "${hit}"`);
    }
    if (expectsDefect && !supported(label, f)) {
      defectWrong = true;
      reasons.push(`finding not labeled: ${f.title}`);
    }
  }

  const countOk = !label.min_findings || findings.length >= label.min_findings;
  if (!countOk) reasons.push(`returned ${findings.length}, want at least ${label.min_findings}`);

  const confidentWrongDefect = confident.some((f) => {
    if (!expectsDefect) return true;
    if ((label.forbidden_in_title ?? []).some((k) => has(f.title, k))) return true;
    return !supported(label, f);
  });

  return {
    correct: sectionOk && resultOk && !defectWrong && countOk,
    confidentWrongDefect,
    reasons,
  };
}

export interface EvalSummary {
  n: number;
  correct: number;
  confidentWrongDefects: number;
  sectionCorrect: number;
  errors: number;
}

export function summarize(
  rows: { label: EvalLabel; out: EvalOutput | null; score: EvalScore | null }[],
): EvalSummary {
  return {
    n: rows.length,
    correct: rows.filter((r) => r.score?.correct).length,
    confidentWrongDefects: rows.filter((r) => r.score?.confidentWrongDefect).length,
    sectionCorrect: rows.filter((r) => {
      if (!r.out) return false;
      if (r.label.sections === "*") return true;
      const findings = r.out.findings?.length ? r.out.findings : [r.out];
      return findings.every((f) => r.label.sections.includes(f.section));
    }).length,
    errors: rows.filter((r) => !r.out).length,
  };
}

// Pass bar stated in the PR: >= 80% correct and zero confident wrong defects.
export function passes(s: EvalSummary): boolean {
  return s.n > 0 && s.correct / s.n >= 0.8 && s.confidentWrongDefects === 0;
}
