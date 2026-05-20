import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Data Export Policy",
  description:
    "Your inspection data is yours. Export everything to JSON any time, no questions.",
};

export default function DataExportPage() {
  return (
    <LegalPage title="Data Export Policy" lastUpdated="May 19, 2026">
      <p>
        Your data is yours. We make it easy to take with you — at any time, for any
        reason, with no fees and no friction.
      </p>

      <h2>What you can export</h2>
      <ul>
        <li>All your inspections (drafts, finalized, archived)</li>
        <li>All photos and voice notes you&apos;ve captured</li>
        <li>All findings (drafts, edits, approvals) with full audit timestamps</li>
        <li>All finalized reports as JSON, PDF, and the original public share URLs</li>
        <li>Your account profile, settings, and branding assets</li>
      </ul>

      <h2>How to export</h2>
      <p>
        From your dashboard: <strong>Settings → Export data → Download archive</strong>.
        You&apos;ll receive a single zip file containing structured JSON and the raw
        media within a few minutes. For large accounts (1,000+ inspections), the export
        is generated asynchronously and you&apos;ll get an email link when it&apos;s
        ready.
      </p>

      <h2>Format</h2>
      <ul>
        <li>
          <strong>Structured data</strong> as JSON — one file per inspection, plus a
          top-level manifest
        </li>
        <li>
          <strong>Photos</strong> in their original format (typically JPEG or HEIC),
          organized by inspection
        </li>
        <li>
          <strong>Voice notes</strong> as M4A or WAV (whatever your device recorded)
        </li>
        <li>
          <strong>Reports</strong> as PDFs in their finalized form
        </li>
      </ul>

      <h2>Frequency</h2>
      <p>
        Export as often as you want, at no additional cost. We don&apos;t rate-limit
        exports for active accounts.
      </p>

      <h2>When you cancel your account</h2>
      <p>
        Your data stays accessible for export for 30 days after cancellation. After 30
        days, we permanently delete it. Backups are purged within an additional 30 days.
        See our <a href="/privacy">Privacy Policy</a> for details on retention.
      </p>

      <h2>Programmatic access</h2>
      <p>
        We do not currently offer a public API for export. If you need programmatic
        export for compliance or backup automation, email{" "}
        <a href="mailto:hello@uselookover.com">hello@uselookover.com</a> and we&apos;ll
        work something out.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about exporting your data:{" "}
        <a href="mailto:hello@uselookover.com">hello@uselookover.com</a>.
      </p>
    </LegalPage>
  );
}
