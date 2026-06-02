# Lookover — Meta ads operator playbook

This is the runbook for the Lookover (`uselookover.com`) Meta ads program. It's one workstream of the larger ops portfolio — drop it into your existing rotation and follow the phases in order.

The program is a $300, ~14-day Texas pilot for an AI-assisted home-inspection report tool. Audience is licensed residential home inspectors. The job: brand-legitimacy prep, launch a 3-ad-set campaign with 6 creatives, monitor every 12 hours, iterate creative against winners, kill cleanly at budget or threshold.

---

## Resources

| Resource | Value |
|---|---|
| Brand | Lookover |
| Website | `https://www.uselookover.com` |
| Business Manager ID | `995652276760106` |
| Facebook Page ID | `1143663132166646` |
| Instagram Business account | Look up via `GET /{page_id}?fields=instagram_business_account`. Create + link in Phase 0 if missing. |
| Ad Account | Look up via `GET /me/adaccounts` — use the one named `Lookover Ads`. |
| Meta Pixel ID | `2216322015810270` |
| Domain (Meta-verified) | `uselookover.com` |
| Creative gen model | Higgsfield `nano_banana_pro` |

Conversion events already firing on the site:

| Event | Where | Optimize for |
|---|---|---|
| `PageView` | Every marketing route | Reach only — don't optimize against it |
| `Lead` | `/signup` page mount | Awareness + Filter ad sets |
| `CompleteRegistration` | Signup submit success | Conversion ad set |

If Aggregated Event Measurement isn't configured for the pixel, set priority: `CompleteRegistration` > `Lead` > `ViewContent` > `PageView`. Required for iOS attribution.

---

## Phase 0 — Brand legitimacy prep (run before any ad goes live)

Lookover is a young brand. A new advertiser with a bare Page and no Instagram gets manually reviewed by Meta for days, gets flagged low-trust, and bounces real inspectors who click an ad and land on an empty Page. Fix all of this before launch.

### Facebook Page audit

Pull the Page via `GET /{page_id}?fields=name,about,description,category,emails,phone,website,location,cover,picture,fan_count,published_posts.limit(5)`. Fix any gap:

| Field | Target value | API |
|---|---|---|
| `name` | `Lookover` | `POST /{page_id}` |
| `category` | `Software` / `Software Company` / `App Page` | `POST /{page_id}` |
| `about` | `AI-assisted inspection reports for residential home inspectors. You approve every finding.` | `POST /{page_id}` |
| `description` | Long-form copy in §appendix A | `POST /{page_id}` |
| `website` | `https://www.uselookover.com` | `POST /{page_id}` |
| `emails` | `hello@uselookover.com` | `POST /{page_id}` |
| Profile picture | Square Lookover wordmark, min 320×320. Stopgap: square crop of `https://www.uselookover.com/og.png`. | `POST /{page_id}/picture?url=...` |
| Cover photo | `https://www.uselookover.com/marketing/hero-capture-draft-done.webp` (1640×856-ish crop) | `POST /{page_id}/photos` then set as cover |
| CTA button | `Sign Up` → `https://www.uselookover.com/signup` | Page CTA API |
| Published posts | ≥ 3 (seed in step below) | — |

### Instagram Business account

Ads run ~50% better on IG inventory when a real linked IG Business account exists vs. the FB-Page-placeholder fallback. Verify or create:

1. Check: `GET /{page_id}?fields=instagram_business_account`
2. If absent, surface to the founder — IG account creation requires the mobile app, not API. Instructions:
   - Open Instagram on mobile, create account with username `uselookover` (or `lookover.app` if taken), email `hello@uselookover.com`
   - Switch to Professional → Business → Category: Software
   - Settings → Account → Linked Accounts → connect to Lookover Facebook Page
3. Once linked, populate where supported via API, otherwise surface to founder:
   - Profile photo: matches FB Page
   - Bio: `AI-assisted inspection reports. You approve every finding. → uselookover.com`
   - Website: `https://www.uselookover.com/signup`
   - Category: `Software`
   - Contact: `hello@uselookover.com`

### Seed 5 organic posts on Page + mirror to IG

Space these 2–6 hours apart so they don't all hit at once. `POST /{page_id}/photos` for FB; `POST /{ig_user_id}/media` then `/media_publish` for IG. All images are live at `https://www.uselookover.com/marketing/{filename}`.

