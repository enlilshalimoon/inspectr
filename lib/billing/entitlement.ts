// Shared entitlement logic — used by middleware (gating), the billing page, and
// the admin dashboard. Pure module, safe to import anywhere (incl. edge middleware).

export type EntitlementInput = {
  subscription_status: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
};

// Can this user access the product right now?
//  - active / past_due  → yes (past_due = payment-retry grace period)
//  - trial within window → yes
//  - everything else (trial expired, canceled) → no
//
// Comped design partners (free for life) are stored as status 'active' with NO
// stripe_customer_id — they're covered by the 'active' branch below.
export function isEntitled(u: EntitlementInput, now: Date = new Date()): boolean {
  const s = u.subscription_status;
  if (s === "active" || s === "past_due") return true;
  if (s === "trial" && u.trial_ends_at && new Date(u.trial_ends_at).getTime() > now.getTime())
    return true;
  return false;
}

// A real paying customer = active subscription backed by a Stripe customer.
// Distinguishes payers from comped design partners (active, no customer).
export function isPaying(u: EntitlementInput): boolean {
  return u.subscription_status === "active" && !!u.stripe_customer_id;
}

// A comped design partner = active access with no Stripe customer attached.
export function isComped(u: EntitlementInput): boolean {
  return u.subscription_status === "active" && !u.stripe_customer_id;
}

export function trialDaysLeft(trial_ends_at: string | null, now: Date = new Date()): number | null {
  if (!trial_ends_at) return null;
  const ms = new Date(trial_ends_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
