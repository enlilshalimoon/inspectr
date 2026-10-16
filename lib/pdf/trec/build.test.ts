// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTrecReportData, formatTrecDate } from "./build";
import { parseReportForm } from "@/lib/trec/form";

const base = {
  clientName: "Jane Buyer",
  inspectionDate: "2026-10-14",
  propertyAddress: "123 Main St, Beeville, TX 78102",
  inspectorName: "Pat Inspector",
  inspectorLicense: "12345",
  logoData: null,
};

test("formatTrecDate uses MM/DD/YYYY", () => {
  assert.equal(formatTrecDate("2026-10-14"), "10/14/2026");
  assert.equal(formatTrecDate(null), "");
});

test("findings print under their item, photos numbered in form order", () => {
  const data = buildTrecReportData({
    ...base,
    form: parseReportForm({}),
    findings: [
      {
        id: "e",
        sectionType: "electrical",
        title: "Missing GFCI at kitchen outlet",
        description: "d",
        recommended_action: null,
        severity: "safety_hazard",
        is_approved: true,
        photoData: "data:x",
      },
      {
        id: "r",
        sectionType: "roof",
        title: "Cracked shingles",
        description: "d",
        recommended_action: "Recommend a roofer evaluate.",
        severity: "minor_repair",
        is_approved: true,
        photoData: "data:y",
      },
      {
        id: "u",
        sectionType: "roof",
        title: "Unapproved",
        description: "d",
        recommended_action: null,
        severity: "minor_repair",
        is_approved: false,
      },
    ],
  });
  const roof = data.sections[0].items.find((i) => i.label === "Roof Covering Materials")!;
  assert.deepEqual(roof.boxes, { i: true, ni: false, np: false, d: true });
  assert.equal(roof.findings.length, 1, "unapproved findings don't print");
  assert.equal(roof.findings[0].photoNo, 1);
  const elec = data.sections.find((s) => s.roman === "II")!.items.find((i) => i.letter === "B")!;
  assert.equal(elec.findings[0].photoNo, 2);
  assert.deepEqual(
    data.photos.map((p) => p.caption),
    ["I.C Roof Covering Materials: Cracked shingles", "II.B Branch Circuits, Connected Devices, and Fixtures: Missing GFCI at kitchen outlet"],
  );
});

test("deleted Section VI items re-letter the rest; empty Other items drop", () => {
  const data = buildTrecReportData({
    ...base,
    findings: [],
    form: parseReportForm({ items: { "VI.A": { removed: true }, "VI.B": { removed: true }, "VI.C": { np: true } } }),
  });
  const vi = data.sections.find((s) => s.roman === "VI")!;
  assert.deepEqual(
    vi.items.map((i) => `${i.letter}. ${i.label}`),
    [
      "A. Outbuildings",
      "B. Private Water Wells (A coliform analysis is recommended.)",
      "C. Private Sewage Disposal Systems",
      "D. Other Built-in Appliances",
    ],
  );
  const i = data.sections.find((s) => s.roman === "I")!;
  assert.ok(!i.items.some((it) => it.label === "Other"));
  assert.equal(i.items.at(-1)!.letter, "K", "sections I–V keep TREC's lettering");
});
