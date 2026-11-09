// POST /api/try/email
// Body: { email, sample?, unlock?, drafts: [{ section, section_label, finding, sig }] }
//
// Records a /try visitor's address in try_leads and, unless `unlock` is set, emails
// them the findings the demo just drafted. `unlock: true` is the soft gate on /try
// (findings after the first show once an email is given): it saves the lead and
// sends nothing. Only findings signed by /api/try/draft are accepted, and calls are
// capped per visitor, per address and globally per day.
//
// The lead row is written before any send and its insert error is logged, so a
// failed or slow send can't lose the lead (try_leads was empty for this reason).

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { ATTRIBUTION_COOKIE, parseAttribution } from "@/lib/attribution";
import { FOUNDER_REPLY_TO, sendSystemEmail, tryFindingsEmail } from "@/lib/email/send";
import { isInternalEmail } from "@/lib/email/internal";
import { verifyFinding, visitorHash, type SignedFinding } from "@/lib/try/sign";

const PER_VISITOR_PER_DAY = 5;
const PER_EMAIL_PER_DAY = 3;
const GLOBAL_PER_DAY = 100;
// 15 photos, up to 4 findings each (one per defect in the photo).
const MAX_FINDINGS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function bad(status: number, message: string) {
  return NextResponse.json({ error: "rejected", message }, { status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return bad(400, "That email address doesn't look right.");
  }

  const raw: unknown[] = Array.isArray(body?.drafts) ? body.drafts : [];
  if (raw.length === 0 || raw.length > MAX_FINDINGS) return bad(400, "No findings to send.");

  const drafts: SignedFinding[] = [];
  for (const item of raw) {
    const d = item as (SignedFinding & { sig?: unknown }) | null;
    const f = d?.finding;
    if (!d || !f) return bad(400, "Those findings couldn't be verified. Run the photos again.");
    const draft: SignedFinding = {
      section: String(d.section),
      section_label: String(d.section_label),
      finding: {
        severity: String(f.severity),
        title: String(f.title),
        description: String(f.description),
        recommended_action: String(f.recommended_action ?? ""),
      },
    };
    if (!verifyFinding(draft, d.sig)) {
      return bad(400, "Those findings couldn't be verified. Run the photos again.");
    }
    drafts.push(draft);
  }

  const db = createServiceClient();
  const visitor = visitorHash(req);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const count = (filter?: { column: string; value: string }) => {
    let q = db.from("try_leads").select("id", { count: "exact", head: true }).gte("created_at", since);
    if (filter) q = q.eq(filter.column, filter.value);
    return q;
  };
  const [{ count: mine }, { count: toAddress }, { count: all }] = await Promise.all([
    count({ column: "visitor", value: visitor }),
    count({ column: "email", value: email }),
    count(),
  ]);
  if (
    (mine ?? 0) >= PER_VISITOR_PER_DAY ||
    (toAddress ?? 0) >= PER_EMAIL_PER_DAY ||
    (all ?? 0) >= GLOBAL_PER_DAY
  ) {
    return bad(429, "That's the limit for today. Try again tomorrow.");
  }

  const source = parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
  const sample = body?.sample === true;
  const unlock = body?.unlock === true;
  const internal = isInternalEmail(email) || email === FOUNDER_REPLY_TO;

  const { data: lead, error: insertError } = await db
    .from("try_leads")
    .insert({
      visitor,
      email,
      source,
      finding_count: drafts.length,
      sample,
      internal,
      purpose: unlock ? "unlock" : "email",
      sent: false,
    })
    .select("id")
    .single();
  if (insertError) console.error("[try/email] try_leads insert failed:", insertError.message);

  if (unlock) {
    // The gate never blocks on our database: if the insert failed the visitor still
    // sees their findings, and the error is in the logs above.
    await notifyFounder(email, drafts.length, source?.utm_campaign, sample, internal, "unlocked");
    return NextResponse.json({ ok: true });
  }

  const message = tryFindingsEmail({ drafts, appUrl: req.nextUrl.origin });
  const result = await sendSystemEmail({ to: email, ...message });
  if (lead?.id) {
    const { error } = await db.from("try_leads").update({ sent: result.ok }).eq("id", lead.id);
    if (error) console.error("[try/email] try_leads sent flag failed:", error.message);
  }
  if (!result.ok) {
    console.error("[try/email] findings email failed for lead", lead?.id ?? "(not saved)");
    return bad(502, "Couldn't send that just now. Try again in a minute.");
  }

  await notifyFounder(email, drafts.length, source?.utm_campaign, sample, internal, "asked for");
  return NextResponse.json({ ok: true });
}

// Tell the founder right away: this is the one person from the demo we can reach.
// Internal mail only (to FOUNDER_REPLY_TO); nothing goes to the visitor here.
async function notifyFounder(
  email: string,
  findings: number,
  utmCampaign: string | undefined,
  sample: boolean,
  internal: boolean,
  verb: "asked for" | "unlocked",
) {
  if (internal) return;
  const campaign = utmCampaign ?? "no campaign";
  const summary = `${email} ${verb} ${findings} finding${findings === 1 ? "" : "s"} on /try (${campaign}${sample ? ", sample photos" : ""}).`;
  await sendSystemEmail({
    to: FOUNDER_REPLY_TO,
    // Unlocks get their own subject: the signup monitor's one-note follow-up keys on
    // "New /try lead" (people who asked for an email), and unlock leads haven't been
    // approved for any follow-up.
    subject: verb === "unlocked" ? `New /try unlock (no follow-up): ${email}` : `New /try lead: ${email}`,
    text: summary,
    html: `<p>${summary.replace(/[&<>"']/g, "")}</p>`,
  });
}
