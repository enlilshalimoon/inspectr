// Run /try's photo -> finding step on local files, old pipeline vs new, with
// no database, rate limit or email. Needs ANTHROPIC_API_KEY in .env.local.
//
// Usage:
//   Labeled accuracy eval (see db/try-eval/README.md):
//     npx tsx -r dotenv/config scripts/try-eval.ts dotenv_config_path=.env.local --cases db/try-eval/cases.json
//   Ad-hoc, just print what each pipeline says:
//     npx tsx -r dotenv/config scripts/try-eval.ts dotenv_config_path=.env.local public/try-samples/*.jpg
//   ...add --new-only to skip the old two-stage pipeline (halves the cost)
//
// Pass photos already prepared the way the browser does (JPEG, <= 2048px long
// edge), e.g. `sips -Z 2048 -s format jpeg in.heic --out out.jpg` on a Mac.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeImageBytes, draftFindingsFromImage } from "../lib/ai/anthropic";
import { resolveSectionType } from "../lib/inspection/photos";
import {
  passes,
  scoreOutput,
  summarize,
  type EvalLabel,
  type EvalOutput,
  type EvalScore,
  type EvalSummary,
} from "../lib/try/eval-score";

// Frozen copy of the finding prompt that was live on /try at main d5e17f9.
// Haiku had already looked at the photo; this call is text only and must
// produce exactly one defect-style finding. The eval's OLD column is that
// behavior, so a prompt change on the capture path doesn't move the baseline.
const LEGACY_TRY_FINDING_PROMPT = `You are drafting findings for a residential home inspection report. A licensed inspector will review and approve everything you draft before it reaches the client.

You receive (1) a vision analysis of a photo and (2) the inspector's voice note transcript. Output exactly one finding as JSON.

Hard rules (non-negotiable):
1. Trust the inspector's voice note over the vision AI if they conflict. The inspector was there. If the voice note says something is fine or has been mitigated, severity is "info" regardless of what the vision AI flagged.
2. Never include dollar amounts, price ranges, or cost estimates. Strip them from inspector dictation. Inspectors are not licensed to estimate repair costs.
3. Never use the word "dangerous". Use "safety concern" or "safety hazard".
4. Never recommend a specific contractor or brand by name. Recommend a trade ("licensed electrician", "licensed plumber", "HVAC technician", "structural engineer", "qualified roofing contractor") plus an action ("evaluate and repair", "evaluate and replace", "secure", "monitor").
5. Do not diagnose latent or underlying causes. Use "indicates possible..." not "this is caused by...".
6. Be conservative on severity. Default to "monitor" or "info" if unclear. Reserve "safety_hazard" for immediate risk: missing GFCI in wet locations, exposed live conductors, unfilled panel knockouts, foundation movement with bowing, missing smoke detectors in sleeping areas, photo-eye safety reverse failure, improper baluster spacing, scalding TPR discharge.

Severity tiers:
- info: observation, no action needed
- monitor: keep an eye on it, may need attention later
- minor_repair: cosmetic or low-cost fix, not urgent
- major_repair: significant cost or complexity, recommend before closing
- safety_hazard: immediate safety concern, prioritize

Output JSON with these exact keys:
{
  "severity": "info" | "monitor" | "minor_repair" | "major_repair" | "safety_hazard",
  "title": string (5-10 words, professional defect name, no marketing language),
  "description": string (2-4 sentences, observation -> why it matters -> context. Reference the photo. No alarmist language.),
  "recommended_action": string (1-2 sentences. "Recommend [trade] [action]." or "Monitor for changes." Empty string OK for minor cosmetic items.),
  "confidence": number (0-1, internal use only — your honest confidence)
}

Respond with ONLY the JSON object. No prose before or after.`;

const args = process.argv.slice(2).filter((a) => !a.startsWith("dotenv_config"));
const newOnly = args.includes("--new-only");
const caseFiles = args.flatMap((a, i) => (args[i - 1] === "--cases" ? [a] : []));
const files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--cases");

