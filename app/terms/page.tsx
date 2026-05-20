import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of Lookover.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="May 19, 2026">
      <p>
        These terms govern your use of Lookover (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
        &ldquo;our&rdquo;), provided at uselookover.com. By creating an account or using
        the service, you agree to these terms.
      </p>

      <h2>1. Your account</h2>
      <p>
        You&apos;re responsible for keeping your login credentials secure and for all
        activity under your account. You may not share your account with others. If you
        suspect unauthorized access, contact us immediately at{" "}
        <a href="mailto:hello@uselookover.com">hello@uselookover.com</a>.
      </p>

      <h2>2. What Lookover does</h2>
      <p>
        Lookover helps licensed residential home inspectors capture inspection findings
        (via photos and voice notes), generate draft narratives with AI assistance,
        review and edit those drafts, and deliver branded reports to their clients.
        <strong> The inspector reviews and approves every finding before it appears in a finalized report.</strong>{" "}
        Nothing is delivered to a client without the inspector&apos;s explicit approval.
      </p>

      <h2>3. AI-assisted drafting — your professional judgment governs</h2>
      <p>
        The AI features in Lookover (vision tagging, finding drafting, voice
        transcription) are tools to help you work faster. They are not a substitute for
        your professional judgment as a licensed inspector. You are solely responsible
        for the accuracy and completeness of every report you finalize and deliver.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You may use Lookover for legitimate residential home inspection work. You may not:</p>
      <ul>
        <li>Use Lookover to inspect properties you are not licensed to inspect.</li>
        <li>Misrepresent yourself, your license, or your findings.</li>
        <li>Attempt to extract, scrape, or reverse-engineer the underlying AI models.</li>
        <li>Resell access to Lookover, or use it to provide inspection services on behalf of someone other than yourself.</li>
        <li>Use Lookover for commercial property inspections (not currently supported).</li>
      </ul>

      <h2>5. Payment and cancellation</h2>
      <p>
        Lookover bills monthly via Stripe at the rate shown on your account page. You may
        cancel at any time from your account settings; cancellation takes effect at the
        end of your current billing period and you retain access until then. We
        don&apos;t issue partial refunds for unused time within a paid period.
      </p>

      <h2>6. Your data</h2>
      <p>
        You own your inspection data — photos, voice notes, drafts, edits, finalized
        reports, and client communications. You can export everything as JSON at any
        time from your account settings (see our{" "}
        <a href="/data-export">Data Export Policy</a>). On account deletion, we
        permanently remove your data within 30 days. See our{" "}
        <a href="/privacy">Privacy Policy</a> for full details.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        The Lookover software, branding, report templates, and underlying AI prompts are
        ours. The content you generate using Lookover — your inspections, findings, and
        branded reports — is yours.
      </p>

      <h2>8. Disclaimer</h2>
      <p>
        Lookover is provided &ldquo;as is&rdquo; without warranties of any kind, express
        or implied. We do not warrant that Lookover will be uninterrupted or error-free.
        AI-drafted suggestions are starting points; the inspector is the final authority
        on every finding.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, our total liability to you for any claim
        related to Lookover is limited to the amount you paid us in the 12 months
        preceding the claim. We are not liable for indirect, incidental, or
        consequential damages.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. We&apos;ll notify you of material
        changes via email or in-app notice at least 30 days before they take effect.
        Continued use after the effective date constitutes acceptance.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of [TBD], without regard to
        conflict-of-law principles. Any disputes will be resolved in the state or
        federal courts located in [TBD].
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href="mailto:hello@uselookover.com">hello@uselookover.com</a>.
      </p>
    </LegalPage>
  );
}
