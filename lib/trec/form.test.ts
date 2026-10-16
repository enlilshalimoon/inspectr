// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  containsCostEstimate,
  isTexasLicense,
  itemForFinding,
  itemsMissingStatus,
  needsMultiBoxExplanation,
  parseReportForm,
  printedItems,
  resolveItems,
  suggestItemForFinding,
  usesTrecForm,
  type FindingForForm,
} from "./form";
import { REI76_ITEMS, REI76_SECTIONS } from "./rei76";

const f = (over: Partial<FindingForForm> = {}): FindingForForm => ({
  id: "f1",
  title: "Cracked shingles",
  description: "Several shingles are cracked.",
  severity: "minor_repair",
  is_approved: true,
  sectionType: "roof",
  ...over,
});

test("REI 7-6 catalog matches the form's item count and lettering", () => {
  assert.deepEqual(
    REI76_SECTIONS.map((s) => [s.roman, s.items.length]),
    [["I", 12], ["II", 3], ["III", 4], ["IV", 6], ["V", 9], ["VI", 7]],
  );
  assert.equal(new Set(REI76_ITEMS.map((i) => i.id)).size, REI76_ITEMS.length);
});

test("isTexasLicense / usesTrecForm", () => {
  assert.equal(isTexasLicense("TX"), true);
  assert.equal(isTexasLicense(" texas "), true);
  assert.equal(isTexasLicense("OK"), false);
  assert.equal(isTexasLicense(null), false);
  assert.equal(usesTrecForm("TX", parseReportForm(null)), true);
  assert.equal(usesTrecForm("TX", parseReportForm({ use_trec: false })), false);
  assert.equal(usesTrecForm("FL", parseReportForm({ use_trec: true })), false);
});

test("suggestItemForFinding uses keywords, then the section default", () => {
  assert.equal(suggestItemForFinding("roof", f()), "I.C");
  assert.equal(suggestItemForFinding("roof", f({ title: "Damaged truss in attic" })), "I.D");
  assert.equal(suggestItemForFinding("electrical", f({ title: "Missing GFCI at kitchen outlet" })), "II.B");
  assert.equal(suggestItemForFinding("electrical", f({ title: "Double-tapped breaker in panel" })), "II.A");
  assert.equal(suggestItemForFinding("kitchen", f({ title: "Dishwasher not secured" })), "V.A");
  assert.equal(suggestItemForFinding("hvac", f({ title: "Condensate line not insulated" })), "III.B");
  assert.equal(suggestItemForFinding("garage", f({ title: "Opener does not auto-reverse" })), "V.G");
  assert.equal(suggestItemForFinding("structure", f({ title: "Slab corner crack" })), "I.A");
  assert.equal(suggestItemForFinding("pool", f()), "VI.B");
  assert.equal(suggestItemForFinding(null, f()), "I.L");
});

test("itemForFinding prefers the inspector's assignment when it is a real item", () => {
  const form = parseReportForm({ finding_items: { f1: "I.D", f2: "Z.Z" } });
  assert.equal(itemForFinding(form, "roof", f()), "I.D");
  assert.equal(itemForFinding(form, "roof", f({ id: "f2" })), "I.C");
});

test("approved deficiency finding drafts I + D; info finding drafts I only", () => {
  const items = resolveItems(parseReportForm({}), [
    f(),
    f({ id: "f2", sectionType: "structure", title: "Slab", severity: "info" }),
    f({ id: "f3", sectionType: "attic", is_approved: false }),
  ]);
  const roof = items.find((r) => r.item.id === "I.C")!;
  assert.equal(roof.source, "draft");
  assert.deepEqual(roof.boxes, { i: true, ni: false, np: false, d: true });
  const fnd = items.find((r) => r.item.id === "I.A")!;
  assert.deepEqual(fnd.boxes, { i: true, ni: false, np: false, d: false });
  // Unapproved findings don't draft anything.
  assert.equal(items.find((r) => r.item.id === "I.D")!.source, "none");
});

test("inspector's boxes override the draft", () => {
  const form = parseReportForm({ items: { "I.C": { i: true, ni: true, comment: "Partially viewed" } } });
  const roof = resolveItems(form, [f()]).find((r) => r.item.id === "I.C")!;
  assert.equal(roof.source, "inspector");
  assert.deepEqual(roof.boxes, { i: true, ni: true, np: false, d: false });
  assert.equal(needsMultiBoxExplanation(roof), false);
  const bare = resolveItems(parseReportForm({ items: { "I.B": { i: true, d: true } } }), []).find(
    (r) => r.item.id === "I.B",
  )!;
  assert.equal(needsMultiBoxExplanation(bare), true);
});

test("missing statuses skip empty Other items and removed optional items", () => {
  const form = parseReportForm({ items: { "VI.A": { removed: true }, "I.A": { removed: true } } });
  const resolved = resolveItems(form, []);
  const missing = itemsMissingStatus(resolved).map((r) => r.item.id);
  assert.ok(!missing.includes("I.L"), "empty Other is dropped");
  assert.ok(!missing.includes("VI.A"), "removed optional item");
  assert.ok(missing.includes("I.A"), "required items can't be removed");
  assert.equal(missing.length, REI76_ITEMS.filter((i) => !i.isOther).length - 1);
  const printed = printedItems(resolved).map((r) => r.item.id);
  assert.ok(!printed.includes("I.L") && !printed.includes("VI.A") && printed.includes("I.A"));
});

test("an Other item with a comment prints and needs a status", () => {
  const form = parseReportForm({ items: { "I.L": { comment: "Retaining wall" } } });
  const resolved = resolveItems(form, []);
  assert.ok(printedItems(resolved).some((r) => r.item.id === "I.L"));
  assert.ok(itemsMissingStatus(resolved).some((r) => r.item.id === "I.L"));
});

test("containsCostEstimate flags prices but not ordinary text", () => {
  assert.equal(containsCostEstimate("Replace, about $450"), true);
  assert.equal(containsCostEstimate("roughly 2,000 dollars"), true);
  assert.equal(containsCostEstimate("Repair cost is high"), true);
  assert.equal(containsCostEstimate("cost to repair 300"), true);
  assert.equal(containsCostEstimate("Recommend a licensed electrician evaluate and repair."), false);
  assert.equal(containsCostEstimate("Static pressure 60 psi; 50 gallon tank"), false);
  assert.equal(containsCostEstimate(""), false);
});
