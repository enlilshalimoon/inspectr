// Run the AI benchmark against db/benchmark/cases/*.json
//
// Usage:
//   npm run benchmark                       # all cases, real AI
//   npm run benchmark -- --section=electrical
//   npm run benchmark -- --mode=stub        # no AI calls, returns expected (for testing the runner)
//   npm run benchmark -- --model=claude-sonnet-4-6
//
// Writes a markdown report to db/benchmark/results/<timestamp>.md and prints a summary.

import "dotenv/config";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  FINDING_SYSTEM_PROMPT,
  buildFindingUserPrompt,
  type FindingPromptInput,
  type FindingPromptOutput,
} from "../lib/ai/prompts";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    return m ? [[m[1], m[2]]] : [];
  }),
) as { section?: string; mode?: "ai" | "stub"; model?: string };

const MODE: "ai" | "stub" = args.mode === "stub" ? "stub" : "ai";
const MODEL =
  args.model ?? process.env.ANTHROPIC_DRAFTING_MODEL ?? "claude-sonnet-4-6";

// ---------------------------------------------------------------------------
// Types matching the JSON files in db/benchmark/cases/
// ---------------------------------------------------------------------------
type BenchmarkCase = {
  id: string;
  section: string;
  source: string;
  input: FindingPromptInput;
  expected: {
    severity: string;
    title_must_include: string[];
    description_must_include: string[];
    description_must_not_include: string[];
    action_must_include: string[];
    rationale: string;
  };
};

type CaseResult = {
  id: string;
  section: string;
  output: FindingPromptOutput | null;
  error?: string;
  scores: {
    severity: boolean;
    title: boolean;
    description: boolean;
    action: boolean;
  };
  score: number; // 0-4
  notes: string[];
};

// ---------------------------------------------------------------------------
// Load cases
// ---------------------------------------------------------------------------
async function loadCases(): Promise<BenchmarkCase[]> {
  const dir = resolve(process.cwd(), "db/benchmark/cases");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const all: BenchmarkCase[] = [];
  for (const f of files) {
    const cases = JSON.parse(await readFile(join(dir, f), "utf8")) as BenchmarkCase[];
    all.push(...cases);
  }
  return args.section ? all.filter((c) => c.section === args.section) : all;
}

// ---------------------------------------------------------------------------
// Call the AI (or stub)
// ---------------------------------------------------------------------------
async function callAi(c: BenchmarkCase): Promise<FindingPromptOutput> {
  if (MODE === "stub") {
    // Stub mode: synthesize a "perfect" answer from the expected keywords.
    // Used to verify the scoring logic without burning API calls.
    return {
      severity: c.expected.severity as FindingPromptOutput["severity"],
      title: c.expected.title_must_include.join(" ") + " finding",
      description: c.expected.description_must_include.join(" ") + " observed during inspection.",
      recommended_action: c.expected.action_must_include.join(" ") + " evaluate further.",
      confidence: 0.9,
    };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing. Set it in .env.local.");
  const client = new Anthropic({ apiKey: key });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: FINDING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildFindingUserPrompt(c.input) }],
  });

  // Concatenate text blocks (Anthropic SDK returns an array).
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Tolerate optional fenced code blocks.
  const jsonStr = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  return JSON.parse(jsonStr) as FindingPromptOutput;
}

// ---------------------------------------------------------------------------
// Score one case
// ---------------------------------------------------------------------------
function scoreCase(c: BenchmarkCase, out: FindingPromptOutput): CaseResult {
  const notes: string[] = [];

  const sevOk = out.severity === c.expected.severity;
  if (!sevOk) notes.push(`severity mismatch: got ${out.severity}, expected ${c.expected.severity}`);

  const title = (out.title ?? "").toLowerCase();
  const titleOk = c.expected.title_must_include.every((kw) => title.includes(kw.toLowerCase()));
  if (!titleOk) {
    const missing = c.expected.title_must_include.filter((kw) => !title.includes(kw.toLowerCase()));
    notes.push(`title missing keywords: ${missing.join(", ")}`);
  }

  const desc = (out.description ?? "").toLowerCase();
  const descHasReq = c.expected.description_must_include.every((kw) =>
    desc.includes(kw.toLowerCase()),
  );
  const descHasForbidden = c.expected.description_must_not_include.filter((kw) =>
    desc.includes(kw.toLowerCase()),
  );
  const descOk = descHasReq && descHasForbidden.length === 0;
  if (!descHasReq) {
    const missing = c.expected.description_must_include.filter((kw) => !desc.includes(kw.toLowerCase()));
    notes.push(`description missing keywords: ${missing.join(", ")}`);
  }
  if (descHasForbidden.length) notes.push(`description contains forbidden: ${descHasForbidden.join(", ")}`);

  const action = (out.recommended_action ?? "").toLowerCase();
  const actionOk =
    c.expected.action_must_include.length === 0
      ? true
      : c.expected.action_must_include.every((kw) => action.includes(kw.toLowerCase()));
  if (!actionOk) {
    const missing = c.expected.action_must_include.filter((kw) => !action.includes(kw.toLowerCase()));
    notes.push(`action missing keywords: ${missing.join(", ")}`);
  }

  const scores = { severity: sevOk, title: titleOk, description: descOk, action: actionOk };
  const score = Object.values(scores).filter(Boolean).length;
  return { id: c.id, section: c.section, output: out, scores, score, notes };
}

