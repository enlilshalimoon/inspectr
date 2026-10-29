"use client";

import { useState } from "react";
import Link from "next/link";

type Item = {
  question: string;
  answer: React.ReactNode;
};

const items: Item[] = [
  {
    question: "What if Lookover gets a finding wrong?",
    answer: (
      <p>
        Every draft finding requires your approval before it makes it into the final
        report. You can edit any wording, change the severity, swap photos, or delete the
        finding entirely. Lookover never finalizes a report on its own.
      </p>
    ),
  },
  {
    question: "Will my E&O carrier cover reports drafted with Lookover?",
    answer: (
      <p>
        The workflow is built so that you remain the inspector of record — every finding
        is reviewed and approved by you before the report finalizes, with an audit trail.
        We don&apos;t speak for your carrier, but we have a{" "}
        <Link href="/e-and-o" className="text-orange-700 underline underline-offset-2">
          1-page overview for your E&amp;O carrier
        </Link>{" "}
        that you can share with them or your attorney.
      </p>
    ),
  },
  {
    question: "Does this work for InterNACHI SOP / state-specific standards?",
    answer: (
      <p>
        Yes. The draft language is written against InterNACHI Standards of Practice (86%
        on our 29-case benchmark before your review). For Texas inspectors, Lookover
        fills out the promulgated TREC REI 7-6 form — I/NI/NP/D checkboxes, system
        fields, and item comments included. State-mandated report rules and summary pages
        for North Carolina, Wisconsin, Virginia, Pennsylvania, Kentucky, Florida, and Ohio
        are also built in, and you can customize your SOP and disclaimers in Settings.
      </p>
    ),
  },
  {
    question: "What if I'm offline at the property?",
    answer: (
      <p>
        Keep shooting. Every photo is saved on your phone until it uploads, and
        Lookover sends it as soon as you&apos;re back in service. Drafting and voice
        notes need a connection, so those catch up when the photos do.
      </p>
    ),
  },
  {
    question: "Can I keep using my existing report style?",
    answer: (
      <p>
        Yes — you control wording, structure, severity scale, and disclaimers. Lookover
        drafts in a neutral SOP-aligned voice that&apos;s easy to edit toward your house
        style. Saved templates are coming.
      </p>
    ),
  },
  {
    question: "What about commercial inspections?",
    answer: (
      <p>
        Not yet. Lookover is built for residential. Commercial has a different SOP and
        different client expectations; we&apos;d rather do residential well than both
        poorly.
      </p>
    ),
  },
  {
    question: "What happens to my data if I cancel?",
    answer: (
      <p>
        It&apos;s yours. Export all your inspections, photos, and reports to JSON from
        settings, any time, no questions. We delete your account on request within 30
        days.
      </p>
    ),
  },
  {
    question: "Who built this?",
    answer: (
      <p>
        A small team focused only on residential inspection software. We talk to
        inspectors every week. If something&apos;s broken or missing, email the founder
        directly — address is in your dashboard.
      </p>
    ),
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Common questions, answered straight.
          </h2>
        </div>

        <ul className="space-y-3">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <li
                key={item.question}
                className="bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium text-slate-900">
                    {item.question}
                  </span>
                  <span
                    className={`text-slate-400 text-lg transition-transform shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  >
                    ⌄
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-slate-600 space-y-3">{item.answer}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
