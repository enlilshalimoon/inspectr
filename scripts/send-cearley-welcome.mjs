// One-off: personal founder welcome to first beta inspector (Cearley, True South).
// From enlil@uselookover.com, reply-to a working inbox so replies don't bounce.
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

const key = process.env.RESEND_API_KEY;
if (!key) { console.error("Missing RESEND_API_KEY"); process.exit(1); }

const to = "tshi@truesouthinspect.com";
const replyTo = "hi@enlil.studio";
const p = "margin:0 0 14px";
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:540px;margin:0 auto;padding:28px 24px">
<p style="${p}">Hey Cearley,</p>
<p style="${p}">Enlil here — I'm the person who built Lookover. Saw you signed up and already set up your New Braunfels inspection for tomorrow. Genuinely made my day; you're one of the very first inspectors using this on real work.</p>
<p style="${p}">Two things:</p>
<p style="${p}">1. If anything feels off or breaks tomorrow, just reply to this email — it comes straight to me and I'll drop what I'm doing. You're early enough that you've basically got me on call.<br>
2. Happy to do a quick 15-minute screen-share before or after, and walk you through capture &rarr; review &rarr; finalize so you're not figuring it out cold mid-inspection. Just say the word and I'll send a time.</p>
<p style="${p}">You're locked in as a founding inspector — free for life — and all I'll ever ask in return is your honest take on what's working and what isn't.</p>
<p style="${p}">Go get that report done in 30 minutes instead of 3 hours.</p>
<p style="margin:18px 0 0">— Enlil<br><span style="color:#64748b">Founder, Lookover · uselookover.com</span></p>
</div></body></html>`;

const text = `Hey Cearley,

Enlil here — I'm the person who built Lookover. Saw you signed up and already set up your New Braunfels inspection for tomorrow. Genuinely made my day; you're one of the very first inspectors using this on real work.

Two things:

1. If anything feels off or breaks tomorrow, just reply to this email — it comes straight to me and I'll drop what I'm doing. You're early enough that you've basically got me on call.
2. Happy to do a quick 15-minute screen-share before or after, and walk you through capture -> review -> finalize so you're not figuring it out cold mid-inspection. Just say the word and I'll send a time.

You're locked in as a founding inspector — free for life — and all I'll ever ask in return is your honest take on what's working and what isn't.

Go get that report done in 30 minutes instead of 3 hours.

— Enlil
Founder, Lookover · uselookover.com`;

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "Enlil at Lookover <enlil@uselookover.com>",
    to,
    reply_to: replyTo,
    subject: "Welcome to Lookover — quick hello before your New Braunfels inspection",
    html,
    text,
  }),
});
const body = await res.json();
console.log("HTTP", res.status);
console.log(JSON.stringify(body, null, 2));
