// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCompliance, formatDateOnly, licenseLine, recommendationFor, wiSummaryGroups } from "./report";
import { NC_SUMMARY_STATEMENT, defaultSop, statePacks } from "./state-rules";

const base = { licenseState: null, propertyState: null, sopStandard: null, yearBuilt: 1995, sections: [] };

test("no state add-ons for FL; SOP defaults by license state", () => {
  const c = buildCompliance({ ...base, licenseState: "fl", propertyState: "FL" });
  assert.equal(c.packs.length, 0);
  assert.match(c.sop, /Florida standards of practice/);
  assert.match(defaultSop("CA"), /InterNACHI/);
  assert.equal(buildCompliance({ ...base, sopStandard: "ASHI Standard of Practice" }).sop, "ASHI Standard of Practice");
});

test("packs apply for either license state or property state", () => {
  const c = buildCompliance({ ...base, licenseState: "NC", propertyState: "VA" });
  assert.deepEqual(c.packs.map((p) => p.state), ["NC", "VA"]);
  assert.equal(c.ncSummary, true);
  assert.equal(c.wiSummary, false);
  assert.ok(NC_SUMMARY_STATEMENT.startsWith("This summary page is not the entire report."));
});

test("VA CSST statement only for pre-2008 or unknown-age homes", () => {
  assert.equal(statePacks(["VA"], { yearBuilt: 1999 })[0].statements.length, 2);
  assert.equal(statePacks(["VA"], { yearBuilt: null })[0].statements.length, 2);
  assert.equal(statePacks(["VA"], { yearBuilt: 2015 })[0].statements.length, 1);
});

test("PA statements are conspicuous and flag unreasonable risk", () => {
  const c = buildCompliance({ ...base, propertyState: "PA" });
  assert.equal(c.flagUnreasonableRisk, true);
  assert.equal(c.packs[0].statements.length, 4);
  assert.ok(c.packs[0].statements.every((s) => s.conspicuous));
});

test("KY lists not-inspected systems among exclusions; scope says limited", () => {
  const c = buildCompliance({
    ...base,
    licenseState: "KY",
    sections: [
      { section_type: "roof", status: { status: "not_inspected", reason: "Wet, steep", description: null } },
      { section_type: "plumbing", status: { status: "inspected", reason: null, description: null } },
    ],
  });
  assert.equal(c.exclusions?.[0], "Roof: not inspected (Wet, steep)");
  assert.match(c.scopeStatement, /limited inspection/);
  assert.deepEqual(c.notInspected, [{ label: "Roof", reason: "Wet, steep" }]);
});

test("WI summary labels major repairs and safety hazards as defects", () => {
  const f = (severity: "safety_hazard" | "major_repair" | "monitor") => ({
    section_type: "roof",
    severity,
    title: severity,
    recommended_action: null,
  });
  const g = wiSummaryGroups([f("safety_hazard"), f("major_repair"), f("monitor")]);
  assert.equal(g.defects.length, 2);
  assert.deepEqual(g.other.map((o) => o.label), ["Monitor"]);
});

test("recommendation falls back by severity; no cost wording", () => {
  assert.equal(recommendationFor({ severity: "info", recommended_action: null }), null);
  assert.equal(recommendationFor({ severity: "monitor", recommended_action: " Re-caulk " }), "Re-caulk");
  const r = recommendationFor({ severity: "major_repair", recommended_action: "" }) ?? "";
  assert.doesNotMatch(r, /\$|cost|price/i);
});

test("license line includes state name and expiration", () => {
  assert.equal(
    licenseLine({ license_number: "123", license_state: "oh", license_expires: "2027-03-31" }),
    "License 123 (Ohio), expires March 31, 2027",
  );
  assert.equal(licenseLine({ license_number: null, license_state: "OH" }), null);
  assert.equal(formatDateOnly("2026-01-01"), "January 1, 2026");
});
