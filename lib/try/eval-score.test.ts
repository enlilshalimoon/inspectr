// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { passes, scoreOutput, summarize, type EvalLabel, type EvalOutput } from "./eval-score";
import { STANDARD_SECTIONS } from "@/lib/supabase/sections";

const waterHeater: EvalLabel = {
  id: "wh",
  photo: "x.jpg",
  sections: ["water_heater", "plumbing"],
  results: ["defect", "no_defect"],
  defect_keywords: [["corros", "rust"]],
  forbidden_in_title: ["tpr", "scorch"],
  evidence: "rust at fittings",
};

const out = (o: Partial<EvalOutput>): EvalOutput => ({
  result: "defect",
  section: "water_heater",
  severity: "monitor",
  title: "Corrosion at supply fittings",
  description: "Rust is visible on the supply pipe fittings.",
  ...o,
});

test("a defect that names the labeled condition is correct", () => {
  const s = scoreOutput(waterHeater, out({}));
  assert.equal(s.correct, true);
  assert.equal(s.confidentWrongDefect, false);
});

test("a defect the photo doesn't show is a confident wrong defect", () => {
  const s = scoreOutput(
    waterHeater,
    out({ title: "Missing TPR discharge pipe", description: "No discharge pipe at the relief valve." }),
  );
  assert.equal(s.correct, false);
  assert.equal(s.confidentWrongDefect, true);
  assert.ok(s.reasons.some((r) => r.includes("corros")));
  assert.ok(s.reasons.some((r) => r.includes("tpr")));
});

test("a forbidden claim in the title is wrong even with the right keywords", () => {
  const s = scoreOutput(waterHeater, out({ title: "Scorching and rust at burner" }));
  assert.equal(s.correct, false);
  assert.equal(s.confidentWrongDefect, true);
});

test("an info-severity defect is a miss, not a confident wrong defect", () => {
  const label: EvalLabel = { ...waterHeater, results: ["unclear"] };
  const s = scoreOutput(label, out({ severity: "info" }));
  assert.equal(s.correct, false);
  assert.equal(s.confidentWrongDefect, false);
});

test("wrong section is a miss but not a wrong defect", () => {
  const s = scoreOutput(waterHeater, out({ section: "hvac" }));
  assert.equal(s.correct, false);
  assert.equal(s.confidentWrongDefect, false);
});

test("'*' sections and unclear results score as correct", () => {
  const label: EvalLabel = { id: "blur", photo: "x.jpg", sections: "*", results: ["unclear"], evidence: "blur" };
  const s = scoreOutput(label, out({ result: "unclear", section: "attic", severity: "info", title: "Photo unclear" }));
  assert.equal(s.correct, true);
});

test("summary and pass bar: 80% correct and no confident wrong defects", () => {
  const good = { label: waterHeater, out: out({}), score: scoreOutput(waterHeater, out({})) };
  const wrongOut = out({ title: "Missing TPR discharge pipe", description: "x" });
  const wrong = { label: waterHeater, out: wrongOut, score: scoreOutput(waterHeater, wrongOut) };
  const failed = { label: waterHeater, out: null, score: null };

  assert.equal(passes(summarize([good, good, good, good, failed])), true);
  assert.equal(passes(summarize([good, good, good, failed, failed])), false);
  const s = summarize([good, good, good, good, good, good, good, good, good, wrong]);
  assert.equal(s.correct, 9);
  assert.equal(s.confidentWrongDefects, 1);
  assert.equal(passes(s), false);
  assert.equal(summarize([failed]).errors, 1);
});

test("an extra defect the label doesn't describe is a confident wrong defect", () => {
  const s = scoreOutput(waterHeater, {
    ...out({}),
    findings: [
      {
        result: "defect",
        section: "water_heater",
        severity: "monitor",
        title: "Corrosion at supply fittings",
        description: "Rust is visible on the supply pipe fittings.",
      },
      {
        result: "defect",
        section: "water_heater",
        severity: "major_repair",
        title: "Active roof leak above the tank",
        description: "Water is entering from the roof.",
      },
    ],
  });
  assert.equal(s.correct, false);
  assert.equal(s.confidentWrongDefect, true);
  assert.ok(s.reasons.some((r) => r.includes("roof leak")));
});

test("fewer findings than min_findings is a miss, not a confident wrong defect", () => {
  const label: EvalLabel = { ...waterHeater, min_findings: 2, defect_keywords: [["corros"], ["vent"]] };
  const s = scoreOutput(label, out({ description: "Rust is visible on the supply pipe fittings and the vent." }));
  assert.equal(s.correct, false);
  assert.equal(s.confidentWrongDefect, false);
  assert.ok(s.reasons.some((r) => r.includes("at least 2")));
});

test("siding sample accepts wood damage and debris in the foundation vent", () => {
  const cases = JSON.parse(readFileSync("db/try-eval/cases.json", "utf8")) as EvalLabel[];
  const label = cases.find((c) => c.id === "sample-siding-rot");
  assert.ok(label);
  assert.ok(label.sections !== "*" && label.sections.includes("exterior"));
  assert.ok(label.sections.includes("grounds"));

  const rot: EvalOutput = {
    result: "defect",
    section: "exterior",
    severity: "major_repair",
    title: "Severe wood deterioration at the siding base",
    description: "The wood siding beside the vent is decayed.",
  };
  const vent = {
    result: "defect" as const,
    section: "grounds",
    severity: "minor_repair",
    title: "Debris accumulated in the screened foundation vent",
    description: "Soil and debris have accumulated inside the screened foundation vent.",
  };
  const both = scoreOutput(label, { ...rot, findings: [rot, vent] });
  assert.equal(both.correct, true, both.reasons.join("; "));
  assert.equal(both.confidentWrongDefect, false);

  const ventOnExterior = scoreOutput(label, { ...rot, findings: [rot, { ...vent, section: "exterior" }] });
  assert.equal(ventOnExterior.correct, true, ventOnExterior.reasons.join("; "));

  // The vent condition is accepted, not required. A wood-damage-only draft still passes.
  const onlyWood = scoreOutput(label, rot);
  assert.equal(onlyWood.correct, true, onlyWood.reasons.join("; "));
});

test("committed cases are well-formed and their photos exist", () => {
  const cases = JSON.parse(readFileSync("db/try-eval/cases.json", "utf8")) as EvalLabel[];
  const sections = new Set<string>(STANDARD_SECTIONS.map((s) => s.type));
  const ids = new Set<string>();
  assert.ok(cases.length >= 10);
  for (const c of cases) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.ok(existsSync(c.photo), `missing photo ${c.photo}`);
    assert.ok(c.results.length > 0 && c.evidence, c.id);
    if (c.sections !== "*") for (const s of c.sections) assert.ok(sections.has(s), `${c.id}: unknown section ${s}`);
    for (const r of c.results) assert.ok(["defect", "no_defect", "unclear"].includes(r), `${c.id}: ${r}`);
    if (c.results.includes("defect")) assert.ok(c.defect_keywords?.length, `${c.id}: defect needs keywords`);
  }
  assert.ok(cases.some((c) => !c.results.includes("defect")), "needs no-defect/unclear cases");
  assert.ok(cases.some((c) => (c.min_findings ?? 0) >= 2), "needs a photo with two defects");
});
