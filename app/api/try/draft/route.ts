// POST /api/try/draft
// Body: multipart form with one "photo" file.
//
// The public /try demo: no account, no storage. Runs the same two AI stages as
// /api/ai/process-photo (vision, then finding drafts) on the uploaded bytes and
// returns the findings: one per distinct defect in the photo, each in its own
// section and individually signed. The photo is never saved; one row per draft goes into
// try_drafts for rate limiting and counting.
//
// Every call costs two paid model calls, so it's capped per visitor (IP hash)
// and globally per day. Over a cap, the page tells them to start a trial.

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { analyzeImageBytes, draftFindings, UnsupportedImageError } from "@/lib/ai/anthropic";
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

  let vision;
  try {
    vision = await analyzeImageBytes(buf);
  } catch (err) {
    console.error("[try] vision failed:", err);
    const message =
      err instanceof UnsupportedImageError ? err.message : "Couldn't read this photo. Try another one.";
    return NextResponse.json({ error: "vision failed", message }, { status: 502 });
  }

  const photoSection = resolveSectionType(vision.section) ?? "interior";
  let findings;
  try {
    findings = await draftFindings({ section: photoSection, vision_analysis: vision, transcript: "" });
  } catch (err) {
    console.error("[try] draft failed:", err);
    return NextResponse.json(
      { error: "draft failed", message: "Read the photo, but drafting failed. Try again." },
      { status: 502 },
    );
  }

  // Sample-photo runs are tagged so usage reports can separate them from
  // inspectors trying their own photos.
  const source = await firstTouch();
  const sample = form?.get("sample") === "1";
  // One row per photo (rate limits count model calls, not findings), recording
  // the lead finding.
  const lead = findings[0];
  await db.from("try_drafts").insert({
    visitor,
    source: sample ? { ...(source ?? {}), sample: true } : source,
    section: lead.section,
    severity: lead.severity,
    title: lead.title?.slice(0, 200),
  });

  const drafts = findings.map((f) => {
    const draft = {
      section: f.section,
      section_label: labelForSection(f.section),
      finding: {
        severity: f.severity,
        title: f.title,
        description: f.description,
        recommended_action: f.recommended_action,
      },
    };
    // Lets /api/try/email check it's only sending findings we drafted.
    return { ...draft, sig: signFinding(draft) };
  });

  const res = NextResponse.json({
    // Top level is the first draft, as before; `drafts` holds every defect
    // found in the photo (first included).
    ...drafts[0],
    drafts,
    equipment: vision.equipment_data ?? null,
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
