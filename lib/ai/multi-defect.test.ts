// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FINDINGS_PER_PHOTO,
  SPLIT_DESCRIPTION,
  SPLIT_TITLE,
  dedupeDrafts,
  higherSeverity,
  isSplitPlaceholder,
  mergeFindingText,
  normalizeDrafts,
  sameDefect,
  type DraftedFinding,
} from "./multi-defect";

const tpr = {
  section: "water_heater",
  severity: "safety_hazard",
  title: "Missing TPR valve discharge pipe",
  description: "The temperature/pressure relief valve has no discharge pipe.",
  recommended_action: "Recommend a licensed plumber install a discharge pipe.",
  confidence: 0.9,
};
const gas = {
  section: "plumbing",
  severity: "major_repair",
  title: "Corroded flexible gas connector",
  description: "The gas connector to the water heater shows corrosion.",
  recommended_action: "Recommend a licensed plumber replace the connector.",
  confidence: 0.8,
};

test("one photo with two distinct defects yields two findings, each in its own section", () => {
  const out = normalizeDrafts({ findings: [tpr, gas] }, "water_heater");
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((f) => [f.section, f.severity, f.title]),
    [
      ["water_heater", "safety_hazard", "Missing TPR valve discharge pipe"],
      ["plumbing", "major_repair", "Corroded flexible gas connector"],
    ],
  );
});

test("a single-object reply (old prompt shape) still works", () => {
  const out = normalizeDrafts({ ...tpr, section: undefined }, "water_heater");
  assert.equal(out.length, 1);
  assert.equal(out[0].section, "water_heater");
});

test("a bare array reply works", () => {
  assert.equal(normalizeDrafts([tpr, gas], "interior").length, 2);
});

test("unknown sections fall back to the photo's section", () => {
  const out = normalizeDrafts({ findings: [{ ...gas, section: "basement" }] }, "garage");
  assert.equal(out[0].section, "garage");
});

test("bad severities become monitor and confidence is clamped", () => {
  const out = normalizeDrafts({ findings: [{ ...tpr, severity: "catastrophic", confidence: 7 }] }, "interior");
  assert.equal(out[0].severity, "monitor");
  assert.equal(out[0].confidence, 1);
});

test("entries without a title or description are dropped", () => {
  const out = normalizeDrafts({ findings: [{ ...tpr, title: "" }, { ...gas, description: "  " }, gas] }, "interior");
  assert.equal(out.length, 1);
  assert.equal(out[0].title, gas.title);
});

test("garbage replies give no drafts", () => {
  assert.deepEqual(normalizeDrafts(null, "interior"), []);
  assert.deepEqual(normalizeDrafts("nope", "interior"), []);
  // An object with no title/description is nothing usable either.
  assert.deepEqual(normalizeDrafts({ findings: "x" }, "interior"), []);
});

test("duplicate defects collapse to one and keep the higher severity", () => {
  const out = normalizeDrafts(
    {
      findings: [
        { ...tpr, severity: "major_repair" },
        { ...tpr, title: "TPR valve discharge pipe missing", severity: "safety_hazard" },
        gas,
      ],
    },
    "water_heater",
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].title, "Missing TPR valve discharge pipe");
  assert.equal(out[0].severity, "safety_hazard");
});

test("caps findings per photo", () => {
  const many = ["roof", "gutter", "fascia", "chimney", "skylight", "vent"].map((w) => ({
    ...gas,
    title: `Damaged ${w} component`,
  }));
  // "Damaged X component" titles share 2 of 4 tokens (Jaccard 0.5): distinct.
  assert.equal(normalizeDrafts({ findings: many }, "roof").length, MAX_FINDINGS_PER_PHOTO);
});

test("sameDefect: reworded titles match, different defects don't", () => {
  assert.equal(sameDefect("Loose stair handrail", "Handrail loose at stairs"), true);
  assert.equal(sameDefect("Missing TPR discharge pipe", "Corroded gas connector"), false);
  assert.equal(sameDefect("Missing GFCI at kitchen outlet", "Missing GFCI at bathroom outlet"), false);
  assert.equal(sameDefect("Rust", "rust"), true);
});

test("dedupeDrafts keeps distinct drafts in order", () => {
  const a = normalizeDrafts([tpr], "water_heater")[0];
  const b = normalizeDrafts([gas], "water_heater")[0];
  assert.deepEqual(dedupeDrafts([a, b] as DraftedFinding[]).map((d) => d.title), [a.title, b.title]);
});

test("higherSeverity", () => {
  assert.equal(higherSeverity("monitor", "safety_hazard"), "safety_hazard");
  assert.equal(higherSeverity("major_repair", "info"), "major_repair");
});

test("mergeFindingText combines text without repeating, takes higher severity", () => {
  const merged = mergeFindingText(
    { severity: "monitor", title: "Stained ceiling drywall", description: "Stain at ceiling.", recommended_action: "Monitor." },
    { severity: "minor_repair", title: "Soft drywall", description: "Drywall is soft below stain.", recommended_action: "Monitor." },
  );
  assert.equal(merged.title, "Stained ceiling drywall");
  assert.equal(merged.severity, "minor_repair");
  assert.equal(merged.description, "Stain at ceiling.\n\nDrywall is soft below stain.");
  assert.equal(merged.recommended_action, "Monitor.");
});

test("mergeFindingText handles empty actions", () => {
  const merged = mergeFindingText(
    { severity: "info", title: "A", description: "a", recommended_action: null },
    { severity: "info", title: "B", description: "b", recommended_action: "" },
  );
  assert.equal(merged.recommended_action, null);
});

test("split placeholders are detected until rewritten", () => {
  assert.equal(isSplitPlaceholder({ title: SPLIT_TITLE, description: SPLIT_DESCRIPTION }), true);
  assert.equal(isSplitPlaceholder({ title: "Cracked tile", description: SPLIT_DESCRIPTION }), true);
  assert.equal(isSplitPlaceholder({ title: "Cracked tile", description: "Hairline crack at shower floor." }), false);
});
