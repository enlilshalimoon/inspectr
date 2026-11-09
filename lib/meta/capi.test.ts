// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCapiData, fbcFromAttribution } from "./capi";

const ctx = {
  eventTime: 1793983376,
  sourceUrl: "https://www.uselookover.com/signup",
  ip: "203.0.113.7",
  userAgent: "Mozilla/5.0",
  fbp: "fb.1.1.2",
  fbc: null,
};

test("each event keeps the browser's event id so Meta can dedupe", () => {
  const data = buildCapiData(
    [
      { name: "Lead", eventId: "lead-1" },
      { name: "CompleteRegistration", eventId: "reg-1", customData: { role: "licensed_inspector" } },
    ],
    ctx,
  );
  assert.deepEqual(
    data.map((d) => [d.event_name, d.event_id]),
    [
      ["Lead", "lead-1"],
      ["CompleteRegistration", "reg-1"],
    ],
  );
  assert.equal(data[0].action_source, "website");
  assert.deepEqual(data[1].custom_data, { role: "licensed_inspector" });
  assert.equal("custom_data" in data[0], false);
});

test("user data holds only browser fields and skips empty ones", () => {
  const [event] = buildCapiData([{ name: "Lead", eventId: "x" }], ctx);
  assert.deepEqual(event.user_data, {
    client_ip_address: "203.0.113.7",
    client_user_agent: "Mozilla/5.0",
    fbp: "fb.1.1.2",
  });
});

test("fbc is rebuilt from the captured fbclid and its first-touch time", () => {
  assert.equal(
    fbcFromAttribution({ fbclid: "abc", at: "2026-11-06T00:00:00.000Z" }),
    `fb.1.${Date.parse("2026-11-06T00:00:00.000Z")}.abc`,
  );
  assert.equal(fbcFromAttribution({ fbclid: "abc" }), null);
  assert.equal(fbcFromAttribution({ at: "2026-11-06T00:00:00.000Z" }), null);
  assert.equal(fbcFromAttribution(null), null);
});