async function draftLegacyTryFinding(section: string, vision: unknown): Promise<{
  severity: string;
  title: string;
  description: string;
  recommended_action: string;
}> {
  const reply = await new Anthropic().messages.create({
    model: process.env.ANTHROPIC_DRAFTING_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 800,
    system: LEGACY_TRY_FINDING_PROMPT,
    messages: [
      {
        role: "user",
        content: `Section: ${section}\n\nVision analysis:\n${JSON.stringify(vision, null, 2)}\n\nInspector voice note transcript: (empty)`,
      },
    ],
  });
  const text = reply.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(text) as {
    severity: string;
    title: string;
    description: string;
    recommended_action: string;
  };
}

async function runOld(buf: Buffer): Promise<EvalOutput> {
  const vision = await analyzeImageBytes(buf);
  const section = resolveSectionType(vision.section) ?? "interior";
  const old = await draftLegacyTryFinding(section, vision);
  // The live pipeline always writes a finding; only an "info" one reads as no defect.
  return {
    result: old.severity === "info" ? "no_defect" : "defect",
    section,
    severity: old.severity,
    title: old.title,
    description: old.description,
    recommended_action: old.recommended_action,
  };
}

async function runNew(buf: Buffer): Promise<EvalOutput> {
  const parsed = await draftFindingsFromImage(buf);
  const findings = parsed.findings.map((f) => ({
    result: parsed.result,
    section: resolveSectionType(f.section) ?? "interior",
    severity: f.severity,
    title: f.title,
    description: f.description,
    recommended_action: f.recommended_action,
  }));
  const lead = findings[0];
  return {
    result: parsed.result,
    section: lead.section,
    severity: lead.severity,
    title: lead.title,
    description: lead.description,
    evidence: parsed.evidence,
    recommended_action: lead.recommended_action,
    findings,
  };
}

type Row = { label: EvalLabel; out: EvalOutput | null; score: EvalScore | null; error?: string };

async function scored(label: EvalLabel, buf: Buffer, run: (b: Buffer) => Promise<EvalOutput>): Promise<Row> {
  try {
    const out = await run(buf);
    return { label, out, score: scoreOutput(label, out) };
  } catch (err) {
    return { label, out: null, score: null, error: err instanceof Error ? err.message : String(err) };
  }
}

const cell = (s: string) => s.replace(/\|/g, "/").replace(/\s+/g, " ");

function rowLine(r: Row): string {
  if (!r.out) return `ERROR ${r.error}`;
  const mark = r.score?.correct ? "OK" : r.score?.confidentWrongDefect ? "WRONG-DEFECT" : "miss";
  const why = r.score?.reasons.length ? ` (${r.score.reasons.join("; ")})` : "";
  const findings = r.out.findings?.length ? r.out.findings : [r.out];
  const titles = findings.map((f) => f.title).join(" || ");
  return `${mark} [${r.out.section}] ${r.out.result} ${r.out.severity} x${findings.length}: ${titles}${why}`;
}

function detailBlock(name: string, r: Row): string {
  if (!r.out) return `### ${name}\n\nERROR ${r.error}\n`;
  const findings = r.out.findings?.length ? r.out.findings : [r.out];
  const body = findings
    .map(
      (f, i) =>
        `${i + 1}. [${f.section}] ${f.severity}: ${f.title}\n\n${f.description}\n\n${"recommended_action" in f ? (f.recommended_action ?? "") : ""}`,
    )
    .join("\n\n");
  const evidence = r.out.evidence ? `\n\nEvidence: ${r.out.evidence}` : "";
  return `### ${name}\n\n${body}${evidence}\n`;
}

