// POST /api/stripe/webhook
//
// Stripe webhook receiver. Verifies the signature against STRIPE_WEBHOOK_SECRET,
// then maps Stripe subscription lifecycle events onto users.subscription_status.
// Uses the service-role client (no user session) and is whitelisted as public in
// the auth middleware. Raw body is read via request.text() for signature verification.

import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function mapStatus(s: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  return "canceled"; // canceled / incomplete / incomplete_expired / paused
}

function customerIdOf(c: string | { id: string } | null | undefined): string | null {
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const customerId = customerIdOf(s.customer);
        const userId = s.metadata?.supabase_user_id;
        if (userId) {
          await admin
            .from("users")
            .update({
              subscription_status: "active",
              ...(customerId ? { stripe_customer_id: customerId } : {}),
            })
            .eq("id", userId);
        } else if (customerId) {
          await admin
            .from("users")
            .update({ subscription_status: "active" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = customerIdOf(sub.customer);
        if (customerId) {
          await admin
            .from("users")
            .update({ subscription_status: mapStatus(sub.status) })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = customerIdOf(sub.customer);
        if (customerId) {
          await admin
            .from("users")
            .update({ subscription_status: "canceled" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = customerIdOf(inv.customer);
        if (customerId) {
          await admin
            .from("users")
            .update({ subscription_status: "past_due" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        // Unhandled event types are fine — acknowledge so Stripe doesn't retry.
        break;
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err);
    // 500 tells Stripe to retry — appropriate for a transient DB failure.
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
