import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEntitled } from "@/lib/billing/entitlement";

// Routes that require entitlement (active trial / subscription / comp).
const GATED_PREFIXES = ["/inspections"];

// Pages that must be reachable without an auth session. Anything not listed here
// (and not matching a PUBLIC_PREFIXES entry) gets redirected to /login.
//
// Marketing pages — landing CTA, sample report, and the footer legal pages — are
// linked from outreach (TIJ posts, cold emails, future ads, FB groups). They MUST
// be public; gating them silently kills conversion because every external click
// hits a login wall and bounces.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  // Marketing / informational pages — public by design.
  "/sample",
  "/terms",
  "/privacy",
  "/data-export",
  "/e-and-o",
];

const PUBLIC_PREFIXES = [
  "/report/",
  "/api/stripe/webhook",
  "/api/cron/", // cron jobs auth via CRON_SECRET bearer, not a user session
  "/_next",
  "/icons",
  "/favicon",
];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated users hitting an auth page → bounce to dashboard.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/inspections";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Entitlement gate: the inspection workspace (the part that costs us AI spend)
  // requires an active trial, an active subscription, or a comp. Lapsed users are
  // sent to /billing. Account-management routes (/billing, /settings, /onboarding,
  // /admin) stay reachable so they can actually fix it.
  if (user && GATED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { data: prof } = await supabase
      .from("users")
      .select("subscription_status, trial_ends_at, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (prof && !isEntitled(prof)) {
      const url = request.nextUrl.clone();
      url.pathname = "/billing";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
