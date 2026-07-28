// GET /api/cron/founder-checkin
//
// Daily cron (see vercel.json). Sends the personal founder "how's it going?" email
// ~2-3 days after signup, branching on where the inspector got stuck. Runs once a day
// (Vercel Hobby cron cap); the 2-5 day window + a per-user sent flag mean each
// inspector gets exactly one, even if a daily run is missed.
//
// Dedup + backfill live in auth app_metadata (founder_checkin_sent_at), NOT a DB
// column — the direct Postgres connection used by migrations is currently broken, so
// we keep everything on the REST/admin API that the live app already uses.
//
// Auth: Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when the
// CRON_SECRET env var is set. We reject anything without the matching bearer, so the
// endpoint can't be triggered by randoms.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  founderCheckinEmail,
  sendFounderEmail,
  type CheckinVariant,
} from "@/lib/email/send";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Don't email our own test/internal accounts if one ever slips past the backfill.
function isInternalEmail(email: string): boolean {
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

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Mark a user as check-in-sent (flag lives in auth app_metadata). Closure over sb.
  const markSent = async (
    userId: string,
    existingAppMeta: Record<string, unknown>,
  ): Promise<void> => {
    try {
      await sb.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...existingAppMeta,
          founder_checkin_sent_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[cron founder-checkin] markSent failed for", userId, err);
    }
  };

  const now = Date.now();
  const olderThan = new Date(now - 2 * DAY_MS).toISOString(); // signed up ≥ 2 days ago
  const newerThan = new Date(now - 5 * DAY_MS).toISOString(); // …but ≤ 5 days ago (no back-catalog)

  // Candidates: signed up in the 2-5 day window.
  const { data: candidates, error } = await sb
    .from("users")
    .select("id, email, full_name, company_name, created_at, onboarding_completed_at")
    .gte("created_at", newerThan)
    .lte("created_at", olderThan);

  if (error) {
    console.error("[cron founder-checkin] query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = { considered: candidates?.length ?? 0, sent: 0, skipped: 0, failed: 0 };
  const detail: Array<{ email: string; action: string; variant?: string }> = [];

  for (const u of candidates ?? []) {
    const email = (u.email ?? "").trim();
    if (!email || isInternalEmail(email)) {
      summary.skipped += 1;
      detail.push({ email: email || "(none)", action: "skip:internal-or-no-email" });
      continue;
    }

    // Dedup: already sent? (flag lives in auth app_metadata)
    let appMeta: Record<string, unknown> = {};
    try {
      const { data: authUser } = await sb.auth.admin.getUserById(u.id);
      appMeta = (authUser?.user?.app_metadata as Record<string, unknown>) ?? {};
    } catch {
      // If we can't read the flag, skip rather than risk a duplicate send.
      summary.skipped += 1;
      detail.push({ email, action: "skip:metadata-read-failed" });
      continue;
    }
    if (appMeta.founder_checkin_sent_at) {
      summary.skipped += 1;
      detail.push({ email, action: "skip:already-sent" });
      continue;
    }

    // Inspectors who already finalized a report get the separate first-inspection
    // feedback email — don't double up on founder emails.
    const { count: finalizedCount } = await sb
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("inspector_id", u.id)
      .not("finalized_at", "is", null);
    if ((finalizedCount ?? 0) > 0) {
      summary.skipped += 1;
      detail.push({ email, action: "skip:has-finalized-inspection" });
      // still mark sent so we don't re-check them every day
      await markSent(u.id, appMeta);
      continue;
    }

    const variant: CheckinVariant = u.onboarding_completed_at
      ? "no_inspection"
      : "onboarding_incomplete";
    const mail = founderCheckinEmail({
      variant,
      firstName: u.full_name,
      companyName: u.company_name,
    });

    const res = await sendFounderEmail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (res.ok) {
      await markSent(u.id, appMeta);
      summary.sent += 1;
      detail.push({ email, action: "sent", variant });
    } else {
      summary.failed += 1;
      detail.push({ email, action: `fail:${res.error ?? "unknown"}`, variant });
    }
  }

  console.log("[cron founder-checkin]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary, detail });
}
