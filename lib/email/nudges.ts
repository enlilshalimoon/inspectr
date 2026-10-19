// Founder-email scheduling for the daily cron (app/api/cron/founder-checkin).
//
// Pure decision logic, no I/O, so it can be unit-tested and dry-run: given one
// inspector's progress and what we've already emailed them, decide whether today's
// run sends a stage nudge, the 2-5 day check-in, or nothing.
//
// Stage nudges fire when an inspector stalls for 24h at one step of the funnel:
//   no_inspection  — onboarded, no inspection yet
//   no_photos      — inspection started, 0 photos
//   no_approvals   — findings drafted, none approved
//   not_delivered  — findings approved, report not sent to the client
// Each stage is sent at most once per user (app_metadata.nudges_sent[stage]), and no
// founder email of any kind goes out within 48h of the previous one.
//
// Signups who said they're not an inspector (user_metadata.role, lib/signup-role.ts)
// get none of these automatic emails, nudge or check-in. Accounts from before the
// role question (role null) are unaffected.

import type { CheckinVariant } from "@/lib/email/send";
import { isKnownNonInspector, type SignupRole } from "@/lib/signup-role";

export const NUDGE_STAGES = [
  "no_inspection",
  "no_photos",
  "no_approvals",
  "not_delivered",
] as const;
export type NudgeStage = (typeof NUDGE_STAGES)[number];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
export const STALL_MS = 24 * HOUR_MS; // stuck this long at a step → nudge
export const MIN_GAP_MS = 48 * HOUR_MS; // at most one founder email per 48h
export const NUDGE_WINDOW_MS = 14 * DAY_MS; // only nudge recent signups (no back-catalog)
export const CHECKIN_MIN_MS = 2 * DAY_MS;
export const CHECKIN_MAX_MS = 5 * DAY_MS;

export type InspectionProgress = {
  id: string;
  address: string | null;
  createdAt: string;
  photoCount: number;
  lastPhotoAt: string | null;
  findingCount: number;
  approvedCount: number;
  lastFindingAt: string | null; // max(findings.updated_at)
  finalizedAt: string | null;
  deliveredAt: string | null;
};

export type InspectorState = {
  signupAt: string;
  onboardedAt: string | null;
  inspections: InspectionProgress[];
  appMetadata: Record<string, unknown>;
  role?: SignupRole | null; // null/absent = signed up before the role question
};

export type FounderEmailDecision =
  | { action: "nudge"; stage: NudgeStage; inspection: InspectionProgress | null }
  | { action: "checkin"; variant: CheckinVariant }
  | { action: "skip"; reason: string; markCheckinDone?: boolean };

export function nudgesSent(appMeta: Record<string, unknown>): Partial<Record<NudgeStage, string>> {
  const v = appMeta.nudges_sent;
  return v && typeof v === "object" ? (v as Partial<Record<NudgeStage, string>>) : {};
}

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) || 0 : 0);

// Most recent founder email we know about: the check-in, the /admin follow-up, any
// stage nudge, and the first-report feedback email (sent at finalize time, not
// recorded in metadata, so we use the earliest finalized_at as its timestamp).
export function lastFounderEmailAt(s: InspectorState): number {
  const meta = s.appMetadata;
  const finalized = s.inspections.map((i) => ms(i.finalizedAt)).filter(Boolean);
  return Math.max(
    0,
    ms(meta.founder_checkin_sent_at as string | undefined),
    ms(meta.followup_sent_at as string | undefined),
    ...Object.values(nudgesSent(meta)).map((v) => ms(v)),
    finalized.length ? Math.min(...finalized) : 0,
  );
}

// Where the inspector is stuck right now, and since when. Uses their latest
// inspection (the one they're working on); null once a report has been delivered.
export function currentStage(
  s: InspectorState,
): { stage: NudgeStage; since: number; inspection: InspectionProgress | null } | null {
  if (s.inspections.some((i) => i.deliveredAt)) return null;
  if (s.inspections.length === 0) {
    if (!s.onboardedAt) return null; // the check-in's onboarding_incomplete covers this
    return { stage: "no_inspection", since: Math.max(ms(s.signupAt), ms(s.onboardedAt)), inspection: null };
  }
  const latest = [...s.inspections].sort((a, b) => ms(b.createdAt) - ms(a.createdAt))[0];
  // Any activity on the inspection restarts the stall clock.
  const since = Math.max(
    ms(latest.createdAt),
    ms(latest.lastPhotoAt),
    ms(latest.lastFindingAt),
    ms(latest.finalizedAt),
  );
  if (latest.photoCount === 0) return { stage: "no_photos", since, inspection: latest };
  // Photos in but nothing drafted (drafting failed or still running): no nudge copy
  // fits, so leave it to the founder's /admin view.
  if (latest.findingCount === 0) return null;
  if (latest.approvedCount === 0) return { stage: "no_approvals", since, inspection: latest };
  return { stage: "not_delivered", since, inspection: latest };
}

export function decideFounderEmail(s: InspectorState, now: number): FounderEmailDecision {
  if (isKnownNonInspector(s.role ?? null)) return { action: "skip", reason: "non-inspector" };

  const age = now - ms(s.signupAt);
  const sent = nudgesSent(s.appMetadata);
  const recent = now - lastFounderEmailAt(s) < MIN_GAP_MS;

  // 1. Stage nudge: more specific than the check-in, so it wins.
  const cur = currentStage(s);
  const stageDue =
    cur && age <= NUDGE_WINDOW_MS && now - cur.since >= STALL_MS && !sent[cur.stage];
  if (stageDue) {
    if (recent) return { action: "skip", reason: `wait-48h:${cur.stage}` };
    return { action: "nudge", stage: cur.stage, inspection: cur.inspection };
  }

  // 2. The original 2-5 day check-in, for inspectors who haven't started an
  //    inspection (anyone further along is covered by the stage nudges and the
  //    first-report feedback email).
  if (s.appMetadata.founder_checkin_sent_at) return { action: "skip", reason: "no-stage-due" };
  if (age < CHECKIN_MIN_MS || age > CHECKIN_MAX_MS) return { action: "skip", reason: "no-stage-due" };
  if (s.inspections.length > 0) {
    return { action: "skip", reason: "checkin:has-inspection", markCheckinDone: true };
  }
  const variant: CheckinVariant = s.onboardedAt ? "no_inspection" : "onboarding_incomplete";
  // The no_inspection nudge already said what the no_inspection check-in says.
  if (variant === "no_inspection" && sent.no_inspection) {
    return { action: "skip", reason: "checkin:covered-by-nudge", markCheckinDone: true };
  }
  if (recent) return { action: "skip", reason: "wait-48h:checkin" };
  return { action: "checkin", variant };
}
