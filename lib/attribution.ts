// First-touch signup attribution.
//
// The proxy stamps a first-party cookie the first time a visitor arrives with ad
// params (utm_*, fbclid) or from an external site. Signup copies it onto the new
// account's user_metadata.signup_source, and /admin shows it — so we can tell which
// ad or channel brought each inspector, not just how many Meta says converted.

import type { NextRequest, NextResponse } from "next/server";

export const ATTRIBUTION_COOKIE = "lk_src";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;

export type SignupSource = Partial<Record<(typeof PARAMS)[number], string>> & {
  referrer?: string; // external referring host, e.g. "l.facebook.com"
  landing?: string; // first path they landed on
  at?: string; // ISO time of first touch
};

export function captureAttribution(request: NextRequest, response: NextResponse): void {
  if (request.cookies.has(ATTRIBUTION_COOKIE)) return; // first touch wins

  const url = request.nextUrl;
  const source: SignupSource = {};
  for (const key of PARAMS) {
    const v = url.searchParams.get(key);
    if (v) source[key] = v.slice(0, 200);
  }

  const ref = request.headers.get("referer");
  if (ref) {
    try {
      const host = new URL(ref).hostname;
      if (host && host !== url.hostname) source.referrer = host.slice(0, 200);
    } catch {
      // malformed referer — ignore
    }
  }

  if (Object.keys(source).length === 0) return; // direct visit: nothing to attribute
  source.landing = url.pathname.slice(0, 200);
  source.at = new Date().toISOString();

  response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(source), {
    maxAge: MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function parseAttribution(raw: string | undefined): SignupSource | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as SignupSource) : null;
  } catch {
    return null;
  }
}

// Short human label for the admin table, e.g. "facebook / paid · ad-video-2".
export function describeSource(s: SignupSource | null | undefined): string | null {
  if (!s) return null;
  const channel = s.utm_source
    ? [s.utm_source, s.utm_medium].filter(Boolean).join(" / ")
    : s.fbclid
      ? "facebook (click)"
      : s.referrer ?? null;
  if (!channel) return null;
  const detail = s.utm_content ?? s.utm_campaign;
  return detail ? `${channel} · ${detail}` : channel;
}
