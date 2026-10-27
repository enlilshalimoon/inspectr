# Google Search ads: plan (draft 2026-10-27, needs founder approval)

## Why
Meta brings in consumers, not inspectors: 0 of the 8 signups from Ad_iMessage_1x1
are inspectors. People who search "TREC report software" are already shopping for
the thing we sell. Search reaches them at that moment; Meta interrupts strangers.

## Setup (founder does the blocked clicks, Claude does the rest)
1. Founder: create a Google Ads account at ads.google.com while signed in as
   hello@uselookover.com. Pick "Switch to Expert Mode" and skip campaign creation.
   Add the payment method yourself. Claude never enters card details.
2. Claude: add the Google tag (gtag.js, `AW-…`) to `app/layout.tsx`, with a
   conversion event on a completed signup that has the inspector role. Push, which
   deploys it.
3. Claude: build the campaign below, paused. Founder approves the budget, then
   Claude turns it on.

## Campaign: `Search_Inspectors_US`
- Search network only. No Display, no search partners.
- Locations: TX, FL, GA, NC, AZ. Presence only, not "interest in".
- Bidding: Maximize clicks with a max CPC cap for the first 2 weeks (no conversion
  data yet), then Maximize conversions once there are 15+ signups.
- Budget: founder sets it. Suggested starting cap: **$15/day**, separate from the
  $10/day Meta retargeting.
- Landing: `uselookover.com/?utm_source=google&utm_medium=cpc&utm_campaign=search_<adgroup>`.

### Ad groups (phrase and exact match)
| Ad group | Keywords | Landing |
|---|---|---|
| TREC | "trec report software", "trec rei 7-6 software", "trec inspection report app", "trec report template" | `/` (TX) |
| Report software | "home inspection report software", "home inspection report app", "home inspection report writer", "home inspection software" | `/` |
| Spectora alt | "spectora alternative", "spectora vs", "cheaper than spectora" | `/spectora` |
| New inspector | "software for new home inspectors", "starting a home inspection business software" | `/` |

Negatives: jobs, salary, course, class, school, license requirements, how to
become, free template pdf, home inspection near me, cost of home inspection,
buyer, checklist for buyers, sample report.

### Responsive search ad copy (no "AI", no free-for-life, per OFFER-POLICY.md)
Headlines:
- TREC Report Before You Leave
- Photos + Voice → Finished Report
- Fills TREC REI 7-6 For You
- Stop Writing Reports At Night
- Built For Home Inspectors
- You Approve Every Line
- 14-Day Free Trial, No Card
- Founding Price For First 50

Descriptions:
- Take photos and say a few words per defect. Lookover writes the finding in SOP language.
- Texas: I/NI/NP/D boxes filled on the REI 7-6. 14-day free trial, no credit card.

## What success looks like after 2 weeks
- At least 3 inspector signups from Google. Fewer than that: pause and rethink.
- Watch the search terms report every 2 days and add negatives. The weekly report
  shows Google next to Meta and cold email.
