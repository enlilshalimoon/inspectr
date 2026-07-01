// /spectora — comparison landing page for the "Spectora Switchers" ad campaign.
// Cold traffic from Meta ads targeting Spectora users lands here (not on /), because
// comparison pages convert 2-3x higher for B2B SaaS when the visitor already knows
// the incumbent. Copy follows OFFER-POLICY.md: $79 founding for first 50, 14-day
// trial, no card. Never dangles free-for-life to cold traffic.

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Lookover vs Spectora — honest comparison",
  description:
    "If your report software still makes you type every finding, it's 2018 software in 2026. See how Lookover compares to Spectora — 30 minutes per report instead of 3 hours of typing.",
};

type Row = {
  feature: string;
  spectora: string;
  lookover: string;
  lookoverWins?: boolean;
};

const COMPARISON: Row[] = [
  {
    feature: "How findings get drafted",
    spectora:
      "You type every finding into templates or dropdowns. AI polishes wording after.",
    lookover:
      "Photo + voice note in the field → SOP-language draft appears before you leave the property.",
    lookoverWins: true,
  },
  {
    feature: "Time per report (average)",
    spectora: "2–4 hours of typing after the walkthrough",
    lookover: "~30 min reviewing and approving drafts",
    lookoverWins: true,
  },
  {
    feature: "Mobile capture",
    spectora: "Templates + typing on phone. Voice-to-text into fields.",
    lookover:
      "Photo + hold-to-talk voice note per item. Nothing to type on-site.",
    lookoverWins: true,
  },
  {
    feature: "Desktop review",
    spectora: "Full editor. Inline edit, severity, photo reorder.",
    lookover: "Same. Plus bulk-approve routine findings.",
  },
  {
    feature: "Report delivery",
    spectora: "Branded PDF + client portal",
    lookover: "Branded PDF + mobile-friendly share link (no portal login)",
  },
  {
    feature: "Standards alignment",
    spectora: "InterNACHI SOP templates included",
    lookover:
      "InterNACHI SOP-aligned language. 86% benchmark accuracy on a 29-case test set, before your review.",
  },
  {
    feature: "You approve every finding",
    spectora: "Yes",
    lookover: "Yes — nothing is delivered without your explicit sign-off",
  },
  {
    feature: "Offline capture",
    spectora: "Partial",
    lookover: "Photos and voice queue locally, sync when back on service",
  },
  {
    feature: "Data export",
    spectora: "Available on request",
    lookover: "One click, any time, JSON + original media. Your data is yours.",
    lookoverWins: true,
  },
  {
    feature: "Starting price",
    spectora: "$99–199/mo depending on tier",
    lookover: "$79/mo founding price locked for life (first 50 inspectors)",
    lookoverWins: true,
  },
  {
    feature: "Contract",
    spectora: "Monthly, cancel anytime",
    lookover: "Monthly, cancel from settings in one click",
  },
  {
    feature: "AI approach",
    spectora: "Writing assistant that polishes what you typed",
    lookover:
      "Vision + voice → drafts the finding from what you saw, not what you typed",
    lookoverWins: true,
  },
];

