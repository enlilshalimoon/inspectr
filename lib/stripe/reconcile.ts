// Webhook-independent billing reconciliation.
//
// The Stripe webhook (/api/stripe/webhook) updates status in real time when it
// fires — but webhooks can silently fail (secret mismatch, event not selected,
// transient error). So the billing page ALSO confirms state directly with Stripe
// on load: if the user just returned from Checkout, or already has a Stripe
// customer, we fetch the live subscription and sync our DB. Self-healing.
//
// Returns a snapshot for the UI (plan, price, status, renewal) or null if there's
// nothing to reconcile (trial / comped users with no Stripe customer).

import { getStripe, PLANS } from "./server";
import { createServiceClient } from "@/lib/supabase/server";

type Status = "active" | "past_due" | "canceled";

export type BillingSnapshot = {
  status: Status;
  planLabel: string | null;
  amountCents: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
};

function mapStripeStatus(s: string): Status {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  return "canceled";
}

function planLabelForAmount(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  if (amount === PLANS.founding.amountCents) return PLANS.founding.label;
  if (amount === PLANS.standard.amountCents) return PLANS.standard.label;
  return null;
}

export async function reconcileBilling(
  userId: string,
  opts: { sessionId?: string | null; existingCustomerId?: string | null },
): Promise<BillingSnapshot | null> {
  if (!opts.sessionId && !opts.existingCustomerId) return null;

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return null; // not configured
  }

  const admin = createServiceClient();

  try {
    let customerId = opts.existingCustomerId ?? null;

    // Resolve the customer from the just-completed Checkout session if present.
    if (opts.sessionId) {
      const session = await stripe.checkout.sessions.retrieve(opts.sessionId);
      const cid =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (cid) customerId = cid;
    }
    if (!customerId) return null;

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });
    if (subs.data.length === 0) return null;

    const live =
      subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status)) ??
      subs.data[0];

    const status = mapStripeStatus(live.status);

    await admin
      .from("users")
      .update({ subscription_status: status, stripe_customer_id: customerId })
      .eq("id", userId);

    const item = live.items?.data?.[0];
    const amount = item?.price?.unit_amount ?? null;
    // current_period_end lives on the subscription in older API versions and on the
    // item in newer ones — read defensively across both.
    const periodEnd =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((live as any).current_period_end as number | undefined) ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((item as any)?.current_period_end as number | undefined) ??
      null;

    return {
      status,
      planLabel: planLabelForAmount(amount),
      amountCents: amount,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!live.cancel_at_period_end,
    };
  } catch (err) {
    console.error("[reconcileBilling] non-fatal:", err);
    return null;
  }
}