| # | Image | Caption |
|---|---|---|
| 1 | `hero-capture-draft-done.webp` | `Capture. Draft. Done. — Photo + voice in, SOP-language report out. 30 minutes per report, not 3 hours of typing. Built for residential home inspectors.` |
| 2 | `phone-capture-finding.webp` | `Walk the property. Talk through what you see. Lookover drafts the finding in standard SOP language before you're back to your truck.` |
| 3 | `laptop-review-hand.webp` | `Review every finding on the laptop. Edit anything. Change severity. Approve. Your license. Your sign-off.` |
| 4 | `phone-share-report.webp` | `Same-day delivery to your client. Branded as you. Mobile-friendly share link, PDF if they want one. No more 4 a.m. emails.` |
| 5 | `pdf-report-page.webp` | `Standard InterNACHI SOP language. 86% benchmark accuracy on a 29-case test set, before your review.` |

### Cross-link sanity check

- FB Page ↔ Instagram Business ✓
- FB Page ↔ Pixel `2216322015810270`
- FB Page ↔ Business Manager `995652276760106`
- Ad Account ↔ FB Page

### Gate

Write `marketing/ads/brand-audit.md` summarizing each check + any items requiring founder action. Hold launch until everything's green or the founder explicitly OKs gaps.

---

## Phase 1 — Campaign launch

### Campaign

| Field | Value |
|---|---|
| Name | `Lookover TX Pilot 1 (2026-Q2)` |
| Objective | `OUTCOME_LEADS` (Sales w/ custom conversion event) |
| Buying type | `AUCTION` |
| Special categories | none |
| CBO | off (ad-set-level budgets so per-creative kill rules work) |

### 3 ad sets — same audience, different creative funnel position

| Ad set | Optimize for | Daily budget | Creative |
|---|---|---|---|
| **AS1 Awareness** | `Lead` | $10/day | V9 — Procore-style photo+overlay |
| **AS2 Filter** | `Lead` | $10/day | V7 — Finding-as-hero |
| **AS3 Conversion** | `CompleteRegistration` | $10/day | V8 — Stat + readable phone UI |

Shared targeting:

- **Geo:** US — Texas. Add Florida only after Texas spends > $50 with reach > 10K.
- **Age:** 35–60. Gender: all. Language: English.
- **Interests (AND, narrow):** Home inspection, Real estate appraisal, InterNACHI, Real estate brokers
- **Behaviors:** Small business owners
- **Exclude:** all-time visitors who hit `CompleteRegistration` (skip if zero)
- **Placements:** FB Feed, IG Feed, FB Stories, IG Stories, IG Reels. Disable Audience Network + right column.
- **Bid:** lowest-cost
- **Schedule:** start now, end when total campaign spend hits $300

### 6 ads — 3 creatives × 2 aspect ratios

Each ad set gets 2 ads (1:1 for feeds, 9:16 for stories/reels) sharing the same copy.

| Variant | 1:1 URL | 9:16 URL |
|---|---|---|
| V7 — Finding hero | `https://d8j0ntlcm91z4.cloudfront.net/user_37GITGrVndbHmqIkgRdaViXHRAT/hf_20260602_065001_9a30eec5-b850-4942-a9df-221ca24c9632.png` | `https://d8j0ntlcm91z4.cloudfront.net/user_37GITGrVndbHmqIkgRdaViXHRAT/hf_20260602_070205_83b65f28-3322-43b6-bb1f-67cd3afc518a.png` |
| V8 — Stat + phone | `https://d8j0ntlcm91z4.cloudfront.net/user_37GITGrVndbHmqIkgRdaViXHRAT/hf_20260602_065015_51a27238-44de-442a-adb2-92de46ed1102.png` | `https://d8j0ntlcm91z4.cloudfront.net/user_37GITGrVndbHmqIkgRdaViXHRAT/hf_20260602_070218_cb1c2083-2d41-49f0-846d-6f8f077f0d1a.png` |
| V9 — Procore style | `https://d8j0ntlcm91z4.cloudfront.net/user_37GITGrVndbHmqIkgRdaViXHRAT/hf_20260602_065032_b91fc407-34fe-4378-9cb3-83ecbec9d9b7.png` | `https://d8j0ntlcm91z4.cloudfront.net/user_37GITGrVndbHmqIkgRdaViXHRAT/hf_20260602_070233_1b2ca4a4-d7dc-4526-bfbe-ae8779609f9f.png` |

