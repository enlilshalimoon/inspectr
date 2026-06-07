import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/stripe/server";
import {
  isEntitled,
  isPaying,
  isComped,
  trialDaysLeft,
  type EntitlementInput,
} from "@/lib/billing/entitlement";
import { checkoutFounding, checkoutStandard, openBillingPortal } from "./actions";
import { reconcileBilling } from "@/lib/stripe/reconcile";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const { checkout, session_id } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("users")
    .select("subscription_status, trial_ends_at, stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Self-heal: confirm subscription state directly with Stripe (covers webhook
  // failures). Only does anything when returning from Checkout or for an existing
  // Stripe customer — trial/comped users with no customer skip the Stripe call.
  const snapshot = await reconcileBilling(user.id, {
    sessionId: session_id ?? null,
    existingCustomerId: profile?.stripe_customer_id ?? null,
  });
  if (snapshot) {
    // re-read the row we just updated so the UI reflects the synced status
    const { data: fresh } = await supabase
      .from("users")
      .select("subscription_status, trial_ends_at, stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (fresh) profile = fresh;
  }

  const ent: EntitlementInput = {
    subscription_status: profile?.subscription_status ?? null,
    trial_ends_at: profile?.trial_ends_at ?? null,
    stripe_customer_id: profile?.stripe_customer_id ?? null,
  };

  const entitled = isEntitled(ent);
  const paying = isPaying(ent);
  const comped = isComped(ent);
  const daysLeft = trialDaysLeft(ent.trial_ends_at);
  const onTrial = ent.subscription_status === "trial";

  const planName = snapshot?.planLabel ?? null;
  const planPrice =
    snapshot?.amountCents != null ? `$${(snapshot.amountCents / 100).toFixed(0)}/mo` : null;
  const renewLabel =
    snapshot?.currentPeriodEnd != null
      ? `${snapshot.cancelAtPeriodEnd ? "Ends" : "Renews"} ${new Date(
          snapshot.currentPeriodEnd * 1000,
        ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-500">Your plan and payment method.</p>
      </div>

      {checkout === "success" && (
        <Banner kind="success">
          Payment received — you&apos;re all set. If your status below still says
          &ldquo;trial,&rdquo; give it a few seconds and refresh.
        </Banner>
      )}
      {checkout === "canceled" && (
        <Banner kind="muted">Checkout canceled — no charge was made.</Banner>
      )}

      {/* Comped design partner */}
      {comped && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <StatusRow label="Founding design partner" tone="green" />
            <p className="text-sm text-slate-600">
              You&apos;re one of the founding inspectors — free for life. No payment
              needed, ever. Thank you for being early.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Paying subscriber */}
      {paying && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <StatusRow
              label={
                ent.subscription_status === "past_due"
                  ? "Payment needs attention"
                  : "Subscribed"
              }
              tone={ent.subscription_status === "past_due" ? "amber" : "green"}
            />

            {/* Plan summary */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">
                  {planName ? `${planName} plan` : "Your plan"}
                </div>
                {renewLabel && (
                  <div className="text-xs text-slate-500 mt-0.5">{renewLabel}</div>
                )}
              </div>
              {planPrice && (
                <div className="text-lg font-semibold text-slate-900">{planPrice}</div>
              )}
            </div>

            <p className="text-sm text-slate-600">
              {ent.subscription_status === "past_due"
                ? "Your last payment didn't go through. Update your card to keep your account active."
                : "Manage your card, view invoices, or cancel anytime."}
            </p>
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline">
                Manage billing
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Trial or lapsed — show plans */}
      {!comped && !paying && (
        <>
          <Card>
            <CardContent className="p-6">
              {onTrial && entitled ? (
                <StatusRow
                  label={`Free trial — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                  tone="blue"
                />
              ) : (
                <StatusRow label="Trial ended — choose a plan to continue" tone="amber" />
              )}
              <p className="text-sm text-slate-600 mt-2">
                {onTrial && entitled
                  ? "No card needed during your trial. Lock in founding pricing whenever you're ready — it never goes up."
                  : "Pick a plan to get back to your inspections. 30-day money-back, cancel anytime."}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PlanCard
              name={PLANS.founding.label}
              price={PLANS.founding.price}
              blurb={PLANS.founding.blurb}
              action={checkoutFounding}
              cta="Lock in founding price"
              highlight
            />
            <PlanCard
              name={PLANS.standard.label}
              price={PLANS.standard.price}
              blurb={PLANS.standard.blurb}
              action={checkoutStandard}
              cta="Choose standard"
            />
          </div>

          {ent.stripe_customer_id && (
            <form action={openBillingPortal}>
              <Button type="submit" variant="link" className="px-0">
                Manage existing billing →
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function PlanCard({
  name,
  price,
  blurb,
  action,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  blurb: string;
  action: () => Promise<void>;
  cta: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-orange-300 ring-1 ring-orange-200" : undefined}>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-slate-900">{name}</span>
          <span className="text-lg font-semibold text-slate-900">{price}</span>
        </div>
        <p className="text-sm text-slate-600 min-h-[3rem]">{blurb}</p>
        <form action={action}>
          <Button type="submit" className="w-full" variant={highlight ? "default" : "outline"}>
            {cta}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function StatusRow({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "blue" | "amber";
}) {
  const dot =
    tone === "green" ? "bg-green-500" : tone === "blue" ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      <span className="font-medium text-slate-900">{label}</span>
    </div>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: "success" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    kind === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-slate-50 border-slate-200 text-slate-600";
  return (
    <div className={`rounded-lg border p-4 text-sm ${cls}`}>{children}</div>
  );
}
