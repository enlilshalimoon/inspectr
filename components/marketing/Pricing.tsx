import Link from "next/link";

type Tier = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
  badge?: string;
};

const tiers: Tier[] = [
  {
    name: "Founding",
    price: "$79",
    cadence: "/ month",
    blurb: "First 50 inspectors. Locked for life.",
    features: [
      "Unlimited inspections",
      "Unlimited photos and voice notes",
      "Branded PDFs and share links",
      "Email + SMS support",
    ],
    cta: { label: "Claim founding spot", href: "/signup?plan=founding" },
    badge: "Limited",
  },
  {
    name: "Standard",
    price: "$129",
    cadence: "/ month",
    blurb: "For solo inspectors and small shops.",
    features: [
      "Everything in Founding",
      "Priority support",
      "Custom report templates (coming)",
    ],
    cta: { label: "Start 14-day free trial", href: "/signup" },
    highlighted: true,
    badge: "Recommended",
  },
  {
    name: "Team",
    price: "$99",
    cadence: "/ seat / month",
    blurb: "2+ inspectors. Shared brand kit.",
    features: [
      "Everything in Standard",
      "Shared templates and disclaimers",
      "Team-wide branding",
    ],
    cta: { label: "Talk to us", href: "mailto:hello@uselookover.com?subject=Lookover%20Team%20Plan" },
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Simple pricing. No per-report fees.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`relative rounded-2xl p-6 flex flex-col ${
                tier.highlighted
                  ? "bg-slate-900 text-white ring-2 ring-slate-900 shadow-xl scale-[1.02]"
                  : "bg-white text-slate-900 ring-1 ring-slate-200"
              }`}
            >
              {tier.badge && (
                <span
                  className={`absolute -top-3 left-6 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tier.highlighted
                      ? "bg-orange-500 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tier.badge}
                </span>
              )}
              <h3
                className={`text-lg font-semibold ${
                  tier.highlighted ? "text-white" : "text-slate-900"
                }`}
              >
                {tier.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span
                  className={`text-4xl font-semibold ${
                    tier.highlighted ? "text-white" : "text-slate-900"
                  }`}
                >
                  {tier.price}
                </span>
                <span
                  className={`text-sm ${
                    tier.highlighted ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {tier.cadence}
                </span>
              </div>
              <p
                className={`mt-2 text-sm ${
                  tier.highlighted ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {tier.blurb}
              </p>
              <ul
                className={`mt-6 space-y-2 text-sm flex-1 ${
                  tier.highlighted ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span
                      className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${
                        tier.highlighted ? "bg-orange-400" : "bg-slate-400"
                      }`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.cta.href}
                className={`mt-8 inline-flex h-11 items-center justify-center px-5 rounded-md font-medium ${
                  tier.highlighted
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {tier.cta.label}
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-10 text-sm text-slate-500 max-w-3xl">
          No credit card to start. Cancel from settings in one click. We don&apos;t hold
          your data hostage — export your inspections to JSON any time.
        </p>
      </div>
    </section>
  );
}
