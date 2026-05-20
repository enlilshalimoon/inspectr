import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data Lookover collects, how we use it, and your rights.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="May 19, 2026">
      <p>
        This policy explains what data Lookover collects, how we use it, and your
        rights. Short version: we collect only what we need to run the service, we
        don&apos;t sell or share for advertising, and you can export or delete
        everything at any time.
      </p>

      <h2>What we collect</h2>

      <h3>When you create an account</h3>
      <ul>
        <li>Name, email address, password (stored hashed)</li>
        <li>License number, license state, and company name (if you provide them)</li>
        <li>Company logo and branding settings (if you upload them)</li>
      </ul>

      <h3>When you use Lookover</h3>
      <ul>
        <li>Inspection photos and voice notes you capture in the field</li>
        <li>AI-generated draft findings and your edits / approvals</li>
        <li>Finalized reports (PDF + structured data) and the client recipients you send them to</li>
        <li>Custom message text you include with report deliveries</li>
      </ul>

      <h3>Automatically</h3>
      <ul>
        <li>Standard web logs (IP address, browser type, pages visited)</li>
        <li>Authentication cookies (required to keep you signed in)</li>
        <li>Billing metadata from Stripe (last 4 of card, billing address — never full card numbers)</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the Lookover service — drafting findings, storing reports, delivering them to your clients</li>
        <li>To bill you for the service</li>
        <li>To communicate with you about your account, security issues, and major product changes</li>
        <li>To diagnose bugs and improve performance (aggregated, anonymized usage data)</li>
      </ul>

      <h2>AI model training</h2>
      <p>
        <strong>
          We do not train our AI models on the contents of your inspections, photos, or
          reports.
        </strong>{" "}
        The Anthropic Claude and OpenAI Whisper APIs we use are governed by their
        providers&apos; data policies; both providers commit in writing not to train on
        API customer data by default.
      </p>

      <h2>Who we share with</h2>
      <p>
        We share data with a small set of service providers that help us run Lookover:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, authentication, and file storage for your photos / reports
        </li>
        <li>
          <strong>Anthropic</strong> — Claude API for vision tagging and finding drafting
        </li>
        <li>
          <strong>OpenAI</strong> — Whisper API for voice transcription
        </li>
        <li>
          <strong>Resend</strong> — email delivery for report links and account notifications
        </li>
        <li>
          <strong>Vercel</strong> — application hosting and CDN
        </li>
        <li>
          <strong>Stripe</strong> — payment processing
        </li>
      </ul>
      <p>
        We do not sell your data. We do not share it for advertising. We will only
        disclose data to law enforcement when we are legally compelled by valid process.
      </p>

      <h2>Your rights</h2>
      <p>You can:</p>
      <ul>
        <li>Access all your data via your dashboard at any time</li>
        <li>
          Export everything as JSON + original media files from Settings (see our{" "}
          <a href="/data-export">Data Export Policy</a>)
        </li>
        <li>Delete your account on request — we permanently remove your data within 30 days</li>
        <li>Correct inaccurate information by editing your profile or emailing us</li>
        <li>Opt out of non-essential communications from account settings</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use cookies for authentication and session management only. No tracking
        pixels, no third-party advertising cookies, no cross-site tracking.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain your data for as long as your account is active. If you cancel, we
        keep your data accessible for 30 days so you can export it, then permanently
        delete it. Backups are purged within an additional 30 days.
      </p>

      <h2>Children</h2>
      <p>
        Lookover is for licensed home inspectors. We don&apos;t knowingly collect data
        from anyone under 18.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be
        communicated via email or in-app notice at least 30 days before they take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, requests, or concerns:{" "}
        <a href="mailto:hello@uselookover.com">hello@uselookover.com</a>.
      </p>
    </LegalPage>
  );
}
