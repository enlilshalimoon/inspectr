// Static sample report. Links to it from /, footer, and FAQ. Mirrors the
// visual language of the real public viewer at /report/[slug] so a prospect
// can see what their clients would receive without us needing to keep a
// live demo inspection seeded in the DB.

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sample inspection report",
  description:
    "A realistic example of what your clients receive when you finalize a report in Lookover — branded, severity-coded, mobile-friendly.",
};

type Severity = "safety" | "major" | "moderate" | "minor" | "maintenance";

const SEVERITY_STYLES: Record<
  Severity,
  { label: string; pill: string; dot: string }
> = {
  safety: {
    label: "Safety",
    pill: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  major: {
    label: "Major",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  moderate: {
    label: "Moderate",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  minor: {
    label: "Minor",
    pill: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  maintenance: {
    label: "Maintenance",
    pill: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
};

type Finding = {
  severity: Severity;
  title: string;
  description: string;
  recommendedAction: string;
};

type Section = {
  title: string;
  findings: Finding[];
};

const SECTIONS: Section[] = [
  {
    title: "Roof System",
    findings: [
      {
        severity: "major",
        title: "Flashing at vent pipe",
        description:
          "The galvanized metal flashing around the plumbing vent pipe shows significant corrosion and is lifted from the shingle base. Visible gaps allow water intrusion onto the roof deck. Active staining observed on the attic sheathing directly below confirms past leakage.",
        recommendedAction:
          "Have a licensed roofing contractor remove and replace the flashing assembly. Inspect attic sheathing for rot during repair.",
      },
      {
        severity: "minor",
        title: "Asphalt shingle wear at south slope",
        description:
          "Granule loss and edge curling observed on the south-facing slope, consistent with normal wear for the home's age. No active leakage observed at time of inspection.",
        recommendedAction:
          "Monitor annually. Plan for full roof replacement within the next 5–7 years.",
      },
    ],
  },
  {
    title: "Plumbing",
    findings: [
      {
        severity: "moderate",
        title: "Water heater T&P discharge pipe",
        description:
          "The temperature & pressure relief discharge pipe on the 2009 Rheem 40-gallon natural gas water heater terminates above the drip pan, rather than within 6 inches of the floor as required by code (IRC P2804.6).",
        recommendedAction:
          "Have a licensed plumber extend the T&P discharge pipe to terminate 6\" or less above the floor or directly into a properly trapped drain.",
      },
    ],
  },
  {
    title: "Electrical",
    findings: [
      {
        severity: "safety",
        title: "GFCI not present at kitchen counter receptacle",
        description:
          "The receptacle located within 6 feet of the kitchen sink does not have GFCI protection. GFCI protection has been required at kitchen counter outlets within 6' of a sink since 1996.",
        recommendedAction:
          "Have a licensed electrician install GFCI protection at the affected receptacle(s) — either a GFCI outlet or upstream GFCI breaker.",
      },
    ],
  },
  {
    title: "Structural",
    findings: [
      {
        severity: "minor",
        title: "Settlement crack at south foundation wall",
        description:
          "Vertical hairline crack (approximately 1/16\" wide) observed in the south foundation wall, consistent with typical settlement for the home's age. No displacement or active moisture intrusion observed at time of inspection.",
        recommendedAction:
          "Monitor for changes. Seal with an appropriate masonry crack filler to prevent moisture infiltration.",
      },
    ],
  },
  {
    title: "Exterior",
    findings: [
      {
        severity: "minor",
        title: "Gutter detached at northwest corner",
        description:
          "The aluminum gutter at the northwest corner of the home is detached from the fascia and sloping incorrectly, causing water to overflow at the corner during rainfall. Staining on the exterior siding below confirms repeated overflow.",
        recommendedAction:
          "Reattach gutter, verify slope toward downspout, and clean accumulated debris.",
      },
    ],
  },
];

const SEVERITY_ORDER: Severity[] = ["safety", "major", "moderate", "minor", "maintenance"];

export default function SampleReportPage() {
  const allFindings = SECTIONS.flatMap((s) => s.findings);
  const severityCounts = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    count: allFindings.filter((f) => f.severity === sev).length,
  })).filter((s) => s.count > 0);

  return (
    <>
      {/* Sample banner — distinguishes this from a real report */}
      <div className="bg-orange-50 border-b border-orange-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-orange-900">
            <span className="font-semibold">Sample report</span>
            <span className="text-orange-700"> — your reports will use your own branding, license, and findings.</span>
          </p>
          <Link
            href="/signup"
            className="text-sm font-medium text-orange-700 hover:text-orange-900 underline underline-offset-2"
          >
            Start free trial →
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <header className="space-y-3 border-b border-slate-200 pb-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">
            Residential Property Inspection Report
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            147 Oakwood Lane
          </h1>
          <p className="text-slate-500">Austin, TX 78704</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-4 text-sm">
            <KV label="Inspector" value="Dave Reynolds" subvalue="Reynolds Home Inspection" />
            <KV label="License" value="INS-4421 (TX)" />
            <KV label="Client" value="Sarah Henderson" />
            <KV label="Inspection date" value="May 12, 2026" />
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
          <div className="flex flex-wrap gap-2">
            {severityCounts.map((s) => {
              const c = SEVERITY_STYLES[s.severity];
              return (
                <span
                  key={s.severity}
                  className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full border ${c.pill}`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
                  {s.count} {c.label}
                </span>
              );
            })}
          </div>
          <p className="text-sm text-slate-500 pt-2">
            Single-family residence · 2,340 sq ft · Built 1986 · 3 bed · 2 bath · 2-car garage
          </p>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <div className="space-y-3">
              {section.findings.map((f) => {
                const c = SEVERITY_STYLES[f.severity];
                return (
                  <div
                    key={f.title}
                    className="rounded-lg border border-slate-200 p-4 space-y-2"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${c.pill}`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </span>
                    <h3 className="font-medium text-slate-900">{f.title}</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{f.description}</p>
                    <p className="text-sm text-slate-600 border-l-2 border-slate-200 pl-3">
                      <span className="font-medium text-slate-700">Recommended action:</span>{" "}
                      {f.recommendedAction}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <section className="pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Disclaimer and limitations
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            This sample report illustrates the format and scope of a Lookover-generated
            inspection report. It does not represent a real property or a real inspection.
            Every real report is reviewed and approved by a licensed inspector before
            being delivered to the client.
          </p>
        </section>

        <section className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 text-center space-y-4">
          <h2 className="text-2xl font-semibold">Want this for your reports?</h2>
          <p className="text-slate-300 max-w-md mx-auto">
            14-day free trial. No credit card. Up to 3 inspections. Cancel from settings in
            one click.
          </p>
          <div className="pt-2">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center px-6 rounded-md bg-orange-500 text-white font-medium hover:bg-orange-600"
            >
              Start free trial
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}

function KV({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-slate-900">{value}</div>
      {subvalue && <div className="text-sm text-slate-500">{subvalue}</div>}
    </div>
  );
}
