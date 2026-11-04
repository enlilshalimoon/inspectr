// Signs each finding the /try demo drafts, so /api/try/email only ever sends text
// our own model wrote. Without this, the public route would let anyone send
// arbitrary content to any address from our domain.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export type SignedFinding = {
  section: string;
  section_label: string;
  finding: {
    severity: string;
    title: string;
    description: string;
    recommended_action: string;
  };
};

function digest(secret: string, d: SignedFinding): string {
  const f = d.finding;
  const payload = JSON.stringify([
    d.section,
    d.section_label,
    f.severity,
    f.title,
    f.description,
    f.recommended_action,
  ]);
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signFinding(d: SignedFinding): string | null {
  const secret = process.env.CRON_SECRET;
  return secret ? digest(secret, d) : null;
}

export function verifyFinding(d: SignedFinding, sig: unknown): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || typeof sig !== "string") return false;
  const a = Buffer.from(digest(secret, d));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function visitorHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.CRON_SECRET ?? "lookover-try";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
