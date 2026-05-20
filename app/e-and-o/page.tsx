import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "For your E&O carrier",
  description:
    "A 1-page explanation of how Lookover fits into your inspection workflow — built to share with your E&O insurance carrier or attorney.",
};

export default function EAndOPage() {
  return (
    <LegalPage
      title="For your E&O carrier"
      lastUpdated="May 19, 2026"
      draftNotice={false}
    >
      <p>
        A short explanation of how Lookover fits into your inspection workflow — built
        to be sharable with your E&amp;O insurance carrier or attorney.
      </p>

      <h2>What Lookover is</h2>
      <p>
        Lookover is software that helps licensed residential home inspectors capture
        inspection observations (photos and voice notes) and generate draft narrative
        findings. <strong>The inspector reviews and approves every finding before it
        appears in a finalized report.</strong> Nothing is delivered to the client
        without the inspector&apos;s explicit sign-off.
      </p>

      <h2>What Lookover does NOT do</h2>
      <ul>
        <li>
          <strong>Lookover does not perform inspections.</strong> The inspector performs
          the inspection.
        </li>
        <li>
          <strong>Lookover does not finalize reports automatically.</strong> The
          inspector finalizes the report.
        </li>
        <li>
          <strong>Lookover does not communicate with clients independently.</strong> The
          inspector triggers report delivery.
        </li>
        <li>
          <strong>Lookover does not provide cost estimates, repair pricing, or
          contractor recommendations.</strong> US inspectors are legally barred from
          these; we adhere to the same standard.
        </li>
      </ul>

      <h2>The inspector remains the inspector of record</h2>
      <p>
        Every report finalized through Lookover identifies the inspector by name and
        license number, includes the inspector&apos;s company branding, and carries the
        inspector&apos;s electronic sign-off. The AI-drafted starting point is fully
        editable by the inspector before approval — wording, severity rating, photos
        included, and recommended actions.
      </p>

      <h2>Audit trail</h2>
      <p>Every report has an internal audit trail recording:</p>
      <ul>
        <li>Which findings were AI-drafted versus inspector-authored</li>
        <li>Which AI-drafted findings were edited by the inspector (and the diff)</li>
        <li>Who approved each finding and when (timestamped)</li>
        <li>When the report was finalized and delivered</li>
      </ul>
      <p>
        This audit trail is available to the inspector at any time and can be exported
        on request — useful if a carrier requests evidence of professional review
        practice during underwriting or claim investigation.
      </p>

      <h2>Comparison to existing workflows</h2>
      <p>
        The Lookover workflow is functionally equivalent to a senior inspector reviewing
        draft narratives written by a junior assistant or transcriptionist — a workflow
        that is standard in many inspection firms and has been considered compatible
        with E&amp;O coverage for decades. The only difference is that the
        &ldquo;junior assistant&rdquo; is software, and the review-and-approval happens
        in a structured tool rather than email or shared documents.
      </p>

      <h2>Standards alignment</h2>
      <p>
        Lookover&apos;s draft language is written against InterNACHI&apos;s Standards of
        Practice. As of our most recent benchmark (29 representative findings spanning
        the major property systems), our drafts align with InterNACHI SOP guidance at{" "}
        <strong>86% accuracy</strong> before inspector review. State-specific addenda
        (Texas TREC, California CREIA, etc.) are added on top of the inspector&apos;s
        own report templates and disclaimers.
      </p>

      <h2>Data security and confidentiality</h2>
      <p>
        Inspection content — photos, voice notes, findings, reports — is stored in
        encrypted Supabase Storage with row-level security. The AI providers we use
        (Anthropic, OpenAI) do not train their models on Lookover customer data by
        default. See our <a href="/privacy">Privacy Policy</a> for the full data
        handling details.
      </p>

      <h2>Questions from your carrier or attorney</h2>
      <p>
        We&apos;re happy to answer detailed questions directly from your carrier or
        legal team. Contact{" "}
        <a href="mailto:hello@uselookover.com">hello@uselookover.com</a> and we&apos;ll
        route to the right person.
      </p>

      <p className="text-sm text-slate-500 italic mt-8">
        This document is for informational purposes only and is not legal advice or an
        insurance representation. Lookover is not a party to your E&amp;O policy and
        cannot make coverage representations on your behalf — only your carrier can.
      </p>
    </LegalPage>
  );
}
