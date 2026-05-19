import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-xl bg-slate-100">
          <Image
            src="/marketing/hero-capture-draft-done.webp"
            alt="A home inspector holding a phone showing the Lookover app capturing a water heater finding, with the slogan Capture. Draft. Done."
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1152px"
            className="object-cover"
          />
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
            No credit card. Up to 3 inspections during trial. Cancel from settings in one click.
          </p>
        </div>
      </div>
    </section>
  );
}
