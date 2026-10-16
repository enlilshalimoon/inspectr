// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeNotesFallback,
  isMissingColumnError,
  readSectionStatus,
  sectionsNeedingStatus,
} from "./system-status";
import { REQUIRED_SECTIONS } from "@/lib/supabase/sections";

test("readSectionStatus prefers the column, falls back to inspector_notes", () => {
  const col = { status: "inspected", reason: null, description: "Asphalt shingle" };
  assert.deepEqual(readSectionStatus({ system_status: col }), col);
  const fallback = encodeNotesFallback({ status: "not_present", reason: null, description: null });
  assert.equal(readSectionStatus({ inspector_notes: fallback })?.status, "not_present");
  assert.equal(readSectionStatus({ system_status: null, inspector_notes: "free text" }), null);
  assert.equal(readSectionStatus({ system_status: { status: "bogus" } }), null);
  assert.equal(readSectionStatus({}), null);
});

test("readSectionStatus trims and nulls empty strings", () => {
  const s = readSectionStatus({ system_status: { status: "not_inspected", reason: "  locked  ", description: "" } });
  assert.deepEqual(s, { status: "not_inspected", reason: "locked", description: null });
});

test("isMissingColumnError recognises PostgREST and Postgres errors", () => {
  assert.equal(isMissingColumnError({ code: "PGRST204", message: "x" }, "system_status"), true);
  assert.equal(isMissingColumnError({ code: "42703" }, "system_status"), true);
  assert.equal(
    isMissingColumnError({ message: "Could not find the 'system_status' column of 'inspection_sections'" }, "system_status"),
    true,
  );
  assert.equal(isMissingColumnError({ code: "42501", message: "permission denied" }, "system_status"), false);
  assert.equal(isMissingColumnError(null, "system_status"), false);
});

test("sectionsNeedingStatus: required sections + used optional ones", () => {
  // Nothing recorded: every required section is flagged.
  assert.equal(sectionsNeedingStatus([]).length, REQUIRED_SECTIONS.length);

  const all = REQUIRED_SECTIONS.map((d) => ({
    section_type: d.type,
    system_status: { status: "inspected" },
  }));
  assert.deepEqual(sectionsNeedingStatus(all), []);

  // A used optional section without status is flagged; unused ones aren't.
  assert.deepEqual(sectionsNeedingStatus([...all, { section_type: "fireplace" }]), ["fireplace"]);

  // "Not inspected" without a reason is incomplete.
  const noReason = all.map((r) =>
    r.section_type === "roof" ? { ...r, system_status: { status: "not_inspected" } } : r,
  );
  assert.deepEqual(sectionsNeedingStatus(noReason), ["roof"]);
});
