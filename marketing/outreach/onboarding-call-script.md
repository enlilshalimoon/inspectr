# 20-min beta onboarding call — script

> Per §3 step 2 of the rollout: **every beta inspector gets a personal Zoom walkthrough**. You (founder) screen-share and walk them through capture → review → finalize using one of their photos. Sets the quality bar and gives you direct feedback worth more than any analytics.
>
> Goal of the call (in this order):
> 1. Inspector finalizes their first real report inside the call
> 2. You learn their current workflow in their own words
> 3. They agree to the feedback + video + quote trade in writing (chat or email)
>
> If you do nothing else, do #1. They will not come back to "try it later." They finalize a report in the call or they churn.

---

## Pre-call (5 min before)

- [ ] Open Zoom, share screen, have a fresh browser window at `uselookover.com/signup`
- [ ] Pull up their forum/FB profile so you remember the context of how they signed up
- [ ] Have the metrics tracker open in a separate tab — you'll log a row at the end
- [ ] Have your phone ready to demo the mobile capture flow

---

## 0:00 — 2:00 · Welcome + set expectations

> Voice: peer-to-peer, not service-to-customer. They're doing you a favor.

**Say:**
> Thanks for getting on. This'll be about 20 minutes. Plan is — I want to learn how you do reports today, then I'll walk you through Lookover end-to-end, and we'll finalize a real report by the time we hang up. Sound good?

**Confirm:**
- Are you on a residential job this week we can use real photos from? (If yes — use those. If no — fall back to one of the 6 sample photos in `public/marketing/`.)
- Laptop + phone both nearby? (Needed for the full demo.)

---

## 2:00 — 5:00 · Their current workflow (LISTEN)

> Do not pitch. Just ask. Take notes. This is where you find what's actually broken.

**Ask, in this order:**
1. Walk me through your current report workflow. From "client books the inspection" to "they receive the PDF."
2. What software are you using today? (Common: Spectora, HomeGauge, Horizon, ReportHost. If they say "Word doc / Pages template" — that's a strong fit signal.)
3. How long does the typing-up part actually take? Be honest.
4. What part of writing reports do you hate the most?
5. Have you tried voice-to-text or any AI tools? What happened?

**Note what they say verbatim** — these are the exact words that should appear in landing-page testimonials and future copy.

---

## 5:00 — 15:00 · Walkthrough (screenshare + their photos)

### Setup (5:00–7:00)
- Walk through signup. Confirm logo upload, license number, state.
- Show the Settings → Branding page. "This is what your clients see at the top of the report."

### Capture (7:00–10:00)
- Hand the demo off to the phone (or, easier: have them open the PWA on their phone and add it to home screen).
- They take 2–3 photos and record 1–2 voice notes on a real or sample issue.
- Watch them do it. Don't help unless they're stuck >30 seconds. Where they hesitate is where the UX is broken.

### Review / draft (10:00–13:00)
- Back to the laptop. Show the draft findings as they appear.
- **Have THEM edit one finding** — change severity, edit wording, drop a photo. Don't do it for them.
- Show the audit trail: "every edit you make is logged — useful if your E&O carrier ever asks."

### Finalize (13:00–15:00)
- Walk through the finalize flow.
- Set a real or test client email.
- Send it. **Have them open the email on their phone to see what the client sees.**

> If you're not at "finalized + delivered" by 15:00, you've gone too slow on the previous steps. Skip ahead.

---

## 15:00 — 18:00 · Their account + the trade

**Account setup:**
- Apply the founding-tier code ($0/mo lifetime — see Stripe dashboard for the code).
- Confirm they can see "Founding inspector — $0/mo locked" in billing.
- Show them how to invite their team / add inspector profiles if relevant.

**The trade (say plainly):**
> Here's the deal I'm asking for. Use it on real inspections for the next 30 days. At the end:
> 1. **Honest feedback** — text me, email me, whatever's easiest. What breaks, what's missing, what's worse than what you use today.
> 2. **A 5-minute review video** — your phone, no script, just your real take. If you say it sucks, that's still gold to me.
> 3. **Permission to quote you** on the site if you'd recommend it. Headshot, name, company, location. You approve the quote before it goes up.
>
> In exchange you've got the account free for life. Sound fair?

**Get a verbal yes.** Then send a one-line confirmation in chat:
> "Confirming: 30-day use on real inspections → honest feedback + 5-min review video + permission to quote if you'd recommend. Reply 'yes' here."

---

## 18:00 — 20:00 · Next steps + close

**Confirm:**
- They have your direct cell (text is the right channel for inspectors, not email)
- They have the `/sample` URL bookmarked
- They know the founder-tier billing situation
- 14-day check-in scheduled (calendar invite goes out after call)

**End on:**
> Text me from your first real inspection — anything that's weird, anything you'd change. Don't be polite. I'd rather hear it broken than fix it after 5 of you have hit the same thing.

---

## Post-call (10 min)

- [ ] Log row in `marketing/tracking/weekly-metrics.md`
  - Date, name, company, state, current tool, top pain point quote, founding-tier confirmed
- [ ] Send calendar invite for Day-14 check-in (15 min)
- [ ] Drop their headshot/photo (from FB/LinkedIn) in a shared Drive folder for testimonial use later
- [ ] If they shared a real client photo during capture — **purge it from your dev DB by end of day**. Don't keep client data you don't need.
- [ ] Add their forum/group reply with a public "thanks for joining the beta" if appropriate (social proof for the next reader)

---

## Failure modes to watch for

| Signal during call | What it likely means | What to do |
|---|---|---|
| Hesitates >30 sec at signup | Signup UX is broken or their email situation is messy | Note the exact step. Don't fix it in real time — observe. |
| Photos take >2 min to upload | PWA upload is slow on cell | Note their carrier + location. May be a backend issue. |
| Edits >50% of the draft findings | Draft quality is off for their inspection style | Ask: "what would have made the draft closer to what you'd write?" That's the prompt tuning data. |
| Asks about cost estimates | Common misconception | Repeat the §7 line: "US inspectors are legally barred. We don't include them, ever." |
| Asks about commercial | Wrong segment | Be direct: "Residential only. Different SOP." |
| Goes silent after finalize | They're processing whether they'd actually use it | Wait. Don't fill the silence. |
| Says "this is cool" but won't commit to real client use | They'll churn in 7 days | Push for one concrete next inspection: "what's on your calendar this week?" |

## Time-budget cheat sheet

| Section | Budget | Cumulative |
|---|---|---|
| Welcome + expectations | 2 min | 2:00 |
| Their workflow (listen) | 3 min | 5:00 |
| Walkthrough (capture + review + finalize) | 10 min | 15:00 |
| Account + the trade | 3 min | 18:00 |
| Next steps + close | 2 min | 20:00 |

If you're over time at any checkpoint, cut the walkthrough first, not the workflow listening or the trade conversation. The walkthrough they can finish solo. The other two they can't.
