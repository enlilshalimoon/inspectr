# Weekly metrics — beta launch tracker

> Per §8 of the rollout: track these weekly. Spreadsheet > dashboard until the data demands one.
>
> **Where this lives:** keep this markdown as the source of truth for week 1–4. After that, move to a Google Sheet if more than one person needs to see it.
>
> **When to update:** Sunday evening. Same time every week. Don't skip a week, even if nothing happened — "nothing happened" is the most important data point you can record.

---

## The dashboard

| Metric | Wk 1 | Wk 2 | Wk 3 | Wk 4 | Target Wk 4 | Wk 8 | Wk 12 | Target Wk 12 |
|---|---|---|---|---|---|---|---|---|
| Paying inspectors (founding tier) | _ | _ | _ | _ | **10** | _ | _ | **50** |
| Real client reports finalized | _ | _ | _ | _ | **30** | _ | _ | **250+** |
| % of drafts approved without edit | _ | _ | _ | _ | **>40%** | _ | _ | **>55%** |
| Avg time finalize → client open | _ | _ | _ | _ | **<30 min** | _ | _ | **<15 min** |
| NPS from beta inspectors | _ | _ | _ | _ | **8+** | _ | _ | **9+** |
| Beta testimonials collected | _ | _ | _ | _ | **3** | _ | _ | **15** |
| Landing → signup conversion | baseline | _ | _ | _ | _ | _ | _ | **2× wk-1** |
| Free trial → paid conversion | baseline | _ | _ | _ | _ | _ | _ | **30%+** |

**Rule:** if any metric is far off target by week 4, that is the next thing to debug. Don't chase additional metrics. Don't add columns.

---

## How each number is captured

| Metric | Source | How to count | Gotcha |
|---|---|---|---|
| Paying inspectors | Stripe dashboard | Active subs (incl. $0 founding tier) | Founding-tier still counts as "paying" for this metric — they're committed users, just on a price-locked plan |
| Real client reports finalized | `inspections` table, `status='finalized'` and `client_email IS NOT NULL` | Exclude your own test inspections — filter out your inspector_id | If you've been QAing on your own account, this number will be inflated. Run the query with your user_id excluded |
| % drafts approved without edit | `findings` audit table | Count of findings where `edited_at IS NULL AND approved_at IS NOT NULL` ÷ total finalized findings | Counts the "good enough out of the box" rate — the AI quality signal |
| Avg finalize → open | `reports.delivered_at` minus `reports.first_opened_at` | Median, not mean (one buyer opening at 3am skews mean badly) | Buyer engagement is the *agent-loop* signal — agents who care, look fast |
| NPS | Day-14 check-in call | Ask "0–10, would you recommend to another inspector?" verbatim. Don't survey-tool it. | Don't email-survey for NPS until >25 inspectors. Direct ask in the check-in call is higher signal |
| Testimonials | Drive folder + landing-page CMS | Count: has headshot + name + company + 1-sentence quote with permission email | "Maybe I'll write something" doesn't count. Has-the-quote-text counts |
| Landing → signup | Plausible / Vercel analytics | `/` page views → `/signup` form submits | Set the baseline in week 1 *before* posting NACHI / FB. Otherwise you have nothing to compare to |
| Trial → paid | Stripe | Trials started → trials converted (not still in trial) | Don't measure before week 6 — 14-day trials don't have enough age before then |

---

## Outreach log — who you reached, where, when

> Add a row every time you send something — forum post, DM, FB comment, intro from network. Don't trust your memory.

| Date | Channel | Person / venue | What you sent | Outcome (signed up / replied / silent / declined) | Followed up? | Notes |
|---|---|---|---|---|---|---|
| 2026-05-21 | TIJ forum | inspectorsjournal.com — Computers & Reporting Systems Forum (topic 19927) | Beta recruitment post + hero image | _ | _ | Links auto-stripped — new account; plain-text uselookover.com only |
| 2026-05-21 | YouTuber email | Ben Gromicko (Big Ben Gromicko, 33.6K subs) — ben@internachi.org | Beta recruitment DM referencing "Performing a Home Inspection" video | _ | Day-12 single follow-up rule | Sent from enlilshalimoon@gmail.com |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |

---

## Beta inspector log — who's in, what they say, what they ship

> One row per onboarded inspector. Updated after the 20-min onboarding call and again at the day-14 check-in.

| Inspector | Company | State | Source (how they found you) | Onboarding date | First real report finalized? | Day-14 NPS | Testimonial collected? | Quote |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |

---

## Weekly journal — 5 minutes, Sunday evening

> One paragraph per week. The number trends tell you what's happening; this tells you *why*.

### Week 1 — _(week of 2026-05-25)_

- **Posted:** _
- **Best signal:** _
- **Worst signal:** _
- **What I'd change next week:** _

### Week 2

- **Posted:** _
- **Best signal:** _
- **Worst signal:** _
- **What I'd change next week:** _

### Week 3

- **Posted:** _
- **Best signal:** _
- **Worst signal:** _
- **What I'd change next week:** _

### Week 4

- **Posted:** _
- **Best signal:** _
- **Worst signal:** _
- **What I'd change next week:** _
- **Week-4 retro:** are we at 10 paying / 30 reports / 3 testimonials? If not — what's the binding constraint? Capture, draft quality, signup, awareness, trust? Pick ONE and write the week-5 plan against that.

---

## What not to track

Resist the urge to add:
- DAU/WAU/MAU — irrelevant at this stage. Reports-finalized is the real activity metric.
- Time-on-page — vanity. Bounce rate is meaningless when you have <50 visitors.
- Twitter mentions — wrong audience (per §5).
- Email open rate — Resend reports it but it's gamed by Apple Mail Privacy. Use *click* rate if anything.
- Funnel-stage counts (visited pricing / visited FAQ) — premature; you don't have the volume for it to mean anything.

Add these only if the binding-constraint analysis at end of week 4 calls for them.
