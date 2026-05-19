import Image from "next/image";

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
            src="/marketing/pdf-report-page.webp"
            alt="First page of a Lookover inspection report PDF: branded header with inspector name and license, property summary card, and a Roof System finding with severity badge and recommended action"
            aspect="aspect-[3/4]"
          />
          <Deliverable
            label="Mobile share link"
            src="/marketing/phone-share-report.webp"
            alt="Phone displaying the buyer-facing inspection report at uselookover.com/report — showing a roof flashing finding with Major severity"
            aspect="aspect-[3/4]"
          />
        </div>
      </div>
    </section>
  );
}

function Deliverable({
  label,
  src,
  alt,
  aspect,
}: {
  label: string;
  src: string;
  alt: string;
  aspect: string;
}) {
  return (
    <div className="bg-slate-50 rounded-2xl p-6 ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-900 mb-3">{label}</p>
      <div
        className={`relative ${aspect} max-h-[520px] mx-auto rounded-lg overflow-hidden ring-1 ring-slate-200 bg-white`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
