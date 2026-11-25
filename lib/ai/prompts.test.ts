// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { PHOTO_FINDING_SYSTEM_PROMPT, parsePhotoFinding, parsePhotoFindings } from "./prompts";

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

test("parsePhotoFindings returns one draft per distinct defect, most severe first", () => {
  const out = parsePhotoFindings(
    JSON.stringify({
      primary_subject: "panel and water heater",
      evidence: "An open knockout and rust on the fittings are both in frame.",
      result: "defect",
      findings: [
        {
          section: "water_heater",
          severity: "minor_repair",
          title: "Corrosion at supply fittings",
          description: "Rust is visible on the supply fittings.",
          recommended_action: "Recommend a licensed plumber evaluate and repair.",
          confidence: 0.7,
        },
        {
          section: "water_heater",
          severity: "minor_repair",
          title: "Corrosion at the supply fitting",
          description: "Same rust, worded again.",
          recommended_action: "Recommend a licensed plumber evaluate and repair.",
          confidence: 0.4,
        },
        {
          section: "electrical",
          severity: "safety_hazard",
          title: "Open knockout in the panel",
          description: "A panel knockout is open.",
          recommended_action: "Recommend a licensed electrician evaluate and repair.",
          confidence: 0.9,
        },
      ],
    }),
  );
  assert.equal(out.findings.length, 2);
  assert.equal(out.findings[0].title, "Open knockout in the panel");
  assert.equal(out.findings[0].section, "electrical");
  assert.equal(out.findings[1].title, "Corrosion at supply fittings");
  assert.match(PHOTO_FINDING_SYSTEM_PROMPT, /no_defect/);
  assert.match(PHOTO_FINDING_SYSTEM_PROMPT, /distinct defect/);
  assert.doesNotMatch(PHOTO_FINDING_SYSTEM_PROMPT, /mention the others in one sentence/);
});

test("no_defect and unclear collapse a findings list to one info draft", () => {
  for (const result of ["no_defect", "unclear"] as const) {
    const out = parsePhotoFindings(
      JSON.stringify({
        result,
        evidence: "The nameplate is legible and nothing looks damaged.",
        findings: [
          { ...defect, severity: "major_repair", title: "First" },
          { ...defect, title: "Second" },
        ],
      }),
    );
    assert.equal(out.findings.length, 1);
    assert.equal(out.findings[0].severity, "info");
    assert.equal(out.findings[0].recommended_action, "");
    assert.equal(out.result, result);
  }
});

test("more than four defect drafts are capped", () => {
  const findings = ["knockout", "rust", "vent", "strap", "scorch"].map((name, i) => ({
    section: "electrical",
    severity: "monitor",
    title: `${name} issue on this photo`,
    description: `${name} is visible.`,
    recommended_action: "Monitor for changes.",
    confidence: 0.5 + i / 100,
  }));
  const out = parsePhotoFindings(JSON.stringify({ result: "defect", evidence: "several", findings }));
  assert.equal(out.findings.length, 4);
});