function summaryLine(name: string, s: EvalSummary): string {
  const pct = s.n ? Math.round((100 * s.correct) / s.n) : 0;
  return `${name}: ${s.correct}/${s.n} correct (${pct}%), ${s.confidentWrongDefects} confident wrong defects, section right ${s.sectionCorrect}/${s.n}, errors ${s.errors} -> ${passes(s) ? "PASS" : "FAIL"}`;
}

async function evalCases() {
  const labels: EvalLabel[] = [];
  for (const f of caseFiles) labels.push(...(JSON.parse(await readFile(f, "utf8")) as EvalLabel[]));

  const oldRows: Row[] = [];
  const newRows: Row[] = [];
  for (const label of labels) {
    const buf = await readFile(label.photo);
    console.log(`\n=== ${label.id} (${basename(label.photo)})\n    expect: ${label.results.join("/")} | ${label.evidence}`);
    if (!newOnly) {
      const r = await scored(label, buf, runOld);
      oldRows.push(r);
      console.log(`    OLD ${rowLine(r)}`);
    }
    const r = await scored(label, buf, runNew);
    newRows.push(r);
    console.log(`    NEW ${rowLine(r)}`);
  }

  const oldSum = newOnly ? null : summarize(oldRows);
  const newSum = summarize(newRows);
  console.log("");
  if (oldSum) console.log(summaryLine("OLD", oldSum));
  console.log(summaryLine("NEW", newSum));

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const md = [
    `# /try eval ${new Date().toISOString()}`,
    "",
    "OLD is the live /go pipeline at main d5e17f9: Haiku sees the photo, Sonnet writes exactly one finding from that text and does not see the photo.",
    "NEW is one call that sees the photo and may return several drafts, or no_defect, or unclear.",
    "Troy Vogt's five photos are not in this set. /try does not store photos.",
    "",
    `Cases: ${caseFiles.join(", ")}`,
    "",
    ...(oldSum ? [`- ${summaryLine("OLD", oldSum)}`] : []),
    `- ${summaryLine("NEW", newSum)}`,
    "",
    "| Case | Expected | OLD | NEW |",
    "| --- | --- | --- | --- |",
    ...newRows.map(
      (r, i) =>
        `| ${r.label.id} | ${r.label.results.join("/")} | ${newOnly ? "-" : cell(rowLine(oldRows[i]))} | ${cell(rowLine(r))} |`,
    ),
    "",
    ...newRows.flatMap((r, i) => [
      `## ${r.label.id}`,
      "",
      r.label.evidence,
      "",
      ...(newOnly ? [] : [detailBlock("OLD", oldRows[i]), ""]),
      detailBlock("NEW", r),
      "",
    ]),
  ].join("\n");
  const out = join("db/try-eval/results", `${stamp}.md`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, md);
  await writeFile(
    join("db/try-eval/results", `${stamp}.json`),
    JSON.stringify({ old: newOnly ? null : oldRows, new: newRows, oldSum, newSum }, null, 2),
  );
  console.log(`Wrote ${out}`);

  if (!passes(newSum)) process.exitCode = 1;
}

async function printFiles() {
  for (const path of files) {
    const buf = await readFile(path);
    console.log(`\n=== ${basename(path)} (${buf.length} bytes)`);

    if (!newOnly) {
      try {
        const old = await runOld(buf);
        console.log("OLD", JSON.stringify(old, null, 2));
      } catch (err) {
        console.log("OLD failed:", err instanceof Error ? err.message : err);
      }
    }

    try {
      const f = await runNew(buf);
      console.log("NEW", JSON.stringify(f, null, 2));
    } catch (err) {
      console.log("NEW failed:", err instanceof Error ? err.message : err);
    }
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("eval not run: no ANTHROPIC_API_KEY (add it to .env.local)");
    process.exit(2);
  }
  if (caseFiles.length) return evalCases();
  if (!files.length) {
    console.error("Pass --cases <cases.json> or one or more photo paths.");
    process.exit(1);
  }
  return printFiles();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
