import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-xl bg-slate-100">
          {/* Muted autoplay loop; poster is the static hero so LCP paints instantly
              and no-JS / reduced-motion users still see the composed frame. */}
          <video
            className="absolute inset-0 h-full w-full object-cover"
            poster="/marketing/hero-capture-draft-done.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            aria-label="Lookover: capture a finding on your phone, draft the report, done."
          >
            <source src="/marketing/hero-loop-web.webm" type="video/webm" />
            <source src="/marketing/hero-loop-web.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="mx-auto max-w-3xl text-center space-y-6 mt-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
            Talk through the inspection.
            <br />
            Get the report drafted before you&apos;re back to your truck.
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Lookover turns your photos and voice notes into a draft inspection report
            while you&apos;re still on-site. You review, edit, and approve every finding
            on your laptop. Client gets a clean, branded report the same day — not at
            11 p.m.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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
            No credit card. Up to 3 inspections during trial. Cancel anytime in one click.
          </p>
        </div>
      </div>
    </section>
  );
}
