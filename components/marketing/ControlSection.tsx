export function ControlSection() {
  return (
    <section className="bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-4xl px-6 py-20 space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
            You stay in control
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Your license. Your name. Your call on every finding.
          </h2>
        </div>

        <div className="space-y-5 text-lg text-slate-600">
          <p>
            Lookover is an assistant, not an inspector. Every draft finding requires your
            review and approval before it makes it into the final report. Nothing leaves
            your laptop without your sign-off.
          </p>
          <p>
            Think of it the way a senior inspector thinks of a junior who types up notes:
            helpful, fast, sometimes wrong about the details. You&apos;re the one who knows
            the standard, knows the house, and knows what to tell the client. Lookover just
            gets you to the review stage faster.
          </p>
          <p>
            Every report carries a clear notice:{" "}
            <em className="text-slate-700 not-italic font-medium">
              &ldquo;Draft assisted by Lookover. Reviewed and approved by [Inspector Name,
              License #].&rdquo;
            </em>{" "}
            Your professionalism, on the line, with the documentation to prove the review.
          </p>
        </div>

        <details className="bg-white rounded-xl ring-1 ring-slate-200 p-5 group">
          <summary className="cursor-pointer text-base font-medium text-slate-900 list-none flex items-center justify-between">
            <span>What about E&amp;O insurance?</span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform">
              ⌄
            </span>
          </summary>
          <div className="pt-4 text-slate-600 space-y-3">
            <p>
              We don&apos;t make E&amp;O claims on your behalf — that&apos;s between you
              and your carrier. But the approval-required workflow exists precisely so that
              you remain the inspector of record on every report.
            </p>
            <p>
              We&apos;re working on guidance you can share with your carrier; in the
              meantime, the audit trail (which findings were AI-drafted, which were edited,
              who approved them and when) is available on every report.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
