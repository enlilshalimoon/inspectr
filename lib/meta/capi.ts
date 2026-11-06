// Server-side Meta Conversions API for signup events.
//
// The browser pixel misses signups on iOS and behind ad blockers. Sending the same
// events from the server, with the same event_id the browser used, lets Meta count
// each signup once whichever side reaches it.
//
// user_data carries only what the privacy policy already says the pixel sends (IP,
// browser, page) plus Meta's own click/browser ids. No email or user id, not even
// hashed: adding those needs a privacy policy update first.
//
// Needs META_CAPI_ACCESS_TOKEN and NEXT_PUBLIC_META_PIXEL_ID. When either is unset
// this is a no-op, so dev and preview stay clean. Sends are best-effort: callers
// must not fail signup if this fails.

const GRAPH_VERSION = "v23.0";

export type CapiEvent = {
  name: string;
  eventId: string;
  customData?: Record<string, unknown>;
};

export type CapiContext = {
  eventTime: number; // unix seconds
  sourceUrl: string;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

// The _fbc cookie is set by the pixel script, so it's missing exactly when the pixel
// was blocked. Rebuild it from the fbclid the proxy captured (lib/attribution.ts).
export function fbcFromAttribution(
  source: { fbclid?: string; at?: string } | null | undefined,
): string | null {
  if (!source?.fbclid) return null;
  const at = source.at ? Date.parse(source.at) : NaN;
  if (Number.isNaN(at)) return null;
  return `fb.1.${at}.${source.fbclid}`;
}

export function buildCapiData(events: CapiEvent[], ctx: CapiContext) {
  const userData: Record<string, string> = {};
  if (ctx.ip) userData.client_ip_address = ctx.ip;
  if (ctx.userAgent) userData.client_user_agent = ctx.userAgent;
  if (ctx.fbp) userData.fbp = ctx.fbp;
  if (ctx.fbc) userData.fbc = ctx.fbc;

  return events.map((e) => ({
    event_name: e.name,
    event_id: e.eventId,
    event_time: ctx.eventTime,
    event_source_url: ctx.sourceUrl,
    action_source: "website",
    user_data: userData,
    ...(e.customData ? { custom_data: e.customData } : {}),
  }));
}

export async function sendCapiEvents(events: CapiEvent[], ctx: CapiContext): Promise<void> {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!token || !pixelId) return;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: buildCapiData(events, ctx),
        access_token: token,
        // Set while checking events in Events Manager > Test Events.
        ...(process.env.META_CAPI_TEST_EVENT_CODE
          ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
          : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[capi] meta rejected events:", res.status, await res.text());
  } catch (err) {
    console.error("[capi] send failed:", err);
  }
}
