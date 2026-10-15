# Lookover — current status & handoff

Living doc. Any session (cloud or local) should read this after AGENTS.md and update it before ending.
Last updated: 2026-10-15.

## Where things stand

- **Product** live at uselookover.com (push to `main` = production deploy via Vercel).
- **Signups:** ~17 real inspectors from Meta ads (Jun–Aug). As of Aug 18: 0 photos uploaded, 1 return visit. Activation is the #1 problem. Current numbers: uselookover.com/admin.
- **Ads:** the "iPhone picture" Meta ad was turned back on 2026-10-15.
- **Attribution (new, 2026-10-15):** first-touch utm_*/fbclid/referrer saved to `user_metadata.signup_source` on signup (`lib/attribution.ts`, `proxy.ts`). /admin shows a Source column. Signups before this date show "—".
- **Email replies:** founder + system email reply-to is hardcoded to enlilshalimoon@gmail.com (`lib/email/send.ts`). enlil@uselookover.com doesn't exist; hello@ delivers somewhere unread. The `FOUNDER_REPLY_TO` / `RESEND_SYSTEM_REPLY_TO` Vercel vars are no longer read.
- **Founder follow-up email:** /admin → "Founder follow-up" → Send. Finalized-a-report users get comped for life + feedback ask; everyone else gets "what did you think?". Deduped via `app_metadata.followup_sent_at`.

## Open — needs the founder

1. Press Send on the founder follow-up at /admin (if not done).
2. Connect enlilshalimoon@gmail.com as the Gmail connector (claude.ai/customize/connectors) so Claude can watch replies. The connected Gmail today is enlil@getgorgie.com (different business).
3. Test "Choose existing photos" on a real iPhone (HEIC path untested).
4. Add UTM URL parameters to every live Meta ad (see `marketing/ads/round-2.md`).
5. Test artifacts still live — delete only when the founder says: user hi+e2e0806@spyre.studio, report uselookover.com/report/arvexk33.
6. Free-for-life via the follow-up goes beyond OFFER-POLICY.md's 10-slot, video-for-lifetime rule. Founder chose this knowingly; update the policy doc if it's the new rule.

## Shipped 2026-10-15 (merged to main, live)

- `activation-fixes` — audit + low-risk fixes for signup → first drafted finding. Merged and live; untested on a real device. Onboarding now needs only a name and lands on /inspections/new; the new-inspection form shows one field; capture has a "Review drafts" banner, empty-state guidance, same-file upload retry, an `<img>` decode fallback in prepareImage, and voice/mic error messages; review has an empty state; the welcome email is sent via `after()`. Company name is now optional in Settings too (matching onboarding); the PDF drops it cleanly when blank (page footer, cover, and signature line have no stray " · " or empty line). Capture treats a non-JSON AI-route response (Vercel timeout/crash HTML page) as a readable "took too long, Try again" error instead of "Unexpected token '<'". Review follow-ups: upload Retry reuses the same photo id and storage path (no orphaned objects or duplicate drafts); onboarding rejects a 1-letter state; new-inspection errors name the field and open "More details" when the problem is in there. Still to do: on an iPhone, do signup → onboarding → new inspection → Choose existing photos (include a HEIC) → draft → voice note (allow and deny mic).
- `ads-round-2` — next ad concepts, UTM setup, kill/scale rules.

## Working rules

- No secrets in cloud sessions unless added to the environment (see AGENTS.md). Ops that need keys can run through /admin server actions, which use Vercel's env.
- Never put cost estimates in reports. Never lead ad headlines with "AI". No "free for life" in cold ads.
- Build ad campaigns PAUSED; the founder publishes. The founder does all logins and handles credentials.
- Show the founder any outbound email copy before it's sent.
