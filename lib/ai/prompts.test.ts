// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PHOTO_FINDING_SYSTEM_PROMPT,
  PHOTO_FINDING_USER_PROMPT,
  parsePhotoFinding,
  parsePhotoFindings,
} from "./prompts";

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
          confidence: 0.75,
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
  const findings = ["knockout", "rust", "vent", "strap", "scorch"].map((name) => ({
    section: "electrical",
    severity: "monitor",
    title: `${name} issue on this photo`,
    description: `${name} is visible.`,
    recommended_action: "Monitor for changes.",
    confidence: 0.85,
    evidence: `${name} is a discrete failure visible in this photo, not shade or texture.`,
  }));
  const out = parsePhotoFindings(
    JSON.stringify({
      result: "defect",
      evidence: "Each item below is a separate visible failure.",
      findings,
    }),
  );
  assert.equal(out.findings.length, 4);
});

test("soil against wood siding is exterior, including when the model says grounds", () => {
  const out = parsePhotoFindings(
    JSON.stringify({
      result: "defect",
      evidence: "Soil is piled against the bottom course of wood siding.",
      findings: [
        {
          section: "grounds",
          severity: "minor_repair",
          title: "Soil in direct contact with wood siding at grade",
          description: "Soil is in contact with the wood siding along the base of the wall.",
          recommended_action: "Recommend a qualified contractor evaluate and repair.",
          confidence: 0.9,
        },
      ],
    }),
  );
  assert.equal(out.findings[0].section, "exterior");
});

test("yard drainage stays grounds and a rim joist stays structure", () => {
  const drainage = parsePhotoFinding(
    JSON.stringify({
      ...defect,
      section: "grounds",
      title: "Downspout discharges at the foundation",
      description: "The downspout dumps water against the foundation wall.",
      evidence: "The downspout outlet is at the soil beside the foundation wall.",
    }),
  );
  assert.equal(drainage.section, "grounds");

  const joist = parsePhotoFinding(
    JSON.stringify({
      ...defect,
      section: "structure",
      title: "Soil against the rim joist",
      description: "Soil is in contact with the rim joist.",
      evidence: "Exposed rim joist with soil against the wood.",
    }),
  );
  assert.equal(joist.section, "structure");
});

test("a low-confidence or underspecified defect becomes unclear instead of a published defect", () => {
  const weak = parsePhotoFindings(
    JSON.stringify({
      result: "defect",
      primary_subject: "roof slope",
      evidence: "The shingles look a bit uneven in the shade.",
      findings: [
        {
          section: "roof",
          severity: "major_repair",
          title: "Significant granule loss",
          description: "The surface looks lighter in places.",
          recommended_action: "Recommend a qualified roofing contractor evaluate and replace.",
          confidence: 0.4,
          evidence: "Lighter patches that might be shade.",
        },
      ],
    }),
  );
  assert.equal(weak.result, "unclear");
  assert.equal(weak.findings.length, 1);
  assert.equal(weak.findings[0].severity, "info");
  assert.equal(weak.findings[0].recommended_action, "");

  const kept = parsePhotoFindings(
    JSON.stringify({
      result: "defect",
      evidence: "Shared note.",
      findings: [
        {
          section: "roof",
          severity: "major_repair",
          title: "Torn shingle tabs",
          description: "Several tabs are torn back.",
          recommended_action: "Recommend a qualified roofing contractor evaluate and repair.",
          confidence: 0.95,
          evidence: "Three tabs near the center are torn back, with the mat showing.",
        },
        {
          section: "roof",
          severity: "major_repair",
          title: "Dark staining",
          description: "The surface is darker.",
          recommended_action: "Recommend a qualified roofing contractor evaluate.",
          confidence: 0.9,
          evidence: "dark",
        },
      ],
    }),
  );
  assert.equal(kept.result, "defect");
  assert.equal(kept.findings.length, 1);
  assert.equal(kept.findings[0].title, "Torn shingle tabs");
});

test("major_repair and safety_hazard are downgraded when confidence is only moderate", () => {
  const out = parsePhotoFindings(
    JSON.stringify({
      result: "defect",
      evidence: "Two separate conditions are visible.",
      findings: [
        {
          section: "roof",
          severity: "major_repair",
          title: "Curled shingle tabs",
          description: "Tabs along the eave are curled.",
          recommended_action: "Recommend a qualified roofing contractor evaluate and repair.",
          confidence: 0.7,
          evidence: "Tabs along the lower eave are curled up and no longer seated.",
        },
        {
          section: "electrical",
          severity: "safety_hazard",
          title: "Possible open knockout",
          description: "A dark spot in the panel might be an opening.",
          recommended_action: "Recommend a licensed electrician evaluate and repair.",
          confidence: 0.7,
          evidence: "A dark spot on the panel deadfront might be an open knockout.",
        },
      ],
    }),
  );
  assert.equal(out.findings.find((f) => f.title.startsWith("Curled"))?.severity, "minor_repair");
  assert.equal(out.findings.find((f) => f.title.startsWith("Possible"))?.severity, "monitor");
  assert.match(PHOTO_FINDING_SYSTEM_PROMPT, /Shade, shadow, dappled light/);
  assert.match(PHOTO_FINDING_USER_PROMPT, /exterior finding, not grounds/);
});
