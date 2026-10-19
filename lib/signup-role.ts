// "What best describes you?" — the one self-identification question on signup.
//
// Stored on user_metadata.role. It exists so the Meta ad optimizes toward real
// inspectors: only inspector roles fire the CompleteRegistration pixel event (the ad
// set's optimization goal); everyone else fires a custom NonInspectorSignup event
// that Meta doesn't learn from. Non-inspectors still get an account, but they're
// shown a "built for inspectors" note and skipped by the automatic founder emails.
//
// Accounts created before 2026-10-18 have no role: /admin shows "—" and they're
// treated exactly as before (nudged, counted as signups).

export const SIGNUP_ROLES = [
  "licensed_inspector",
  "inspector_in_training",
  "real_estate_agent",
  "homeowner_or_buyer",
  "other",
] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export const SIGNUP_ROLE_LABELS: Record<SignupRole, string> = {
  licensed_inspector: "Licensed home inspector",
  inspector_in_training: "Inspector in training",
  real_estate_agent: "Real estate agent",
  homeowner_or_buyer: "Homeowner or buyer",
  other: "Other",
};

const INSPECTOR_ROLES: ReadonlySet<SignupRole> = new Set(["licensed_inspector", "inspector_in_training"]);

export function isSignupRole(v: unknown): v is SignupRole {
  return typeof v === "string" && (SIGNUP_ROLES as readonly string[]).includes(v);
}

export function isInspectorRole(role: SignupRole): boolean {
  return INSPECTOR_ROLES.has(role);
}

// Role from auth user_metadata; null for pre-role accounts (or anything malformed).
export function roleFromMetadata(meta: Record<string, unknown> | null | undefined): SignupRole | null {
  const v = meta?.role;
  return isSignupRole(v) ? v : null;
}

// True only for accounts that told us they're NOT an inspector. Pre-role accounts
// (null) are false, so they keep the old behavior.
export function isKnownNonInspector(role: SignupRole | null): boolean {
  return role !== null && !isInspectorRole(role);
}

export const NON_INSPECTOR_PIXEL_EVENT = "NonInspectorSignup";

// Which Meta pixel event a completed signup fires. Inspector roles get the standard
// CompleteRegistration (what the ad set optimizes for); everyone else gets a custom
// event so Meta stops learning from them. A missing role is treated as non-inspector
// so a bug can never feed bad signups to the optimizer.
export function registrationPixelEvent(
  role: SignupRole | null | undefined,
): { method: "track" | "trackCustom"; name: string } {
  return role && isInspectorRole(role)
    ? { method: "track", name: "CompleteRegistration" }
    : { method: "trackCustom", name: NON_INSPECTOR_PIXEL_EVENT };
}
