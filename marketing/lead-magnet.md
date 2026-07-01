# Lead magnet + email drip — spec

> Purpose: capture the 90%+ of Meta-ad visitors who read the landing page and don't
> trial on first visit. Trade an email for a 1-page PDF cheatsheet, then drip 5 emails
> over 10 days that walk them from cheatsheet → sample → ROI math → founder story →
> trial CTA. This doc is the source of truth for both. When someone builds the
> automation, follow this verbatim.

---

## 1. The lead magnet

### What it is
**"The 12 Most-Missed Findings on Residential Inspections — a 1-page InterNACHI SOP-aligned checklist."**

### Why this specific offer
Every inspector has an "am I missing anything?" nagging thought. A single-page checklist of the most-commonly-missed findings (with the code section they violate) delivers value in 60 seconds and reinforces Lookover's SOP-aligned positioning. Also useful for a Reddit / social share as "here's what your inspector should be looking for" — buyer-facing framing that inspectors send to their own clients.

### Content spec (1 page, letter portrait)

**Header:**
- Small Lookover wordmark (top-left)
- Title: **"The 12 Most-Missed Findings on Residential Inspections"**
- Subtitle: *"An InterNACHI SOP-aligned checklist from the team at Lookover"*
- Thin orange divider

**Body — 12 findings in 3 columns × 4 rows** (compact card style each)

Each finding card contains:
- Small colored severity dot (matches app: red safety / orange major / amber moderate / yellow minor)
- Finding title (bold, 1 line)
- 1-sentence description of what to look for
- Code reference or SOP section in small italic grey (e.g., "IRC P2804.6" or "InterNACHI SOP 3.4")

The 12 findings (based on real inspector-reported "wish I'd caught this" incidents):

| # | Category | Finding | Severity | Reference |
|---|---|---|---|---|
| 1 | Plumbing | Water heater T&P discharge terminating >6" above floor | Moderate | IRC P2804.6 |
| 2 | Electrical | GFCI missing at kitchen counter within 6' of sink | Safety | NEC 210.8 |
| 3 | Electrical | AFCI missing on bedroom circuits (post-2002 homes) | Safety | NEC 210.12 |
| 4 | Roof | Vent pipe flashing corrosion or lift | Major | InterNACHI SOP 3.4 |
| 5 | Roof | Missing kickout flashing where roof meets siding | Major | IRC R903.2 |
| 6 | HVAC | Furnace flue disconnection or improper slope | Safety | IRC M1804 |
| 7 | HVAC | Missing dryer duct backdraft damper | Minor | IRC M1502.2 |
| 8 | Structural | Improper deck ledger attachment (nails vs bolts) | Safety | IRC R507 |
| 9 | Structural | Settlement cracks with active moisture staining | Major | InterNACHI SOP 4.1 |
| 10 | Exterior | Grading sloping toward foundation | Moderate | InterNACHI SOP 5.1 |
| 11 | Interior | Missing window opening limiters above ground floor | Safety | IRC R312.2 |
| 12 | Insulation | Vermiculite insulation without asbestos disclaimer | Safety | State-varies |

**Footer:**
- Left: *"Want the full 47-finding InterNACHI SOP working set? Get Lookover free for 14 days → uselookover.com"*
- Right: `Lookover · uselookover.com · v1 · 2026`

### Design constraints
- Colors: navy `#0f172a`, cream `#fef9f3`, hot orange `#f97316`, severity colors match app
- Font: Inter or system sans-serif
- Print-friendly (works B&W)
- Filename: `lookover-12-missed-findings-v1.pdf`
- File size: <500 KB
- Hosted at: `uselookover.com/downloads/12-missed-findings.pdf`

### Delivery
Emailed as an attachment (not a link — attachments have 2× open rates for B2B). Sent immediately after email capture via Resend.

---

## 2. Email capture UI

### Where it lives
Modal + inline form. Modal triggers on:
- Exit intent from `/`, `/spectora`, `/sample` after ≥ 30s on page
- Explicit CTA click ("Get the free checklist") — placed in `/spectora` footer and `/sample` bottom banner

