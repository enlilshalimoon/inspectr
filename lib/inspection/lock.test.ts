import { test } from "node:test";
import assert from "node:assert/strict";
import { finalizedStatus, isFirstFinalize, isLockedStatus } from "./lock";

test("finalized and delivered reports are locked", () => {
  assert.equal(isLockedStatus("finalized"), true);
  assert.equal(isLockedStatus("delivered"), true);
  assert.equal(isLockedStatus("in_progress"), false);
  assert.equal(isLockedStatus("review"), false);
  assert.equal(isLockedStatus(null), false);
});

test("re-finalizing a delivered report keeps it delivered", () => {
  assert.equal(finalizedStatus(null), "finalized");
  assert.equal(finalizedStatus("2026-10-16T10:00:00Z"), "delivered");
});

test("first-report email only on the first ever finalize", () => {
  assert.equal(isFirstFinalize(null, 1), true);
  assert.equal(isFirstFinalize(null, 2), false);
  // Re-open then finalize again: finalized_at was already set.
  assert.equal(isFirstFinalize("2026-10-15T10:00:00Z", 1), false);
});