Local backups: `public/marketing/ads/_ad-variant-{7,8,9}{,-9x16}.png`.

### Copy per variant

**V7 — Finding hero (AS2 Filter)**

- Primary: `Capture the photos. Talk through the findings. Lookover drafts the report in standard SOP language before you're back to your truck. You approve every finding before anything goes to the client. Built by an inspector for inspectors.`
- Headline: `30-min reports. Still your license.`
- Description: `14-day free trial. No card. Up to 3 inspections.`
- CTA: `LEARN_MORE`
- URL: `https://www.uselookover.com/sample?utm_source=meta&utm_medium=cpc&utm_campaign=tx-pilot-1&utm_content=v7-finding-hero`

**V8 — Stat + phone (AS3 Conversion)**

- Primary: `Stop typing reports past midnight. Lookover drafts your findings in standard InterNACHI SOP language while you walk the property. You review, edit, approve — every finding, every time. Branded PDF goes to your client same day. 86% SOP alignment on a 29-case benchmark (before your review).`
- Headline: `30 min reports, not 3 hours.`
- Description: `14-day free trial. No card.`
- CTA: `SIGN_UP`
- URL: `https://www.uselookover.com/signup?utm_source=meta&utm_medium=cpc&utm_campaign=tx-pilot-1&utm_content=v8-stat-phone`

**V9 — Procore style (AS1 Awareness)**

- Primary: `Built for Texas residential inspectors who want their evenings back. Photo + voice in, SOP-language report out. Inspector approves every finding before anything reaches the client. Same-day delivery, branded as you.`
- Headline: `30-min reports. Still your license.`
- Description: `Free for life if you're one of the first 10.`
- CTA: `LEARN_MORE`
- URL: `https://www.uselookover.com/sample?utm_source=meta&utm_medium=cpc&utm_campaign=tx-pilot-1&utm_content=v9-procore-style`

---

## Phase 2 — Monitor + decide (every 12 hours)

Pull insights at the ad level via `GET /act_{ad_account_id}/insights?level=ad&fields=ad_id,ad_name,impressions,reach,frequency,clicks,ctr,cpc,cpm,spend,actions,action_values&date_preset=lifetime`.

Append one JSON line per ad per check to `marketing/ads/run-log.jsonl`:
```json
{"ts":"...","ad_id":"...","variant":"V7-1x1","ad_set":"AS2-Filter","spend":12.34,"impressions":4521,"reach":3890,"frequency":1.16,"clicks":42,"ctr":0.0093,"cpm":2.73,"cpc":0.29,"landing_page_views":31,"leads":7,"complete_registrations":1,"cost_per_lead":1.76,"cost_per_registration":12.34}
```

Apply decision rules per ad, in order — first match wins. Only evaluate after the ad has been live ≥ 12h **and** spent ≥ $5.

### Kill

| Condition | Action |
|---|---|
| Spend ≥ $20 and CTR < 0.4% | Pause ad |
| Spend ≥ $30 and 0 landing page views | Pause ad |
| Spend ≥ $50 and 0 leads | Pause ad |
| Day 5 from launch, total spend > $150, 0 CompleteRegistration | Pause campaign, escalate |
| Total spend ≥ $300 | Pause campaign |

### Scale

| Condition | Action |
|---|---|
| Cost per lead < $10 after $30 spent | +50% daily budget (cap $25/day) |
| Cost per CompleteRegistration < $50 after $50 spent | +100% daily budget (cap $50/day) |

### Replace (pause + gen new variant)

| Condition | Action |
|---|---|
| Frequency > 3.0 | Pause, generate 1 new variant per §Phase 3 |
| CTR drops 30% over 24h vs. first-24h baseline | Pause, generate replacement |

### Keep

Otherwise leave it running. Don't fiddle with ads that haven't either failed or proved themselves.

---

## Phase 3 — Creative iteration

### Triggers

- A REPLACE rule fires
- A SCALE rule fires + variant has run ≥ 3 days (gen 2 evolutions to keep raising the bar)
- Every 5 days: 1 fresh exploration from the concept menu

### How

Higgsfield `nano_banana_pro`. Generate BOTH `1:1` and `9:16` for every new variant — same prompt, both orientations.

### Brand rules (validate every prompt before submitting)