### Modal copy

**Headline:** Free: the 12 findings most inspectors miss

**Sub:** A 1-page checklist mapped to InterNACHI SOP. PDF hits your inbox in 30 seconds.

**Field:** Email (single field only — no name, no company. Every additional field kills conversion by ~15%.)

**Button:** `Send me the checklist`

**Trust microcopy:** No spam. Unsubscribe from any email. See our [privacy policy](/privacy).

### Conversion target
15–25% of visitors who see the modal opt in. Solid for B2B lead magnets.

### Tracking
- Meta Pixel custom event: `Lead` (already firing for /signup — reuse for this event too, or add `LeadMagnetOptIn`)
- The email address is the lead. Store in Supabase table `leads` with `source` = `spectora-modal` / `sample-modal` / `landing-modal` for later attribution.

---

## 3. The 5-email drip sequence

**Sender:** `hello@uselookover.com` (not `noreply@`, not `reports@`)
**From name:** `Enlil at Lookover` (founder-signed builds trust for B2B)
**Reply-to:** `enlilshalimoon@gmail.com` (real replies, not a black hole)

### Cadence

| Day | Email | Purpose |
|---|---|---|
| 0 | Email 1 — The cheatsheet | Deliver value, set voice |
| 2 | Email 2 — Sample report | Show the deliverable |
| 4 | Email 3 — The math | ROI framing |
| 7 | Email 4 — Why I built this | Founder story, trust |
| 10 | Email 5 — Trial or bust | Direct CTA, last touch |

If they sign up for a trial mid-sequence, stop the sequence.

---

### Email 1 — Day 0 — The cheatsheet

**Subject:** The 12 findings most inspectors miss (attached)

**Body:**

