import Link from "next/link";

export function FinalCta() {
  return (
    <section className="bg-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Get your next report drafted before you leave the driveway.
        </h2>
        <p className="text-lg text-slate-300">
          14-day free trial. No credit card. Up to 3 inspections.
        </p>
        <div className="pt-2">
          <Link
            href="/signup"
            className="inline-flex h-14 items-center px-8 rounded-md bg-orange-500 text-white font-medium text-base hover:bg-orange-600"
          >
            Start free trial
          </Link>
        </div>
        {/* Uncomment once we have real beta numbers:
        <p className="text-sm text-slate-400 pt-2">
          Used by [N] inspectors across [N] states.
        </p>
        */}
      </div>
    </section>
  );
}
