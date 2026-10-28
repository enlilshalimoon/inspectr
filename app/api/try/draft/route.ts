// POST /api/try/draft
// Body: multipart form with one "photo" file.
//
// The public /try demo: no account, no storage. Runs the same two AI stages as
// /api/ai/process-photo (vision, then finding draft) on the uploaded bytes and
// returns the finding. The photo is never saved; one row per draft goes into
// try_drafts for rate limiting and counting.
//
// Every call costs two paid model calls, so it's capped per visitor (IP hash)
// and globally per day. Over a cap, the page tells them to start a trial.

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { analyzeImageBytes, draftFinding, UnsupportedImageError } from "@/lib/ai/anthropic";
import { resolveSectionType } from "@/lib/inspection/photos";
import { labelForSection } from "@/lib/supabase/sections";
import { ATTRIBUTION_COOKIE, parseAttribution } from "@/lib/attribution";

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

  const section = resolveSectionType(vision.section) ?? "interior";
  let finding;
  try {
    finding = await draftFinding({ section, vision_analysis: vision, transcript: "" });
  } catch (err) {
    console.error("[try] draft failed:", err);
    return NextResponse.json(
      { error: "draft failed", message: "Read the photo, but drafting failed. Try again." },
      { status: 502 },
    );
  }

  await db.from("try_drafts").insert({
    visitor,
    source: await firstTouch(),
    section,
    severity: finding.severity,
    title: finding.title?.slice(0, 200),
  });

  return NextResponse.json({
    section,
    section_label: labelForSection(section),
    finding: {
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      recommended_action: finding.recommended_action,
    },
    equipment: vision.equipment_data ?? null,
  });
}

function visitorHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.CRON_SECRET ?? "lookover-try";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

async function firstTouch() {
  return parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
}