- Plain words. Trade verbs. Specific numbers, not adjectives. No exclamation points.
- No "AI" in visible text — audience reads it as gimmick. Use "drafts" / "writes" / "starting point".
- No buyer-facing claims. Inspector audience only.
- No cost-estimate language. Ever.
- Vertical signifiers — pick **2 of 4** per variant: (a) person in inspector context, (b) trade icon (house, hard hat, clipboard, severity pill), (c) audience named explicitly (`FOR HOME INSPECTORS`), (d) UI mockup with real inspection finding content (use real SOP examples — GFCI missing, water heater T&P discharge, roof flashing).
- Tone reference: ServiceTitan, Jobber, Procore, Caterpillar. NOT Notion, Linear, Slack.
- Colors: navy `#0f172a`, cream `#fef9f3`, hot orange `#f97316`, charcoal `#1e293b`. Single accent per composition.
- No AI texture noise, no gradients, no smooth-AI-art. Sharp vector-clean preferred over photoreal unless the concept needs photo.
- No logos beyond clean `Lookover` wordmark. No watermarks.

### Concept menu (rotate, don't repeat)

| Concept | Hook |
|---|---|
| Real client quote | `"Same-day report. Reads better than what I used to type myself." — Dave R., Austin TX` (when actual quotes exist) |
| Time-of-day comparison | `4:00 AM ❌ → 5:30 PM ✅` |
| Voice-note moment hero | Waveform dominating canvas + transcribed finding below |
| Inspector PPE flat-lay | Top-down clipboard + flashlight + phone showing app + hard hat |
| Buyer's-agent angle | `Your buyer's agent will share this report. Make sure it looks like you wrote it.` |
| TX license prominence | `Your license. Your sign-off. Your branding. Always.` |
| Stat sequence | `3 hrs → 30 min → same day` |
| Founder face | Founder photo + `Built by an actual person you can email back.` — surface to founder first |

When iterating off a winner, change ONE major dimension (type weight, hero number, color flip, photo vs flat-graphic, audience-tag wording). Don't regenerate the same prompt — algorithm has fatigue, you need fresh signal.

---

## Reporting cadence

- **12h:** append per-ad row to `marketing/ads/run-log.jsonl`. Silent unless a rule fires.
- **24h:** append one-paragraph summary to `marketing/ads/daily-summary.md`. Cover: total spend, total signups, best variant by cost-per-CR, recent pauses/scales/new variants, budget remaining.
- **On rule fire:** log the rule, the action, and (if creative was gen'd) the job IDs.
- **On campaign kill:** generate `marketing/ads/final-report.md` covering total spend, signups, winning concept, biggest learning, recommended next move. Email founder.

---

## Operating defaults

- Hard ceiling: **$300 total lifetime spend.** No exceptions.
- Cap any single ad set at $50/day without explicit founder approval.
- Targeting stays narrow (TX, AND-interests) unless explicitly broadened by the founder.
- Never use copy that mentions cost estimates, repairs, or buyer-facing guidance.
- Never auto-approve Higgsfield output with visible misspellings of `Lookover`, `InterNACHI`, `SOP`, or `Texas`. Regen or escalate.
- Don't reply to comments or DMs on the Page or ads — flag urgent items to the founder.
- Don't modify the website code, pixel install, or privacy policy. Read-only on the codebase.
- If Meta restricts anything (ad rejected, Page flagged, account paused), pause all ads and surface to founder within an hour.

---

## Success thresholds at $300 spent

**Win** if any of:
- ≥ 5 CompleteRegistration events, OR
- ≥ 25 Lead events with cost per lead < $8, OR
- ≥ 1 paying inspector via Stripe webhook within 30 days of ad start

If win: report, recommend scaling to $1000 budget with the winning ad set + pause losers.

If miss: report, recommend reverting paid budget to TAREI newsletter sponsorship ($200–300, see Lookover rollout doc §4 Channel 3) before re-attempting Meta.

---

## Appendix A — Lookover long-form Page description

Use verbatim for the FB Page `description` field:

```
Lookover is software for residential home inspectors who want their evenings back.

Walk the property with your phone. Take photos and talk through what you see — voice notes, not typing. By the time you're back at the truck, the findings are drafted in standard InterNACHI SOP language. You review and approve every finding on the laptop. Edit anything, change severity, drop in additional photos. Branded PDF goes to your client same day.

30 minutes per report, instead of 3 hours of typing. 86% alignment with InterNACHI Standards of Practice on a 29-case benchmark, before your review. Your license. Your sign-off. Your branding.

Built by an actual person you can email back. 14-day free trial. No credit card to start.
```
