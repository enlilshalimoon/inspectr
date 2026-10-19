// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SIGNUP_ROLES,
  isKnownNonInspector,
  registrationPixelEvent,
  roleFromMetadata,
  type SignupRole,
} from "./signup-role";

test("inspector roles fire the standard CompleteRegistration event", () => {
  for (const role of ["licensed_inspector", "inspector_in_training"] as const) {
    assert.deepEqual(registrationPixelEvent(role), { method: "track", name: "CompleteRegistration" });
  }
});

test("every other role fires the custom NonInspectorSignup event", () => {
  const others: SignupRole[] = ["real_estate_agent", "homeowner_or_buyer", "other"];
  for (const role of others) {
    assert.deepEqual(registrationPixelEvent(role), { method: "trackCustom", name: "NonInspectorSignup" });
  }
});

test("a missing role never fires CompleteRegistration", () => {
  assert.equal(registrationPixelEvent(null).name, "NonInspectorSignup");
  assert.equal(registrationPixelEvent(undefined).name, "NonInspectorSignup");
});

test("exactly two of the five roles count as inspectors", () => {
  const inspectors = SIGNUP_ROLES.filter((r) => registrationPixelEvent(r).name === "CompleteRegistration");
  assert.deepEqual(inspectors, ["licensed_inspector", "inspector_in_training"]);
});

test("roleFromMetadata reads valid roles and ignores junk", () => {
  assert.equal(roleFromMetadata({ role: "homeowner_or_buyer" }), "homeowner_or_buyer");
  assert.equal(roleFromMetadata({ role: "admin" }), null);
  assert.equal(roleFromMetadata({}), null);
  assert.equal(roleFromMetadata(undefined), null);
});

test("pre-role accounts are not treated as non-inspectors", () => {
  assert.equal(isKnownNonInspector(null), false);
  assert.equal(isKnownNonInspector("licensed_inspector"), false);
  assert.equal(isKnownNonInspector("real_estate_agent"), true);
});
