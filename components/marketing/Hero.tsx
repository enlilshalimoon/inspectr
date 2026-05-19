import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
            Talk through the inspection.
            <br />
            Get the report drafted before you&apos;re back to your truck.
          </h1>
          <p className="text-lg text-slate-600 max-w-xl">
            Lookover turns your photos and voice notes into a draft inspection report while
            you&apos;re still on-site. You review, edit, and approve every finding on your
            laptop. Client gets a clean, branded report the same day — not at 11 p.m.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center px-6 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800"
            >
              Start 14-day free trial
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 items-center px-6 rounded-md border border-slate-300 bg-white text-slate-900 font-medium hover:bg-slate-50"
            >
              See how it works
            </Link>
          </div>
          <p className="text-xs text-slate-500 pt-1">
            No credit card. Up to 3 inspections during trial. Cancel from settings in one click.
          </p>
        </div>

        <div className="relative">
          <HeroVisualPlaceholder />
        </div>
      </div>
    </section>
  );
}

function HeroVisualPlaceholder() {
  return (
    <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] w-full rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-slate-200 shadow-xl">
      <div className="absolute inset-0 grid grid-rows-3 gap-2 p-3">
        <PhaseFrame label="1. Capture on the property" tone="bg-slate-800" />
        <PhaseFrame label="2. Lookover drafts the finding" tone="bg-slate-700" />
        <PhaseFrame label="3. Approve on your laptop" tone="bg-slate-600" />
      </div>
      <div className="absolute bottom-2 right-2 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-900/70 px-2 py-1 rounded">
        replace with product video / screenshots
      </div>
    </div>
  );
}

function PhaseFrame({ label, tone }: { label: string; tone: string }) {
  return (
    <div className={`${tone} rounded-lg flex items-center justify-center`}>
      <span className="text-xs sm:text-sm font-medium text-slate-200 tracking-wide">
        {label}
      </span>
    </div>
  );
}
