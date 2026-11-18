// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePhotoFinding } from "./prompts";

const defect = {
  primary_subject: "asphalt shingle roof slope",
  evidence: "Several shingle tabs are cracked and lifted along the center of the photo.",
  result: "defect",
  section: "roof",
  severity: "minor_repair",
  title: "Cracked and lifted asphalt shingle tabs",
  description: "Several shingle tabs are cracked and lifted. Lifted tabs can let wind-driven rain in.",
  recommended_action: "Recommend a qualified roofing contractor evaluate and repair.",
  equipment_data: {},
  confidence: 0.8,
};

test("parsePhotoFinding reads a fenced reply and drops empty equipment data", () => {
  const out = parsePhotoFinding("```json\n" + JSON.stringify(defect) + "\n```");
  assert.equal(out.result, "defect");
  assert.equal(out.section, "roof");
  assert.equal(out.severity, "minor_repair");
  assert.equal(out.equipment_data, undefined);
});

test("parsePhotoFinding tolerates prose around the JSON", () => {
  const out = parsePhotoFinding("Here is the finding:\n" + JSON.stringify(defect) + "\nDone.");
  assert.equal(out.title, defect.title);
});

test("no_defect and unclear are always info with no recommendation", () => {
  for (const result of ["no_defect", "unclear"]) {
    const out = parsePhotoFinding(JSON.stringify({ ...defect, result, severity: "major_repair" }));
    assert.equal(out.severity, "info");
    assert.equal(out.recommended_action, "");
  }
});

test("bad severity, result and confidence fall back conservatively", () => {
  const out = parsePhotoFinding(
    JSON.stringify({ ...defect, result: "maybe", severity: "urgent", confidence: 3 }),
  );
  assert.equal(out.result, "defect");
  assert.equal(out.severity, "monitor");
  assert.equal(out.confidence, 1);
});

test("parsePhotoFinding rejects replies without a usable finding", () => {
  assert.throws(() => parsePhotoFinding("I can't help with that."));
  assert.throws(() => parsePhotoFinding(JSON.stringify({ ...defect, title: "" })));
});
