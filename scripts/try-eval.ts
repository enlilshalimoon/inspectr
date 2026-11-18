// Run /try's photo -> finding step on local files, old pipeline vs new, with
// no database, rate limit or email. Needs ANTHROPIC_API_KEY in .env.local.
//
// Usage:
//   npx tsx -r dotenv/config scripts/try-eval.ts dotenv_config_path=.env.local public/try-samples/*.jpg
//   ...add --new-only to skip the old two-stage pipeline (halves the cost)
//
// Pass photos already prepared the way the browser does (JPEG, <= 2048px long
// edge), e.g. `sips -Z 2048 -s format jpeg in.heic --out out.jpg` on a Mac.

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { analyzeImageBytes, draftFinding, draftFindingFromImage } from "../lib/ai/anthropic";
import { resolveSectionType } from "../lib/inspection/photos";

const files = process.argv.slice(2).filter((a) => !a.startsWith("--") && !a.startsWith("dotenv_config"));
const newOnly = process.argv.includes("--new-only");

async function main() {
  if (!files.length) {
    console.error("Pass one or more photo paths.");
    process.exit(1);
  }
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
