// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isFindingDismissed,
  isOwnStoragePath,
  resolveSectionType,
  withDismissed,
} from "./photos";

test("resolveSectionType accepts known sections, case-insensitive", () => {
  assert.equal(resolveSectionType("electrical"), "electrical");
  assert.equal(resolveSectionType(" Water_Heater "), "water_heater");
  assert.equal(resolveSectionType("pool"), "pool");
});

test("resolveSectionType rejects unknown or non-string values", () => {
  assert.equal(resolveSectionType("basement"), null);
  assert.equal(resolveSectionType(""), null);
  assert.equal(resolveSectionType(undefined), null);
  assert.equal(resolveSectionType(42), null);
});

test("dismissed flag round-trips and keeps the vision analysis", () => {
  const vision = { primary_subject: "panel", section: "electrical" };
  const dismissed = withDismissed(vision, true);
  assert.equal(isFindingDismissed(dismissed), true);
  assert.equal(dismissed.primary_subject, "panel");
  const restored = withDismissed(dismissed, false);
  assert.equal(isFindingDismissed(restored), false);
  assert.equal(restored.primary_subject, "panel");
});

test("isFindingDismissed is false for empty or ordinary analysis", () => {
  assert.equal(isFindingDismissed(null), false);
  assert.equal(isFindingDismissed({ primary_subject: "roof" }), false);
  assert.equal(isFindingDismissed(withDismissed(null, true)), true);
});

test("isOwnStoragePath only allows the inspector's own folder", () => {
  assert.equal(isOwnStoragePath("u1/logo.png", "u1"), true);
  assert.equal(isOwnStoragePath("u2/i9.pdf", "u1"), false);
  assert.equal(isOwnStoragePath("u1/../u2/i9.pdf", "u1"), false);
  assert.equal(isOwnStoragePath(null, "u1"), false);
});
