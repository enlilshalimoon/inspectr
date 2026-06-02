"use client";

// Meta Pixel — loaded ONLY on public marketing routes.
//
// We deliberately do not load this on:
//   - authenticated app routes (/inspections, /settings, /billing, /onboarding) — would
//     leak our paying inspectors' identities to Meta
//   - client report viewer (/report/[slug]) — would track random home buyers with no consent
//   - auth callback (/auth/...) — internal redirects, no marketing signal
//
// Marketing routes (/, /sample, /login, /signup, /terms, /privacy, /data-export, /e-and-o)
// load the pixel. PageView fires on initial load (inline script) and on every client-side
// navigation between marketing pages (useEffect on pathname).
//
// Pixel ID is set via NEXT_PUBLIC_META_PIXEL_ID. When unset, the component renders nothing —
// dev/preview environments stay clean unless you explicitly add the var.

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fire a Meta Pixel standard or custom event.
 *
 * Safe to call from anywhere. Pass standard event names ("Lead",
 * "CompleteRegistration", "Subscribe", "Purchase", "ViewContent") to get
 * Meta-recognized conversions; custom names work but get less algorithmic lift.
 *
 * Generates an `eventID` so that when we add CAPI later, the same event sent
 * from the server can be deduplicated against the client-side fire.
 *
 * IMPORTANT timing note: the pixel <Script> loads with strategy="afterInteractive",
 * which means React useEffect calls fire BEFORE window.fbq is defined on the
 * very first render after navigation. We poll briefly (up to ~3s) so events
 * dispatched immediately on mount don't drop on the floor. Excluded routes
 * (where MetaPixel renders null and fbq is never defined) hit the timeout
 * and quietly stop — by design.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const eventId = `${eventName}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const fire = (): boolean => {
    if (!window.fbq) return false;
    window.fbq("track", eventName, params ?? {}, { eventID: eventId });
    return true;
  };
  if (fire()) return;
  let attempts = 0;
  const interval = setInterval(() => {
    attempts += 1;
    if (fire() || attempts > 30) clearInterval(interval);
  }, 100);
}

const EXCLUDED_PREFIXES = [
  "/inspections",
  "/settings",
  "/billing",
  "/onboarding",
  "/report/",
  "/auth/",
];

function isMarketingRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return !EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const tracked = isMarketingRoute(pathname);

  // Re-fire PageView on client-side navigation between marketing pages. The inline
  // <Script> fires PageView once on first load; this catches subsequent SPA-style
  // navigations (e.g. landing page → /sample → /signup) where the inline script doesn't
  // re-execute.
  useEffect(() => {
    if (tracked && typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, tracked]);

  // Conditional render: on excluded routes we render nothing at all — the Meta script
  // never loads, never makes a request to facebook.net. This is stricter than "load
  // but don't track" because just loading fbevents.js leaks IP + UA + referrer to Meta.
  if (!tracked) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pixelId}');fbq('track', 'PageView');`,
        }}
      />
      <noscript>
        {/* Meta-recommended noscript fallback. next/image is not appropriate here:
            it requires JS, but this is the no-JS fallback. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
