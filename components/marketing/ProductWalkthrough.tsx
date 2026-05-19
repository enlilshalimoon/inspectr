type Block = {
  eyebrow: string;
  title: string;
  body: string;
  visualLabel: string;
};

const blocks: Block[] = [
  {
    eyebrow: "On the property",
    title: "Capture",
    body: "One thumb, one hand. Photos and voice in the same screen. Works offline; syncs when you're back in service. No login between properties — you stay signed in for the day.",
    visualLabel: "Mobile capture screen with offline indicator",
  },
  {
    eyebrow: "In the truck",
    title: "Drafts arrive",
    body: "By the time you sit down, Lookover has drafted findings for everything you captured. Each one ties back to the photo and voice note it came from, so you always know what informed it.",
    visualLabel: "List of generated findings on phone or tablet",
  },
  {
    eyebrow: "At your desk",
    title: "Review and edit",
    body: "Inline editing. Severity selector (Maintenance / Minor / Major / Safety). Bulk-approve the routine items. Add or swap photos. Reorder findings into your standard report sections.",
    visualLabel: "Desktop review UI mid-edit",
  },
  {
    eyebrow: "To the client",
    title: "Finalize and send",
    body: "One click produces a branded PDF with your logo, license number, and disclaimer — and a mobile-friendly share link your client can open from the email. Buyer's agent gets the same link. No portal, no login, no friction.",
    visualLabel: "Public report view at uselookover.com/report/abc12345",
  },
];

export function ProductWalkthrough() {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20 space-y-20">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
            Built for the way you work
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Built for the way you actually work.
          </h2>
        </div>

        <div className="space-y-16">
          {blocks.map((block, i) => (
            <div
              key={block.title}
              className={`grid lg:grid-cols-2 gap-10 items-center ${
                i % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""
              }`}
            >
              <div className="aspect-[4/3] w-full rounded-2xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-center px-8">
                <span className="text-sm text-slate-500">{block.visualLabel}</span>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                  {block.eyebrow}
                </p>
                <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                  {block.title}
                </h3>
                <p className="text-lg text-slate-600">{block.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
