"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe, priceIdFor, type PlanKey } from "@/lib/stripe/server";

async function appOrigin(): Promise<string> {
  const h = await headers();
  return (
    h.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://www.uselookover.com"
  );
}

// Start a Stripe Checkout subscription for the given plan. Creates/reuses the
// Stripe customer, stores its id, then redirects the browser to Stripe.
export async function startCheckout(plan: PlanKey): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id, full_name")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  const base = await appOrigin();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    success_url: `${base}/billing?checkout=success`,
    cancel_url: `${base}/billing?checkout=canceled`,
    allow_promotion_codes: true,
    subscription_data: { metadata: { supabase_user_id: user.id, plan } },
    metadata: { supabase_user_id: user.id, plan },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(session.url);
}

// Open the Stripe Customer Portal so the user can update card / cancel / view invoices.
export async function openBillingPortal(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) redirect("/billing");

  const stripe = getStripe();
  const base = await appOrigin();
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${base}/billing`,
  });
  redirect(portal.url);
}

// Thin form-action wrappers (forms can't pass args directly to the typed actions).
export async function checkoutFounding(): Promise<void> {
  await startCheckout("founding");
}
export async function checkoutStandard(): Promise<void> {
  await startCheckout("standard");
}
