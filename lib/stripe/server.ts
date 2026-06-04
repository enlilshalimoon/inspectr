// Server-only Stripe client + plan config. Never import from client components.
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // apiVersion omitted on purpose — use the SDK's pinned default so we don't
  // drift from the installed stripe-node types.
  _stripe = new Stripe(key);
  return _stripe;
}

export type PlanKey = "founding" | "standard";

// Plan config drives both the billing-page display AND the Checkout line item.
// amountCents is the monthly price. We build the Stripe price inline (price_data)
// at checkout time, so there are NO Stripe price IDs to create or copy — the only
// Stripe setup is the secret key + webhook secret.
export const PLANS: Record<
  PlanKey,
  { label: string; price: string; blurb: string; amountCents: number; productName: string }
> = {
  founding: {
    label: "Founding",
    price: "$79/mo",
    blurb: "Locked for life — never goes up, even when the standard price does. First 50 only.",
    amountCents: 7900,
    productName: "Lookover — Founding ($79/mo, locked for life)",
  },
  standard: {
    label: "Standard",
    price: "$129/mo",
    blurb: "Full access. Cancel anytime.",
    amountCents: 12900,
    productName: "Lookover — Standard",
  },
};

// Build the Checkout line item for a plan using inline price_data (no pre-made price IDs).
export function lineItemFor(plan: PlanKey) {
  const p = PLANS[plan];
  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: p.amountCents,
      recurring: { interval: "month" as const },
      product_data: { name: p.productName },
    },
  };
}
