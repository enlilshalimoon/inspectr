// POST /api/try/draft
// Body: multipart form with one "photo" file.
//
// The public /try demo (/go, /tx and /fl redirect here): no account, no storage.
// One model call looks at the uploaded bytes and drafts findings. It may return
// one draft per distinct defect, or a single "no defect visible" / "photo unclear"
// draft instead of inventing a defect. The photo is never saved. One row per
// photo goes into try_drafts for rate limiting and counting (the cap counts
// photos, not findings).
//
// Every call is a paid model call with an image, so it's capped per visitor (IP
// hash) and globally per day. Over a cap, the page tells them to start a trial.

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { draftFindingsFromImage, UnsupportedImageError } from "@/lib/ai/anthropic";
import { resolveSectionType } from "@/lib/inspection/photos";
import { labelForSection } from "@/lib/supabase/sections";
import { ATTRIBUTION_COOKIE, parseAttribution } from "@/lib/attribution";
import { signFinding, visitorHash } from "@/lib/try/sign";
import { TRY_VISITOR_COOKIE, TRY_VISITOR_MAX_AGE } from "@/lib/try/signup-link";

export const maxDuration = 60;

const PER_VISITOR_PER_DAY = 15;
const GLOBAL_PER_DAY = 300;
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "no photo", message: "No photo came through. Try again." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "too large", message: "That photo is too large. Try a smaller one." },
      { status: 413 },
    );
  }

  const db = createServiceClient();
  const visitor = visitorHash(req);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: mine }, { count: all }] = await Promise.all([
    db.from("try_drafts").select("id", { count: "exact", head: true }).eq("visitor", visitor).gte("created_at", since),
    db.from("try_drafts").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  if ((mine ?? 0) >= PER_VISITOR_PER_DAY || (all ?? 0) >= GLOBAL_PER_DAY) {
    return NextResponse.json(
      {
        error: "limit",
        message:
          "That's the limit for the demo today. Start a free trial to run a full inspection — no card needed.",
      },
      { status: 429 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await draftFindingsFromImage(buf);
  } catch (err) {
    console.error("[try] photo finding failed:", err);
    const message =
      err instanceof UnsupportedImageError ? err.message : "Couldn't draft this photo. Try again or try another one.";
    return NextResponse.json({ error: "draft failed", message }, { status: 502 });
  }

  const source = await firstTouch();
  const sample = form?.get("sample") === "1";
  const drafts = parsed.findings.map((f) => {
    const section = resolveSectionType(f.section) ?? "interior";
    const draft = {
      section,
      section_label: labelForSection(section),
      finding: {
        severity: f.severity,
        title: f.title,
        description: f.description,
        recommended_action: f.recommended_action,
      },
    };
    // `result` is not part of the email signature. It tells the page whether
    // this draft is a defect, no defect, or an unclear photo.
    return { ...draft, result: parsed.result, sig: signFinding(draft) };
  });

  const lead = drafts[0];
  await db.from("try_drafts").insert({
    visitor,
    source: sample ? { ...(source ?? {}), sample: true } : source,
    section: lead.section,
    severity: lead.finding.severity,
    title: lead.finding.title?.slice(0, 200),
  });

  const res = NextResponse.json({
    // Top level is the first draft, as before; `drafts` holds every finding
    // from the photo (the first one included).
    ...lead,
    drafts,
    equipment: parsed.equipment_data ?? null,
  });
  // Lets signup link the new account to this demo run (lib/try/signup-link.ts).
  res.cookies.set(TRY_VISITOR_COOKIE, visitor, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TRY_VISITOR_MAX_AGE,
  });
  return res;
}

async function firstTouch() {
  return parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
}
