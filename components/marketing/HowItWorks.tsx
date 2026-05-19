type Step = {
  number: string;
  title: string;
  headline: string;
  body: React.ReactNode;
  visualLabel: string;
};

const steps: Step[] = [
  {
    number: "1",
    title: "Capture",
    headline: "You walk. You shoot. You talk.",
    body: (
      <>
        <p>
          Open Lookover on your phone, take photos of what you&apos;d normally photograph.
          Hold the button to record a voice note about what you&apos;re looking at.
          That&apos;s the whole on-site workflow.
        </p>
        <p className="text-sm text-slate-500 italic">
          Sample voice note: &ldquo;Water heater is a 2009 Rheem, 40-gallon. T&amp;P valve
          discharge pipe terminates above the pan — should be within 6 inches of the floor.
          Note for the report.&rdquo;
        </p>
      </>
    ),
    visualLabel: "Mobile capture screen with photo + waveform",
  },
  {
    number: "2",
    title: "Draft",
    headline: "Lookover writes the finding.",
    body: (
      <>
        <p>
          The photo gets analyzed for what&apos;s actually in the picture. Your voice note
          gets transcribed and combined with the visual context. Out comes a draft finding
          with a severity rating and a recommendation, written in standard SOP language.
        </p>
        <p>
          Drafts appear as you go. By the time you finish the walkthrough, the report is
          mostly written.
        </p>
      </>
    ),
    visualLabel: "Generated finding card with severity rating",
  },
  {
    number: "3",
    title: "Approve",
    headline: "You review every finding before it goes out.",
    body: (
      <>
        <p>
          Sit down at your laptop. Read each draft. Edit the wording, change the severity,
          add a photo, or delete it. Bulk-approve the routine stuff. Spend your time on the
          findings that matter.
        </p>
        <p>
          Hit finalize. Client gets a branded PDF and a mobile-friendly link.
          You&apos;re done.
        </p>
      </>
    ),
    visualLabel: "Desktop review interface with one finding being edited",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl space-y-3 mb-12">
          <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Three steps. Most of the work happens before you leave the property.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <article
              key={step.number}
              className="bg-white rounded-2xl ring-1 ring-slate-200 p-6 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-semibold">
                  {step.number}
                </span>
                <span className="text-sm font-medium uppercase tracking-wider text-slate-500">
                  {step.title}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                {step.headline}
              </h3>
              <div className="space-y-3 text-slate-600 flex-1">{step.body}</div>
              <div className="mt-6 aspect-[4/3] rounded-lg bg-slate-100 flex items-center justify-center text-center px-4">
                <span className="text-xs text-slate-500">{step.visualLabel}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
