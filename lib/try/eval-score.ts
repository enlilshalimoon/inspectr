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
  // substring) in title + description + evidence.
  defect_keywords?: string[][];
  // A match in the title means it named a condition the photo doesn't show.
  forbidden_in_title?: string[];
  evidence: string;
}

export interface EvalOutput {
  result: PhotoFindingResult;
  section: string;
  severity: string;
  title: string;
  description: string;
  evidence?: string;
}

export interface EvalScore {
  correct: boolean;
  confidentWrongDefect: boolean;
  reasons: string[];
}

const has = (text: string, needle: string) => text.toLowerCase().includes(needle.toLowerCase());

export function scoreOutput(label: EvalLabel, out: EvalOutput): EvalScore {
  const reasons: string[] = [];
  const sectionOk = label.sections === "*" || label.sections.includes(out.section);
  if (!sectionOk) reasons.push(`section ${out.section} not in ${(label.sections as string[]).join("/")}`);

  const resultOk = label.results.includes(out.result);
  if (!resultOk) reasons.push(`result ${out.result} not in ${label.results.join("/")}`);

  let defectWrong = false;
  if (out.result === "defect") {
    if (!label.results.includes("defect")) defectWrong = true;
    const text = [out.title, out.description, out.evidence ?? ""].join(" ");
    for (const group of label.defect_keywords ?? []) {
      if (!group.some((k) => has(text, k))) {
        defectWrong = true;
        reasons.push(`missing any of: ${group.join(", ")}`);
      }
    }
    const hit = (label.forbidden_in_title ?? []).find((k) => has(out.title, k));
    if (hit) {
      defectWrong = true;
      reasons.push(`title claims "${hit}"`);
    }
  }

  return {
    correct: sectionOk && resultOk && !defectWrong,
    confidentWrongDefect: out.result === "defect" && out.severity !== "info" && defectWrong,
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
    sectionCorrect: rows.filter((r) => r.out && (r.label.sections === "*" || r.label.sections.includes(r.out.section)))
      .length,
    errors: rows.filter((r) => !r.out).length,
  };
}

// Pass bar stated in the PR: >= 80% correct and zero confident wrong defects.
export function passes(s: EvalSummary): boolean {
  return s.n > 0 && s.correct / s.n >= 0.8 && s.confidentWrongDefects === 0;
}
