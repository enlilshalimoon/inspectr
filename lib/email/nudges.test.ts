// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideFounderEmail, type InspectionProgress, type InspectorState } from "./nudges";

const NOW = Date.parse("2026-10-15T16:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function insp(over: Partial<InspectionProgress> = {}): InspectionProgress {
  return {
    id: "i1",
    address: "12 Oak St",
    createdAt: hoursAgo(30),
    photoCount: 0,
    lastPhotoAt: null,
    findingCount: 0,
    approvedCount: 0,
    lastFindingAt: null,
    finalizedAt: null,
    deliveredAt: null,
    ...over,
  };
}

function state(over: Partial<InspectorState> = {}): InspectorState {
  return {
    signupAt: hoursAgo(30),
    onboardedAt: hoursAgo(29),
    inspections: [],
    appMetadata: {},
    ...over,
  };
}

const decide = (s: InspectorState) => decideFounderEmail(s, NOW);

test("onboarded, no inspection after 24h → no_inspection nudge", () => {
  assert.deepEqual(decide(state()), { action: "nudge", stage: "no_inspection", inspection: null });
});

test("onboarded under 24h ago → nothing yet", () => {
  assert.equal(decide(state({ signupAt: hoursAgo(10), onboardedAt: hoursAgo(9) })).action, "skip");
});

test("not onboarded at 3 days → onboarding_incomplete check-in", () => {
  assert.deepEqual(decide(state({ signupAt: hoursAgo(72), onboardedAt: null })), {
    action: "checkin",
    variant: "onboarding_incomplete",
  });
});

test("inspection with 0 photos for 24h → no_photos", () => {
  const d = decide(state({ inspections: [insp({ createdAt: hoursAgo(25) })] }));
  assert.equal(d.action === "nudge" && d.stage, "no_photos");
});

test("recent activity restarts the stall clock", () => {
  const d = decide(
    state({
      inspections: [
        insp({ photoCount: 3, lastPhotoAt: hoursAgo(2), findingCount: 3, lastFindingAt: hoursAgo(2) }),
      ],
    }),
  );
  assert.equal(d.action, "skip");
});

test("findings drafted, none approved → no_approvals", () => {
  const d = decide(
    state({ inspections: [insp({ photoCount: 2, lastPhotoAt: hoursAgo(26), findingCount: 2, lastFindingAt: hoursAgo(26) })] }),
  );
  assert.equal(d.action === "nudge" && d.stage, "no_approvals");
});

test("approved but not delivered → not_delivered", () => {
  const d = decide(
    state({
      inspections: [
        insp({ photoCount: 2, findingCount: 2, approvedCount: 1, lastFindingAt: hoursAgo(25) }),
      ],
    }),
  );
  assert.equal(d.action === "nudge" && d.stage, "not_delivered");
});

test("delivered report → no more nudges", () => {
  const d = decide(
    state({
      signupAt: hoursAgo(200),
      inspections: [insp({ photoCount: 2, findingCount: 2, approvedCount: 2, finalizedAt: hoursAgo(150), deliveredAt: hoursAgo(149) })],
    }),
  );
  assert.equal(d.action, "skip");
});

test("never sends the same stage twice", () => {
  const d = decide(state({ signupAt: hoursAgo(100), appMetadata: { nudges_sent: { no_inspection: hoursAgo(70) }, founder_checkin_sent_at: hoursAgo(60) } }));
  assert.equal(d.action, "skip");
});

test("48h gap: a new stage waits if the last nudge was <48h ago", () => {
  const d = decide(
    state({
      signupAt: hoursAgo(60),
      inspections: [insp({ createdAt: hoursAgo(30) })],
      appMetadata: { nudges_sent: { no_inspection: hoursAgo(36) } },
    }),
  );
  assert.deepEqual(d, { action: "skip", reason: "wait-48h:no_photos" });
});

test("48h gap passed → next stage goes out", () => {
  const d = decide(
    state({
      signupAt: hoursAgo(80),
      inspections: [insp({ createdAt: hoursAgo(30) })],
      appMetadata: { nudges_sent: { no_inspection: hoursAgo(50) } },
    }),
  );
  assert.equal(d.action === "nudge" && d.stage, "no_photos");
});

test("check-in waits 48h after a nudge, never same day", () => {
  // Not onboarded → no stage; nudge-free but the /admin follow-up went out yesterday.
  const d = decide(state({ signupAt: hoursAgo(72), onboardedAt: null, appMetadata: { followup_sent_at: hoursAgo(20) } }));
  assert.deepEqual(d, { action: "skip", reason: "wait-48h:checkin" });
});

test("no_inspection check-in is covered by the no_inspection nudge", () => {
  const d = decide(state({ signupAt: hoursAgo(72), appMetadata: { nudges_sent: { no_inspection: hoursAgo(50) } } }));
  assert.deepEqual(d, { action: "skip", reason: "checkin:covered-by-nudge", markCheckinDone: true });
});

test("first-report feedback email (at finalize) counts toward the 48h gap", () => {
  const d = decide(
    state({
      inspections: [insp({ photoCount: 2, findingCount: 2, approvedCount: 2, lastFindingAt: hoursAgo(40), finalizedAt: hoursAgo(30) })],
    }),
  );
  assert.deepEqual(d, { action: "skip", reason: "wait-48h:not_delivered" });
});

test("signups older than 14 days get no nudges", () => {
  const d = decide(state({ signupAt: hoursAgo(15 * 24), onboardedAt: hoursAgo(15 * 24) }));
  assert.equal(d.action, "skip");
});

test("nudge copy follows the email rules", async () => {
  const { founderNudgeEmail } = await import("./send");
  const { NUDGE_STAGES } = await import("./nudges");
  for (const stage of NUDGE_STAGES) {
    for (const addr of ["12 Oak St", null]) {
      const m = founderNudgeEmail({ stage, firstName: "Kristy Moya", propertyAddress: addr });
      assert.doesNotMatch(m.subject, /^ai\b/i, stage);
      assert.doesNotMatch(m.text, /free for life|\$\d/i, stage);
      assert.match(m.text, /^Hey Kristy,/);
      assert.match(m.text, /reply/i);
      assert.match(m.text, /15[- ]min/);
      const body = m.text.split("\n\n").slice(1, -1).join(" ");
      const sentences = body.split(/(?<=[.?!])\s+/).length;
      assert.ok(sentences >= 3 && sentences <= 5, `${stage}: ${sentences} sentences`);
    }
  }
});
