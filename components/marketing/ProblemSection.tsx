export function ProblemSection() {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-5">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            You finished the inspection three hours ago. You&apos;re still typing.
          </h2>
          <p className="text-lg text-slate-600">
            Every inspection is two jobs. The walkthrough — which you&apos;re good at — and the
            report — which eats your evening.
          </p>
          <p className="text-lg text-slate-600">
            By the time you get home, you&apos;ve got 80 photos, a notebook full of shorthand,
            and a client who wants the report tomorrow morning. So you type. Until midnight.
            And the next day you do it again.
          </p>
          <p className="text-lg text-slate-600">
            Most inspectors quietly cap their week at 8 inspections because the reporting
            won&apos;t stretch any further. That cap is the ceiling on your income.
          </p>
        </div>
        <ProblemVisualPlaceholder />
      </div>
    </section>
  );
}

function ProblemVisualPlaceholder() {
  return (
    <div className="relative aspect-[4/3] w-full rounded-2xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center">
      <div className="text-center px-8 space-y-2">
        <p className="text-sm font-medium text-slate-700">
          Photo: laptop on a kitchen table at night,
        </p>
        <p className="text-sm font-medium text-slate-700">
          half-finished report on screen, cold coffee
        </p>
        <p className="text-xs uppercase tracking-wider text-slate-400 pt-3">
          replace with real photography
        </p>
      </div>
    </div>
  );
}
