// GET /api/cron/founder-checkin            (send)
// GET /api/cron/founder-checkin?dry=1      (report who would get what; sends nothing)
//
// Daily cron (see vercel.json; once a day is the Vercel Hobby cron cap). Sends the
// automatic founder emails to new inspectors, at most one per inspector per run:
//   - stage nudges: stuck 24h at a funnel step (no inspection / no photos / nothing
//     approved / not delivered), each stage once, for signups in the last 14 days
//   - the original 2-5 day "how's it going?" check-in, for inspectors who haven't
//     started an inspection
// with no founder email of any kind within 48h of the last one. The rules live in
// lib/email/nudges.ts (pure, unit-tested); this route only loads data and sends.
//
// Dedup lives in auth app_metadata (founder_checkin_sent_at, nudges_sent: {stage:
// iso}), NOT a DB column — the direct Postgres connection used by migrations is
// currently broken, so we keep everything on the REST/admin API that the live app
// already uses.
//
// Auth: Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when the
// CRON_SECRET env var is set. We reject anything without the matching bearer, so the
// endpoint can't be triggered by randoms (dry runs included: they list emails).

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { founderCheckinEmail, founderNudgeEmail, sendFounderEmail } from "@/lib/email/send";
import { isInternalEmail } from "@/lib/email/internal";
import { roleFromMetadata, type SignupRole } from "@/lib/signup-role";
import { listAllAuthUsers } from "@/lib/admin/followup";
import {
  CHECKIN_MAX_MS,
  NUDGE_WINDOW_MS,
  decideFounderEmail,
  nudgesSent,
  type InspectionProgress,
} from "@/lib/email/nudges";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }
  const sb = createServiceClient();

  const now = Date.now();
  // Everyone who could get anything today: the nudge window covers the check-in's.
  const since = new Date(now - Math.max(NUDGE_WINDOW_MS, CHECKIN_MAX_MS)).toISOString();

  const { data: candidates, error } = await sb
    .from("users")
    .select("id, email, full_name, company_name, created_at, onboarding_completed_at")
    .gte("created_at", since);
  if (error) {
    console.error("[cron founder-checkin] query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const users = candidates ?? [];
  const ids = users.map((u) => u.id as string);

  // Batch-load progress + auth metadata. If metadata can't be read, bail rather than
  // risk duplicate sends.
  let metaById: Map<string, Record<string, unknown>>;
  let roleById: Map<string, SignupRole | null>;
  let progressByUser: Map<string, InspectionProgress[]>;
  try {
    const authUsers = await listAllAuthUsers(sb);
    metaById = new Map(authUsers.map((a) => [a.id, a.app_metadata ?? {}]));
    roleById = new Map(authUsers.map((a) => [a.id, roleFromMetadata(a.user_metadata)]));
    progressByUser = await loadProgress(sb, ids);
  } catch (err) {
    console.error("[cron founder-checkin] load failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const summary = { considered: users.length, sent: 0, skipped: 0, failed: 0, dry };
  const detail: Array<{ email: string; action: string; subject?: string }> = [];

  for (const u of users) {
    const email = ((u.email as string | null) ?? "").trim();
    if (!email || isInternalEmail(email)) {
      summary.skipped += 1;
      detail.push({ email: email || "(none)", action: "skip:internal-or-no-email" });
      continue;
    }
    const appMeta = metaById.get(u.id);
    if (!appMeta) {
      summary.skipped += 1;
      detail.push({ email, action: "skip:no-auth-user" });
      continue;
    }

    const decision = decideFounderEmail(
      {
        signupAt: u.created_at,
        onboardedAt: u.onboarding_completed_at,
        inspections: progressByUser.get(u.id) ?? [],
        appMetadata: appMeta,
        role: roleById.get(u.id) ?? null,
      },
      now,
    );

    if (decision.action === "skip") {
      summary.skipped += 1;
      detail.push({ email, action: `skip:${decision.reason}` });
      if (decision.markCheckinDone && !dry) {
        await markSent(sb, u.id, { ...appMeta, founder_checkin_sent_at: new Date().toISOString() });
      }
      continue;
    }

    const label = decision.action === "nudge" ? `nudge:${decision.stage}` : `checkin:${decision.variant}`;
    const mail =
      decision.action === "nudge"
        ? founderNudgeEmail({
            stage: decision.stage,
            firstName: u.full_name,
            propertyAddress: decision.inspection?.address ?? null,
          })
        : founderCheckinEmail({
            variant: decision.variant,
            firstName: u.full_name,
            companyName: u.company_name,
          });

    if (dry) {
      summary.sent += 1;
      detail.push({ email, action: `would-send:${label}`, subject: mail.subject });
      continue;
    }

    const res = await sendFounderEmail({ to: email, ...mail });
    if (!res.ok) {
      summary.failed += 1;
      detail.push({ email, action: `fail:${label}:${res.error ?? "unknown"}` });
      continue;
    }
    const stamp = new Date().toISOString();
    await markSent(
      sb,
      u.id,
      decision.action === "nudge"
        ? { ...appMeta, nudges_sent: { ...nudgesSent(appMeta), [decision.stage]: stamp } }
        : { ...appMeta, founder_checkin_sent_at: stamp },
    );
    summary.sent += 1;
    detail.push({ email, action: `sent:${label}`, subject: mail.subject });
  }

  console.log("[cron founder-checkin]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary, detail });
}

type ServiceClient = ReturnType<typeof createServiceClient>;

async function markSent(
  sb: ServiceClient,
  userId: string,
  appMetadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await sb.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
  if (error) console.error("[cron founder-checkin] markSent failed for", userId, error.message);
}

// Per-user inspection progress: photo counts, findings drafted/approved, and the
// latest activity timestamps the stall clock runs from.
async function loadProgress(
  sb: ServiceClient,
  userIds: string[],
): Promise<Map<string, InspectionProgress[]>> {
  const out = new Map<string, InspectionProgress[]>();
  if (userIds.length === 0) return out;

  const { data: insps, error } = await sb
    .from("inspections")
    .select("id, inspector_id, property_address, created_at, finalized_at, delivered_at")
    .in("inspector_id", userIds);
  if (error) throw new Error(`inspections: ${error.message}`);
  const inspIds = (insps ?? []).map((i) => i.id as string);

  const [photos, findings] = inspIds.length
    ? await Promise.all([
        sb.from("photos").select("inspection_id, created_at").in("inspection_id", inspIds),
        sb
          .from("findings")
          .select("inspection_id, is_approved, updated_at")
          .in("inspection_id", inspIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (photos.error) throw new Error(`photos: ${photos.error.message}`);
  if (findings.error) throw new Error(`findings: ${findings.error.message}`);

  const later = (a: string | null, b: string) => (a && a > b ? a : b);
  const byInsp = new Map<string, InspectionProgress>();
  for (const i of insps ?? []) {
    const p: InspectionProgress = {
      id: i.id,
      address: i.property_address ?? null,
      createdAt: i.created_at,
      photoCount: 0,
      lastPhotoAt: null,
      findingCount: 0,
      approvedCount: 0,
      lastFindingAt: null,
      finalizedAt: i.finalized_at ?? null,
      deliveredAt: i.delivered_at ?? null,
    };
    byInsp.set(i.id, p);
    const list = out.get(i.inspector_id) ?? [];
    list.push(p);
    out.set(i.inspector_id, list);
  }
  for (const ph of photos.data ?? []) {
    const p = byInsp.get(ph.inspection_id);
    if (!p) continue;
    p.photoCount += 1;
    p.lastPhotoAt = later(p.lastPhotoAt, ph.created_at);
  }
  for (const f of findings.data ?? []) {
    const p = byInsp.get(f.inspection_id);
    if (!p) continue;
    p.findingCount += 1;
    if (f.is_approved) p.approvedCount += 1;
    p.lastFindingAt = later(p.lastFindingAt, f.updated_at);
  }
  return out;
}