export default function SpectoraComparisonPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-slate-50 border-b border-slate-200">
          <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20 text-center space-y-6">
            <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
              Lookover vs Spectora
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
              If your report software still makes you type every finding,
              <br />
              it&apos;s 2018 software in 2026.
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Spectora added an AI writing assistant. It polishes wording after you type.
              Lookover drafts the whole finding from your photo and voice note before you
              leave the property. Different category.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/signup?utm_source=comparison&utm_content=spectora"
                className="inline-flex h-12 items-center px-6 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800"
              >
                Start 14-day free trial
              </Link>
              <Link
                href="/sample"
                className="inline-flex h-12 items-center px-6 rounded-md border border-slate-300 bg-white text-slate-900 font-medium hover:bg-slate-50"
              >
                See a sample report
              </Link>
            </div>
            <p className="text-xs text-slate-500 pt-1">
              No credit card. First 50 inspectors lock in $79/mo founding pricing for life.
            </p>
          </div>
        </section>

        {/* The one thing that matters */}
        <section className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-4xl px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
                The one thing that matters
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                Where the finding is written.
              </h2>
              <p className="text-lg text-slate-600">
                Every inspection report tool eventually gets you to the same output:
                branded PDF, findings by section, severity ratings, delivery link.
                What matters is <span className="font-semibold text-slate-900">where the finding is written</span>.
              </p>
              <p className="text-lg text-slate-600">
                In Spectora, the finding is written by <em>you</em>, typing after you get
                home. Their AI adds polish. That means the 3 hours of report writing is
                still 3 hours of report writing — with a spellchecker.
              </p>
              <p className="text-lg text-slate-600">
                In Lookover, the finding is drafted by AI from your on-site photo and
                voice note, in standard InterNACHI SOP language. When you sit down, the
                report is mostly written. You review, edit, approve. That&apos;s the
                whole delta — and it&apos;s 2.5 hours per inspection.
              </p>
            </div>
            <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-slate-100">
              <Image
                src="/marketing/phone-utility-room.webp"
                alt="Inspector holding a phone in a basement utility room showing a drafted water heater finding, with the actual water heater visible behind"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section id="compare" className="bg-slate-50 border-b border-slate-200">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <div className="max-w-3xl mb-10">
              <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
                Feature-by-feature
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                The honest comparison.
              </h2>
              <p className="mt-3 text-lg text-slate-600">
                Both tools are good at what they were built to do. This table is where
                they differ — and where you decide whether the difference is worth
                switching.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200 bg-white">
              <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr] bg-slate-100 border-b border-slate-200 text-sm font-medium text-slate-500 uppercase tracking-wider">
                <div className="px-5 py-3">Feature</div>
                <div className="px-5 py-3 border-l border-slate-200">Spectora</div>
                <div className="px-5 py-3 border-l border-slate-200 text-slate-900 flex items-center gap-2">
                  Lookover
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-semibold normal-case tracking-normal">
                    You are here
                  </span>
                </div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] ${
                    i > 0 ? "border-t border-slate-200" : ""
                  }`}
                >
                  <div className="px-5 py-4 sm:py-5 font-medium text-slate-900 bg-slate-50 sm:bg-transparent">
                    {row.feature}
                  </div>
                  <div className="px-5 py-4 sm:py-5 text-sm text-slate-600 sm:border-l sm:border-slate-200 border-t border-slate-100 sm:border-t-0">
                    <span className="sm:hidden text-xs uppercase tracking-wider text-slate-400 block mb-1">
                      Spectora
                    </span>
                    {row.spectora}
                  </div>
                  <div
                    className={`px-5 py-4 sm:py-5 text-sm sm:border-l sm:border-slate-200 border-t border-slate-100 sm:border-t-0 ${
                      row.lookoverWins ? "bg-orange-50/50" : ""
                    }`}
                  >
                    <span className="sm:hidden text-xs uppercase tracking-wider text-slate-400 block mb-1">
                      Lookover
                    </span>
                    <span
                      className={
                        row.lookoverWins
                          ? "text-slate-900 font-medium"
                          : "text-slate-600"
                      }
                    >
                      {row.lookover}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-slate-500 max-w-3xl">
              Comparison based on publicly available information as of{" "}
              {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })} and
              inspector feedback. Spectora is a great tool that many inspectors are happy
              with — this page is for the inspectors who feel like report writing still
              takes too long.
            </p>
          </div>
        </section>

        {/* Switching cost objection */}
        <section className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-3xl px-6 py-16 space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
                &ldquo;But I already have Spectora set up.&rdquo;
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                Try Lookover on your next inspection. Keep Spectora running.
              </h2>
            </div>
            <p className="text-lg text-slate-600">
              You don&apos;t have to cancel anything to try this. Sign up, use Lookover
              for one inspection, ship the report to your client, then decide. If it
              saved you two hours, cancel Spectora. If it didn&apos;t, cancel Lookover.
              14-day trial, no card.
            </p>
            <div className="bg-slate-50 rounded-xl ring-1 ring-slate-200 p-6 space-y-3">
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Migration
              </p>
              <p className="text-slate-600">
                Bring your existing report templates as PDF or DOCX and we&apos;ll import
                the disclaimer, cover page, and section structure. Custom branding
                (logo, colors, contact block) transfers in about 5 minutes from your
                Settings page.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-slate-900">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Get your next report drafted before you leave the driveway.
            </h2>
            <p className="text-lg text-slate-300">
              14-day free trial. No credit card. First 50 inspectors lock in $79/mo
              founding pricing for life.
            </p>
            <div className="pt-2">
              <Link
                href="/signup?utm_source=comparison&utm_content=spectora"
                className="inline-flex h-14 items-center px-8 rounded-md bg-orange-500 text-white font-medium text-base hover:bg-orange-600"
              >
                Start free trial
              </Link>
            </div>
            <p className="text-sm text-slate-400 pt-2">
              Or{" "}
              <Link href="/sample" className="underline underline-offset-2 hover:text-white">
                see a sample report first
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
