# Operator prompt — load the July relaunch ad set via Marketing API

> Handoff written 2026-07-19. Give this verbatim to the ops agent with Meta Marketing
> API access. It supersedes the half-built UI draft (see "Cleanup" below).
> Companion docs: `marketing/ads/campaign-agent-prompt.md` (monitoring/kill rules),
> `marketing/OFFER-POLICY.md` (copy rules), `marketing/creative-learnings.md` (context).

---

You are loading a new ad set with 5 ads into the existing Lookover campaign via the
Meta Marketing API. Build everything **PAUSED**, run the verification checklist, then
report to the founder with a one-line activation confirmation before setting anything
ACTIVE. Founder has approved $30/day for this test.

## Resources

| Resource | Value |
|---|---|
| Business Manager | `995652276760106` |
| Ad Account | `act_3154552934738836` (Lookover Ads) |
| Facebook Page | `1143663132166646` |
| Instagram | none linked — use Page-backed identity (do NOT reference an IG actor id) |
| Pixel (dataset) | `2216322015810270` |
| Campaign (existing, reuse) | `Lookover TX Pilot 1 (2026-Q2)` — id `120246801094270761`, objective OUTCOME_LEADS, ad-set-level budgets |
| Landing page | `https://www.uselookover.com/signup` |

## Cleanup first

1. A half-built UI draft exists: ad set `120249478904850761` ("AS_JUL_Relaunch_CompleteReg_TX")
   with draft ad `120249478904840761` ("Ad - iMessage thread 1x1"). **Delete both**
   (they're in draft; if the API can't see them, ignore) so there's exactly one new ad set.
2. The 5 old ad sets from June (`AS_Lead_TX_V2`, `AS_Relaunch_CompleteReg_TX`,
   `AS1_Awareness_V9`, `AS2_Filter_V7`, `AS3_Conversion_V8`) stay PAUSED. Don't touch.

## Ad set (create one)

- **Name:** `AS_JUL2_CompleteReg_TX_API`
- **Status:** PAUSED
- **Optimization goal:** OFFSITE_CONVERSIONS, promoted_object = pixel `2216322015810270`,
  custom event **CompleteRegistration**
- **Billing:** IMPRESSIONS, bid strategy LOWEST_COST_WITHOUT_CAP
- **Daily budget:** $30.00
- **Schedule:** start now, no end date
- **Geo:** US → Texas only (`geo_locations: {regions: [{key: "3886"}]}` — verify the
  region key for Texas via search API rather than trusting this value)
- **Age:** 35–60. Gender: all. Languages: default.
- **Detailed targeting (OR, keep broad-ish):** interests: Home inspection, InterNACHI,
  Real estate appraisal. If combined audience estimate < 100K, drop InterNACHI.
- **Placements (manual):** facebook feed, instagram feed, facebook stories,
  instagram stories, instagram reels. **Exclude** Audience Network and right column.
- **Advantage+ audience:** off (use classic targeting object).

## Ads (create five, all PAUSED, all linked to the Page identity)

All ads: CTA **SIGN_UP**, destination = landing page with per-ad UTMs, display link
`uselookover.com`, description field: `14-day free trial. First 50 lock in $79/mo founding pricing for life.`

Upload creatives from these public URLs (they're live; pull and upload as account media):

| # | Ad name | Creative URL | Primary text | Headline | utm_content |
|---|---|---|---|---|---|
| 1 | Ad_iMessage_1x1 | `https://www.uselookover.com/marketing/ads/round3/ad-imessage-1x1.jpg` | The 8:47 PM "is the report ready?" text hits different when you sent it at 4:30. | Same-day reports. Every day. | `imessage-thread` |
| 2 | Ad_Roof_1x1 | `https://www.uselookover.com/marketing/ads/round3/ad-roof-defect-1x1.jpg` | You saw it. It wrote it up. You approve it. | The finding drafts itself. | `roof-defect` |
| 3 | Ad_Attic_1x1 | `https://www.uselookover.com/marketing/ads/round3/ad-attic-flashlight-1x1.jpg` | Voice notes in the crawlspace become SOP findings by the truck. You approve every one. | Talk through the inspection. | `attic-flashlight` |
| 4 | Ad_Tailgate_1x1 | `https://www.uselookover.com/marketing/ads/round3/ad-tailgate-delivered-1x1.jpg` | Report delivered before you left the driveway. 14-day free trial, no card. | Done by dinner. | `tailgate-delivered` |
| 5 | Ad_UIpop_Video_1x1 | `https://www.uselookover.com/marketing/ads/round3/ad-roof-ui-pop-1x1.mp4` (6s, 1080×1080, has soft audio) | Snap the photo. Say what you see. The finding writes itself. | Capture → Draft → Done. | `uipop-video` |

URL template per ad:
`https://www.uselookover.com/signup?utm_source=meta&utm_medium=cpc&utm_campaign=jul-relaunch&utm_content=<utm_content>`

Optional (only if trivial for you): attach 9:16 variants for stories/reels placement
customization — `ad-roof-9x16.jpg`, `ad-attic-9x16.jpg`, `ad-tailgate-9x16.jpg` at the
same URL base. If it adds friction, skip; 1:1 renders acceptably in stories.

## Copy rules (hard, from OFFER-POLICY.md)

- Never "free for life" in any ad field.
- Never cost estimates / repair pricing. Never "AI-powered" in visible text.
- Scarcity hook is ONLY the $79/mo founding price for the first 50.

## Known account blockers — check before reporting done

1. **Phone verification (#3858013):** the account may refuse publishing until a
   verified phone number is added. If any create/publish call returns this error,
   STOP and surface to the founder — only they can verify (SMS).
2. No Lead-Gen ToS needed — these are website-conversion ads, no instant forms.
   If you see a leadgen ToS error you've mis-set the CTA or promoted object.
3. CompleteRegistration is currently "inactive" on the pixel (no signups in 28 days).
   Expected; proceed anyway.

## Verification checklist (run before reporting)

- [ ] Ad set targeting readback: TX only, 35–60, correct placements, $30/day
- [ ] Each ad's creative renders (fetch preview via API) and links to the right UTM URL
- [ ] All 5 ads PAUSED, old 5 ad sets untouched
- [ ] Landing page returns 200 and the pixel fires PageView (curl + Events Manager test)
- [ ] Report to founder: what was built + the activation command + any blockers hit

## After activation (once founder says go)

Monitor per `marketing/ads/campaign-agent-prompt.md` Phase 2 rules, with this override:
**evaluate at $150 spend — if 0 CompleteRegistration, pause the ad set and write a
findings report** instead of continuing to $300. Log to `marketing/ads/run-log.jsonl`
as before.
