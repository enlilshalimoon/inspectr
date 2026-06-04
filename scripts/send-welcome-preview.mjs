// Send a branded welcome-email preview via Resend (mirrors lib/email/send.ts output).
// Verifies the noreply@uselookover.com sender + lets a human see the rendered email.
// Usage: node scripts/send-welcome-preview.mjs <to-email> ["First Name"]

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

const [, , to, nameArg] = process.argv;
if (!to) {
  console.error('Usage: node scripts/send-welcome-preview.mjs <to-email> ["First Name"]');
  process.exit(1);
}
const name = nameArg ?? "there";
const appUrl = "https://www.uselookover.com";
const key = process.env.RESEND_API_KEY;
if (!key) { console.error("Missing RESEND_API_KEY"); process.exit(1); }

const navy="#0f172a", cream="#fef9f3", orange="#f97316", slate="#334155", muted="#64748b", border="#e2e8f0";
const onboardingUrl = `${appUrl}/onboarding`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${cream}">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">You're in. Here's how Lookover works.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${border};border-radius:12px;overflow:hidden">
<tr><td style="background:${navy};padding:20px 28px"><span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:${cream};letter-spacing:-0.3px">Lookover</span><span style="color:${orange};font-weight:700;font-size:20px"> ›</span></td></tr>
<tr><td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${navy}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">Welcome to Lookover, ${name}.</td></tr>
<tr><td style="font-size:15px;line-height:1.65;color:${slate};padding-bottom:16px">You're in. Here's the short version of how it works:</td></tr>
<tr><td style="font-size:15px;line-height:1.7;color:${slate};padding-bottom:18px"><strong>1. Capture</strong> — walk the property, take photos, talk through what you see.<br><strong>2. Draft</strong> — findings get written up in standard SOP language by the time you're back at the truck.<br><strong>3. Approve</strong> — review every finding on the laptop, edit anything, send the branded report same day.</td></tr>
<tr><td style="font-size:15px;line-height:1.65;color:${slate};padding-bottom:20px">Finish setting up your profile (company name, license, branding) and you're ready for your first inspection.</td></tr>
<tr><td style="padding:8px 0 28px"><a href="${onboardingUrl}" style="display:inline-block;background:${navy};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:6px;font-size:15px;font-weight:600">Finish setting up</a></td></tr>
<tr><td style="padding-top:8px;font-size:12px;line-height:1.6;color:${muted}">Built by an actual person you can email back. Reply here any time — it comes straight to me.</td></tr>
</table></td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${border};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:${muted}">Lookover — inspection reports for residential home inspectors.<br>Questions? Just reply to this email.</td></tr>
</table></td></tr></table></body></html>`;

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "Lookover <noreply@uselookover.com>",
    to,
    reply_to: "hello@uselookover.com",
    subject: "Welcome to Lookover",
    html,
    text: `Welcome to Lookover, ${name}.\n\nYou're in. How it works:\n1. Capture — walk the property, take photos, talk through what you see.\n2. Draft — findings written up in standard SOP language before you're back to your truck.\n3. Approve — review every finding, edit anything, send the branded report same day.\n\nFinish setting up: ${onboardingUrl}\n\n— Lookover`,
  }),
});
const body = await res.json();
console.log("HTTP", res.status);
console.log(JSON.stringify(body, null, 2));