> Attached: **The 12 Most-Missed Findings on Residential Inspections.**
>
> It's a 1-page InterNACHI SOP-aligned checklist — pin it in your truck, or send it to a new inspector on your team. Every finding maps to a specific code section so you can defend the call.
>
> A couple that consistently get missed: the T&P discharge on water heaters (P2804.6 — 6" above the floor, not the drip pan), and kickout flashing where a roof meets siding (R903.2 — missing 40% of the time on pre-2010 homes).
>
> — Enlil
>
> **P.S.** I'm the guy who built Lookover — the tool that drafts these findings for you from your on-site photos and voice notes. If report writing is eating your evenings, I have something you should see. More on that in a day or two.

**Attachment:** `lookover-12-missed-findings-v1.pdf`

---

### Email 2 — Day 2 — Sample report

**Subject:** What your clients see (one link, 20 seconds)

**Body:**

> One thing about the cheatsheet — those 12 findings are the tip of the iceberg. A real inspection turns up 30–70 findings, and every one has to be written up in the report.
>
> Here's a sample of what a Lookover-generated report looks like when it lands in your client's inbox:
>
> → **uselookover.com/sample**
>
> Read the roof section. Notice the recommended-action language for the flashing finding. That's not written by the inspector — that's the AI draft. The inspector reviewed it, hit approve, and the report went out.
>
> 20 seconds to skim. Tells you more than any product tour.
>
> — Enlil
>
> **P.S.** Every finding requires the inspector's explicit approval before it's in the report. Your license, your sign-off. That's the whole point.

---

### Email 3 — Day 4 — The math

**Subject:** 2.5 hours × 20 inspections = ?

**Body:**

> Quick math I did with a Texas inspector last week:
>
> He does about 20 inspections a month. Each report takes him 3 hours to type. That's 60 hours a month of typing — a full 40-hour work-week and a half, on top of the actual inspections.
>
> Lookover cuts that to about 30 minutes per report (you review and approve drafts instead of typing). Same 20 inspections → 10 hours instead of 60. That's **50 hours a month back**.
>
> At $50/hr — even at conservative opportunity-cost math — that's **$2,500/month of your time**. Lookover is $79/mo (founding price, locked for life, first 50).
>
> Try the calculator on the site if you want to run your own numbers:
>
> → **uselookover.com** (scroll to the ROI section)
>
> — Enlil

---

### Email 4 — Day 7 — Why I built this

**Subject:** Why I built this

**Body:**

> Short story on why Lookover exists.
>
> Watched too many inspectors — friends, family, contractors I worked with — finish an inspection at 3 PM and then spend from 8 PM to midnight typing reports. The walkthrough was the fun part. The typing was killing them.
>
> I looked at what was out there. Spectora is good, but its AI polishes what you already typed — the 3 hours of typing is still 3 hours of typing. Same story for HomeGauge, Horizon, Tap Inspect. None of them let you *skip* the typing.
>
> So I built the thing I wanted them to have: photo + voice on-site → AI draft in SOP language → inspector reviews and approves. 30 minutes instead of 3 hours.
>
> First 50 inspectors get founding pricing at $79/mo, locked for life. That price never goes up even when the standard price does.
>
> If any of this resonates, the free trial takes 30 seconds:
>
> → **uselookover.com/signup**
>
> — Enlil (founder)
>
> **P.S.** You can email me back at this address. Not a customer-support alias. I read all replies personally.

---

### Email 5 — Day 10 — Trial or bust

**Subject:** Last one from me (unless you want more)

**Body:**

> This is the last email in this sequence — I don't want to be that guy who fills your inbox.
>
> If you want to try Lookover: 14-day free trial, no card, first 50 inspectors lock in $79/mo forever.
>
> → **uselookover.com/signup**
>
> If not, no hard feelings. The 12-findings cheatsheet is yours regardless. Keep it in the truck.
>
> If you have questions I can answer, hit reply. I'm the founder, this goes to my inbox.
>
> — Enlil
>
> **P.S.** If you'd rather not hear from me again — unsubscribe below. If you're on the fence and want to see the tool live, I'll do a 20-minute screen share with anyone who asks.

---

## 4. Metrics to track

Per email:
- Delivered / Bounced
- Open rate (target: >45% for engaged lead-magnet list)
- Click-through rate to site
- Reply rate (bonus signal — replies are gold)
- Conversion to trial signup

Per sequence:
- % of opt-ins that trial by day 14 (target: 8-15%)
- Cost per trial via this funnel = (Meta CPL / trial conversion %)

Per year:
- LTV of email-captured trials vs. direct-signup trials (compare)

---

## 5. Implementation notes for whoever builds this

- **Email delivery:** Resend (already wired). Use the branded template shell in `lib/email/send.ts`.
- **List storage:** Supabase table `leads(id, email, source, opted_in_at, trial_signup_at, unsubscribed_at)`.
- **Automation:** Simplest option is a Supabase edge function scheduled via cron that fires the next email in the sequence based on `opted_in_at` + email number sent. Don't reach for a full ESP (ConvertKit, Beehiiv) until list > 500 leads — Resend + a cron function is 90% of the value at 5% of the cost/complexity.
- **Unsubscribe:** Required by CAN-SPAM. One-click link in every email footer that sets `unsubscribed_at` and halts all future sends.
- **Attachment size:** Keep PDF under 500 KB. Large attachments hit spam filters.
- **DKIM/SPF:** Already configured for `uselookover.com` per Resend setup — nothing new needed.

---

## 6. Next steps

1. **Design the PDF** — either Figma → export, or a designer for 2 hours. Use the 12-finding list above verbatim.
2. **Build the email-capture modal component** — reusable, drops onto `/`, `/spectora`, `/sample`.
3. **Wire the Resend delivery** — attach the PDF, add to `leads` table.
4. **Build the drip cron function** — checks `leads` every hour, sends the next-due email, updates `last_sent_email_number`.
5. **QA the sequence** — send to your own address, verify rendering + attachment on iOS Mail, Gmail app, and desktop Gmail.

Ship all 5 in one dev session (~4-6 hours total). This funnel could recover 20-30% of otherwise-lost Meta ad spend.