// ---------------------------------------------------------------------------
// Markdown report
// ---------------------------------------------------------------------------
function renderReport(results: CaseResult[]): string {
  const total = results.length;
  const sumScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore = total * 4;

  const bySection = new Map<string, CaseResult[]>();
  for (const r of results) {
    if (!bySection.has(r.section)) bySection.set(r.section, []);
    bySection.get(r.section)!.push(r);
  }

  const lines: string[] = [];
  lines.push(`# Benchmark report`);
  lines.push("");
  lines.push(`- Mode: \`${MODE}\``);
  lines.push(`- Model: \`${MODEL}\``);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`## Overall: ${sumScore}/${maxScore} (${Math.round((sumScore / maxScore) * 100)}%)`);
  lines.push("");
  lines.push("| section | pass / total | severity | title | desc | action |");
  lines.push("|---|---|---|---|---|---|");
  for (const [sec, rs] of bySection) {
    const perfect = rs.filter((r) => r.score === 4).length;
    const sev = rs.filter((r) => r.scores.severity).length;
    const ttl = rs.filter((r) => r.scores.title).length;
    const dsc = rs.filter((r) => r.scores.description).length;
    const act = rs.filter((r) => r.scores.action).length;
    lines.push(`| ${sec} | ${perfect}/${rs.length} | ${sev}/${rs.length} | ${ttl}/${rs.length} | ${dsc}/${rs.length} | ${act}/${rs.length} |`);
  }
  lines.push("");

  lines.push("## Cases");
  for (const r of results) {
    const mark = r.score === 4 ? "✓" : "✗";
    lines.push("");
    lines.push(`### ${mark} ${r.id} — ${r.score}/4`);
    if (r.error) {
      lines.push(`**Error:** ${r.error}`);
      continue;
    }
    if (r.notes.length) {
      lines.push("");
      lines.push("Notes:");
      for (const n of r.notes) lines.push(`- ${n}`);
    }
    if (r.output) {
      lines.push("");
      lines.push("Output:");
      lines.push("```json");
      lines.push(JSON.stringify(r.output, null, 2));
      lines.push("```");
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const cases = await loadCases();
  if (!cases.length) {
    console.error("No cases matched.");
    process.exit(1);
  }
  console.log(`Running ${cases.length} cases in ${MODE} mode (model=${MODEL})\n`);

  const results: CaseResult[] = [];
  for (const c of cases) {
    process.stdout.write(`  ${c.id.padEnd(14)} ... `);
    try {
      const out = await callAi(c);
      const r = scoreCase(c, out);
      results.push(r);
      console.log(`${r.score}/4 ${r.score === 4 ? "✓" : "✗"}`);
    } catch (err) {
      results.push({
        id: c.id,
        section: c.section,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        scores: { severity: false, title: false, description: false, action: false },
        score: 0,
        notes: [],
      });
      console.log(`FAIL: ${err instanceof Error ? err.message : err}`);
    }
  }

  const sumScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore = results.length * 4;
  console.log(`\nOverall: ${sumScore}/${maxScore} (${Math.round((sumScore / maxScore) * 100)}%)`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsDir = resolve(process.cwd(), "db/benchmark/results");
  await mkdir(resultsDir, { recursive: true });
  const reportPath = join(resultsDir, `${stamp}.md`);
  await writeFile(reportPath, renderReport(results), "utf8");
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
