// Branded transactional email via Resend.
//
// All Lookover-initiated emails (welcome, password reset) go through here so they
// share one on-brand template and send from noreply@uselookover.com (the verified
// domain) instead of Supabase's default @supabase.io sender. Report-delivery email
// to clients lives separately in the review action (sends as the inspector's
// company from reports@uselookover.com).
//
// Lazy-loads the Resend SDK so routes still build without the key set. All sends
// are best-effort: callers should not fail their primary action if email fails.

const FROM_SYSTEM =
  process.env.RESEND_SYSTEM_FROM ?? "Lookover <noreply@uselookover.com>";

// Founder-voice sender for personal beta touches (feedback asks, etc.). Reply-to
// MUST be a working inbox — uselookover.com needs email forwarding/receiving set up,
// otherwise replies bounce. Override via env once that inbox exists.
const FROM_FOUNDER =
  process.env.RESEND_FOUNDER_FROM ?? "Enlil at Lookover <enlil@uselookover.com>";
const FOUNDER_REPLY_TO = process.env.FOUNDER_REPLY_TO ?? "enlil@uselookover.com";

const BRAND = {
  navy: "#0f172a",
  cream: "#fef9f3",
  orange: "#f97316",
  slate: "#334155",
  slateMuted: "#64748b",
  border: "#e2e8f0",
};

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export async function sendSystemEmail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", args.to);
    return { ok: false, error: "email_not_configured" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const res = await resend.emails.send({
      from: FROM_SYSTEM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      // Reply-to must be a deliverable inbox. uselookover.com receiving is set up
      // separately (Workspace/forwarding); until then point at a working inbox via env.
      replyTo:
        args.replyTo ??
        process.env.RESEND_SYSTEM_REPLY_TO ??
        "hello@uselookover.com",
    });
    if (res.error) {
      console.error("[email] resend error:", res.error);
      return { ok: false, error: res.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Send a personal founder-voice email (plain, no big branded shell — reads like a
// real person wrote it, not a system). From enlil@, reply-to a real inbox.
export async function sendFounderEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping founder email to", args.to);
    return { ok: false, error: "email_not_configured" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const res = await resend.emails.send({
      from: FROM_FOUNDER,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: FOUNDER_REPLY_TO,
    });
    if (res.error) {
      console.error("[email] founder send error:", res.error);
      return { ok: false, error: res.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] founder send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Shared branded shell. Keeps every system email visually consistent with the
// landing page / report styling: navy + cream, single orange accent, system fonts.
// ---------------------------------------------------------------------------
function shell(opts: {
  preheader: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
}): string {
  const { preheader, bodyHtml, ctaLabel, ctaUrl, footnote } = opts;
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:8px 0 28px"><a href="${ctaUrl}" style="display:inline-block;background:${BRAND.navy};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:6px;font-size:15px;font-weight:600">${ctaLabel}</a></td></tr>`
      : "";
  const foot = footnote
    ? `<tr><td style="padding-top:8px;font-size:12px;line-height:1.6;color:${BRAND.slateMuted}">${footnote}</td></tr>`
    : "";
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.cream}">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden">
        <tr><td style="background:${BRAND.navy};padding:20px 28px">
          <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:${BRAND.cream};letter-spacing:-0.3px">Lookover</span><span style="color:${BRAND.orange};font-weight:700;font-size:20px"> ›</span>
        </td></tr>
        <tr><td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.navy}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${bodyHtml}
            ${cta}
            ${foot}
          </table>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${BRAND.border};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:${BRAND.slateMuted}">
          Lookover — inspection reports for residential home inspectors.<br>
          Questions? Just reply to this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Welcome email — fires on signup. No verification required (confirmation is off);
// this just greets the inspector and points them to the next step.
// ---------------------------------------------------------------------------
export function welcomeEmail(opts: { fullName?: string | null; appUrl: string }) {
  const name = opts.fullName?.trim() ? opts.fullName.trim().split(" ")[0] : "there";
  const onboardingUrl = `${opts.appUrl}/onboarding`;
  const bodyHtml = `
    <tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">Welcome to Lookover, ${escapeHtml(name)}.</td></tr>
    <tr><td style="font-size:15px;line-height:1.65;color:${BRAND.slate};padding-bottom:16px">
      You're in. Here's the short version of how it works:
    </td></tr>
    <tr><td style="font-size:15px;line-height:1.7;color:${BRAND.slate};padding-bottom:18px">
      <strong>1. Capture</strong> — walk the property, take photos, talk through what you see.<br>
      <strong>2. Draft</strong> — findings get written up in standard SOP language by the time you're back at the truck.<br>
      <strong>3. Approve</strong> — review every finding on the laptop, edit anything, send the branded report same day.
    </td></tr>
    <tr><td style="font-size:15px;line-height:1.65;color:${BRAND.slate};padding-bottom:20px">
      Finish setting up your profile (company name, license, branding) and you're ready for your first inspection.
    </td></tr>`;
  return {
    subject: "Welcome to Lookover",
    html: shell({
      preheader: "You're in. Here's how Lookover works.",
      bodyHtml,
      ctaLabel: "Finish setting up",
      ctaUrl: onboardingUrl,
      footnote:
        "Built by an actual person you can email back. Reply here any time — it comes straight to me.",
    }),
    text: `Welcome to Lookover, ${name}.

You're in. How it works:
1. Capture — walk the property, take photos, talk through what you see.
2. Draft — findings written up in standard SOP language before you're back to your truck.
3. Approve — review every finding, edit anything, send the branded report same day.

Finish setting up your profile: ${onboardingUrl}

Built by an actual person you can email back. Reply any time.
— Lookover`,
  };
}

// ---------------------------------------------------------------------------
// Password reset — delivered via Resend (branded) using a recovery link generated
// server-side with the Supabase admin API. Replaces the default @supabase.io email.
// ---------------------------------------------------------------------------
export function passwordResetEmail(opts: { resetUrl: string }) {
  const bodyHtml = `
    <tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">Reset your password</td></tr>
    <tr><td style="font-size:15px;line-height:1.65;color:${BRAND.slate};padding-bottom:18px">
      Someone (hopefully you) asked to reset the password on your Lookover account. Click below to set a new one. This link expires in 1 hour.
    </td></tr>`;
  return {
    subject: "Reset your Lookover password",
    html: shell({
      preheader: "Reset your Lookover password — link expires in 1 hour.",
      bodyHtml,
      ctaLabel: "Set a new password",
      ctaUrl: opts.resetUrl,
      footnote:
        "If you didn't request this, you can safely ignore this email — your password won't change.",
    }),
    text: `Reset your Lookover password

Someone asked to reset the password on your Lookover account. Open this link to set a new one (expires in 1 hour):

${opts.resetUrl}

If you didn't request this, ignore this email — your password won't change.
— Lookover`,
  };
}

// ---------------------------------------------------------------------------
// First-inspection feedback — fires after an inspector finalizes their FIRST report.
// Deliberately plain (no big branded shell) so it reads as a real person writing,
// not a system notification. Reply-to-answer; no form. Carries the beta asks from
// the rollout playbook: honest feedback, what broke, and the 5-min video offer.
// ---------------------------------------------------------------------------
export function firstInspectionFeedbackEmail(opts: {
  firstName?: string | null;
  propertyLabel?: string | null;
}) {
  const name = opts.firstName?.trim() ? opts.firstName.trim().split(" ")[0] : "there";
  const propRef = opts.propertyLabel?.trim()
    ? ` on ${escapeHtml(opts.propertyLabel.trim())}`
    : "";
  const p = "margin:0 0 14px";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:540px;margin:0 auto;padding:28px 24px">
  <p style="${p}">Hey ${escapeHtml(name)},</p>
  <p style="${p}">Enlil here — I built Lookover. I saw you just finalized your first report${propRef}, so first off: thank you for actually putting it to work on a real job. That means a lot this early.</p>
  <p style="${p}">I'd really value your honest take. No form — just hit reply and tell me whatever's on your mind. The three I care about most:</p>
  <p style="${p}">
    1. What felt slow, broken, or worse than how you write reports today?<br>
    2. What's missing that you'd need before you'd use it on every inspection?<br>
    3. Did the drafted findings read right against the SOP — or did you have to fix a lot?
  </p>
  <p style="${p}">And if you'd be up for it: a quick 5-minute screen-share or video of your honest reaction would be worth more to me than anything. Totally optional, and there's a free lifetime account in it for you either way as one of the first inspectors on this.</p>
  <p style="${p}">Reply any time — this comes straight to me.</p>
  <p style="margin:18px 0 0">— Enlil<br><span style="color:#64748b">Founder, Lookover · uselookover.com</span></p>
</div></body></html>`;
  return {
    subject: "How'd your first Lookover report go?",
    html,
    text: `Hey ${name},

Enlil here — I built Lookover. I saw you just finalized your first report${opts.propertyLabel ? ` on ${opts.propertyLabel}` : ""}, so first off: thank you for putting it to work on a real job. That means a lot this early.

I'd really value your honest take. No form — just reply and tell me whatever's on your mind. The three I care about most:

1. What felt slow, broken, or worse than how you write reports today?
2. What's missing before you'd use it on every inspection?
3. Did the drafted findings read right against the SOP, or did you fix a lot?

And if you'd be up for it: a quick 5-minute screen-share or video of your honest reaction would be worth more than anything. Optional, and there's a free lifetime account in it for you either way as one of the first inspectors on this.

Reply any time — comes straight to me.

— Enlil
Founder, Lookover · uselookover.com`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
