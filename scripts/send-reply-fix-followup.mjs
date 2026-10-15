// One-off: tell everyone who got a founder email that replies to it bounced.
//
// Recipients = auth users whose app_metadata has founder_checkin_sent_at (set by
// /api/cron/founder-checkin), minus internal/test accounts and anyone already sent
// this follow-up. Dry run by default: prints recipients + the email. Pass --send to
// actually send. Each send stamps app_metadata.reply_fix_followup_sent_at so a
// re-run never double-sends.
//
//   node scripts/send-reply-fix-followup.mjs          # preview
//   node scripts/send-reply-fix-followup.mjs --send   # send
import { config as dotenvConfig } from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

const SEND = process.argv.includes("--send");
const REPLY_TO = process.env.FOUNDER_REPLY_TO ?? "enlilshalimoon@gmail.com";
const FROM = "Enlil at Lookover <enlil@uselookover.com>";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
if (!url || !serviceKey) { console.error("Missing Supabase env"); process.exit(1); }
if (SEND && !resendKey) { console.error("Missing RESEND_API_KEY"); process.exit(1); }

// Same exclusions as the check-in cron.
function isInternalEmail(email) {
  const e = email.toLowerCase();
  return (
    e.endsWith("@enlil.studio") ||
    e.endsWith("@spyre.studio") ||
    e.includes("+lk@") ||
    e.includes("+test@") ||
    e.endsWith("@example.com") ||
    e === "enlilshalimoon@gmail.com"
  );
}

function email(firstName) {
  const name = firstName?.trim() ? firstName.trim().split(" ")[0] : "there";
  const paragraphs = [
    `Hey ${name},`,
    `Enlil again, from Lookover. Quick and slightly embarrassing one: the email I sent you after you signed up had a broken reply address. If you hit reply, it bounced, and I never saw it.`,
    `If you did write back, I'm sorry. I'd still really like to hear it. Replying to this one comes straight to my personal inbox, and I read every one.`,
    `And if you never got around to trying it, no hard feelings. One honest line on why would help me a lot: bad timing, not a fit for how you work, or something didn't work.`,
  ];
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const p = "margin:0 0 14px";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:540px;margin:0 auto;padding:28px 24px">
  ${paragraphs.map((t) => `<p style="${p}">${esc(t)}</p>`).join("")}
  <p style="margin:18px 0 0">— Enlil<br><span style="color:#64748b">Founder, Lookover · uselookover.com</span></p>
</div></body></html>`;
  const text = `${paragraphs.join("\n\n")}\n\n— Enlil\nFounder, Lookover · uselookover.com`;
  return { subject: "my reply address was broken", html, text };
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// All auth users, paginated.
const authUsers = [];
for (let page = 1; ; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error("listUsers failed:", error.message); process.exit(1); }
  authUsers.push(...data.users);
  if (data.users.length < 200) break;
}

const targets = authUsers.filter((u) => {
  const meta = u.app_metadata ?? {};
  return u.email && meta.founder_checkin_sent_at && !meta.reply_fix_followup_sent_at && !isInternalEmail(u.email);
});

const { data: profiles } = await sb.from("users").select("id, full_name").in("id", targets.map((u) => u.id));
const nameById = new Map((profiles ?? []).map((r) => [r.id, r.full_name]));

console.log(`${targets.length} recipient(s), reply-to ${REPLY_TO}${SEND ? "" : " (DRY RUN)"}\n`);
for (const u of targets) console.log(`  ${u.email}  (${nameById.get(u.id) ?? "no name"})`);

if (!SEND) {
  const sample = email(nameById.get(targets[0]?.id));
  console.log(`\n--- Subject: ${sample.subject} ---\n\n${sample.text}\n`);
  console.log("Re-run with --send to send.");
  process.exit(0);
}

let sent = 0;
for (const u of targets) {
  const mail = email(nameById.get(u.id));
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: u.email, reply_to: REPLY_TO, ...mail }),
  });
  if (!res.ok) { console.error(`  FAIL ${u.email}: HTTP ${res.status} ${await res.text()}`); continue; }
  await sb.auth.admin.updateUserById(u.id, {
    app_metadata: { ...u.app_metadata, reply_fix_followup_sent_at: new Date().toISOString() },
  });
  sent++;
  console.log(`  sent ${u.email}`);
  await new Promise((r) => setTimeout(r, 600)); // stay under Resend's rate limit
}
console.log(`\nDone: ${sent}/${targets.length} sent.`);
