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

export const PLANS: Record<PlanKey, { label: string; price: string; blurb: string }> = {
  founding: {
    label: "Founding",
    price: "$79/mo",
    blurb: "Locked for life — never goes up, even when the standard price does. First 50 only.",
  },
  standard: {
    label: "Standard",
    price: "$129/mo",
    blurb: "Full access. Cancel anytime.",
  },
};

export function priceIdFor(plan: PlanKey): string {
  const id =
    plan === "founding"
      ? process.env.STRIPE_PRICE_FOUNDING
      : process.env.STRIPE_PRICE_SOLO;
  if (!id) throw new Error(`Missing Stripe price id env for plan "${plan}"`);
  return id;
}
