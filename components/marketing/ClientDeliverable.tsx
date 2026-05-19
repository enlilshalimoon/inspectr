export function ClientDeliverable() {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
            What clients receive
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            A report your clients will actually read.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Branded with your logo and contact info. Severity ratings color-coded. Photos
            inline with each finding. Mobile-friendly so buyers can read it on their phone
            in the realtor&apos;s car.
          </p>
          <p className="mt-3 text-lg text-slate-600">
            Delivered two ways at once: a polished PDF for the file, and a shareable web
            link for the people who never open PDFs.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Deliverable
            label="Branded PDF"
            caption="First page of the report — logo, license, severity-coded findings"
            aspect="aspect-[8.5/11]"
          />
          <Deliverable
            label="Mobile share link"
            caption="uselookover.com/report/abc12345 — opens in the buyer's phone"
            aspect="aspect-[9/16]"
          />
        </div>
      </div>
    </section>
  );
}

function Deliverable({
  label,
  caption,
  aspect,
}: {
  label: string;
  caption: string;
  aspect: string;
}) {
  return (
    <div className="bg-slate-50 rounded-2xl p-6 ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-900 mb-3">{label}</p>
      <div
        className={`${aspect} max-h-[520px] mx-auto rounded-lg bg-white ring-1 ring-slate-200 flex items-center justify-center text-center px-6`}
      >
        <span className="text-xs text-slate-500">{caption}</span>
      </div>
    </div>
  );
}
