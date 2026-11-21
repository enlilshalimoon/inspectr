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
import { analyzeImageBytes, draftFinding, draftFindingFromImage } from "../lib/ai/anthropic";
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

const args = process.argv.slice(2).filter((a) => !a.startsWith("dotenv_config"));
const newOnly = args.includes("--new-only");
const caseFiles = args.flatMap((a, i) => (args[i - 1] === "--cases" ? [a] : []));
const files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--cases");

async function runOld(buf: Buffer): Promise<EvalOutput> {
  const vision = await analyzeImageBytes(buf);
  const section = resolveSectionType(vision.section) ?? "interior";
  const old = await draftFinding({ section, vision_analysis: vision, transcript: "" });
  // The old pipeline always writes a finding; only an "info" one reads as no defect.
  return {
    result: old.severity === "info" ? "no_defect" : "defect",
    section,
    severity: old.severity,
    title: old.title,
    description: old.description,
  };
}

async function runNew(buf: Buffer): Promise<EvalOutput> {
  const f = await draftFindingFromImage(buf);
  return {
    result: f.result,
    section: resolveSectionType(f.section) ?? "interior",
    severity: f.severity,
    title: f.title,
    description: f.description,
    evidence: f.evidence,
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
  return `${mark} [${r.out.section}] ${r.out.result} ${r.out.severity}: ${r.out.title}${why}`;
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

  const md = [
    `# /try eval ${new Date().toISOString()}`,
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
  ].join("\n");
  const out = join("db/try-eval/results", `${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, md);
  console.log(`Wrote ${out}`);

  if (!passes(newSum)) process.exitCode = 1;
}

async function printFiles() {
  for (const path of files) {
    const buf = await readFile(path);
    console.log(`\n=== ${basename(path)} (${buf.length} bytes)`);

    if (!newOnly) {
      try {
        const vision = await analyzeImageBytes(buf);
        const section = resolveSectionType(vision.section) ?? "interior";
        const old = await draftFinding({ section, vision_analysis: vision, transcript: "" });
        console.log("OLD vision:", JSON.stringify(vision));
        console.log(`OLD [${section}] ${old.severity}: ${old.title}\n    ${old.description}\n    ${old.recommended_action}`);
      } catch (err) {
        console.log("OLD failed:", err instanceof Error ? err.message : err);
      }
    }

    try {
      const f = await draftFindingFromImage(buf);
      const section = resolveSectionType(f.section) ?? "interior";
      console.log(`NEW [${section}] ${f.result} ${f.severity}: ${f.title}\n    evidence: ${f.evidence}\n    ${f.description}\n    ${f.recommended_action}`);
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
