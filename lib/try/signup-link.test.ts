// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanVisitor, parseTrySignup, trySignupHref } from "./signup-link";

test("signup link carries only from=try and the finding count", () => {
  assert.equal(trySignupHref(4), "/signup?from=try&findings=4");
  assert.equal(trySignupHref(0), "/signup?from=try");
  assert.equal(trySignupHref(500), "/signup?from=try&findings=99");
});

test("signup params parse only from=try", () => {
  assert.deepEqual(parseTrySignup({ from: "try", findings: "13" }), { findings: 13 });
  assert.deepEqual(parseTrySignup({ from: "try", findings: "x" }), { findings: 0 });
  assert.deepEqual(parseTrySignup({ from: ["try"], findings: ["2"] }), { findings: 2 });
  assert.equal(parseTrySignup({ from: "ad", findings: "3" }), null);
  assert.equal(parseTrySignup({}), null);
});

test("visitor cookie must be a hex hash", () => {
  assert.equal(cleanVisitor("6f3868ce196a3a415c81d995bd3d54b2"), "6f3868ce196a3a415c81d995bd3d54b2");
  assert.equal(cleanVisitor("<script>"), null);
  assert.equal(cleanVisitor(undefined), null);
});
