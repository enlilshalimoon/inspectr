// POST /api/try/email
// Body: { email, sample?, drafts: [{ section, section_label, finding, sig }] }
//
// Emails a /try visitor the findings the demo just drafted for them, and records
// the address in try_leads. Only findings signed by /api/try/draft are accepted,
// and sends are capped per visitor, per address and globally per day.

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
const MAX_FINDINGS = 15;
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

  const message = tryFindingsEmail({ drafts, appUrl: req.nextUrl.origin });
  const result = await sendSystemEmail({ to: email, ...message });

  const source = parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
  const sample = body?.sample === true;
  await db.from("try_leads").insert({
    visitor,
    email,
    source,
    finding_count: drafts.length,
    sample,
    sent: result.ok,
  });

  if (!result.ok) return bad(502, "Couldn't send that just now. Try again in a minute.");

  // Tell the founder right away: this is the one person from the demo we can reach.
  if (!isInternalEmail(email) && email !== FOUNDER_REPLY_TO) {
    const campaign = source?.utm_campaign ?? "no campaign";
    const summary = `${email} asked for ${drafts.length} findings from /try (${campaign}${sample ? ", sample photos" : ""}).`;
    await sendSystemEmail({
      to: FOUNDER_REPLY_TO,
      subject: `New /try lead: ${email}`,
      text: summary,
      html: `<p>${summary.replace(/[&<>"']/g, "")}</p>`,
    });
  }

  return NextResponse.json({ ok: true });
}
