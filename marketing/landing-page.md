# Landing Page — Rebuild Spec

> Status: draft v1, ready for review. Name-agnostic — every place the product name appears, this doc uses `Lookover`. Once the name lands, search-and-replace and ship.

---

## 1. Strategic frame (don't skip — every section ties back here)

**Who this page is for:** Residential home inspectors in the US. Solo operators or 2–5 person shops. Average age 45+. Conservative. Time-poor. Skeptical of "AI" as a category because most of what's marketed to them as AI is a writing-assistant bolt-on that didn't save anyone real time.

**What they care about, in order:**
1. Time saved on report writing (the actual pain — 2–4 hours of typing after every inspection)
2. Liability protection (their license is on the line every time they sign a report)
3. Looking professional to clients and referral agents
4. Not having to learn yet another piece of software

**What this page must do:**
1. Convince them in 8 seconds that this is built by people who understand inspections
2. Show — not tell — how it cuts report time
3. Address E&O / "what if it's wrong?" anxiety before they even ask
4. Convert to free trial without a credit card

**What this page must NOT do:**
- Lead with "AI" or "revolutionary" or any tech-marketing voice
- Use buyer-facing language ("get a better inspection on your home") — wrong audience
- Show stock photography of "businessman with iPad"
- Mention cost estimation, contractor lead-gen, or anything in the phase 2/3 roadmap
- Promise E&O coverage we don't have

---

## 2. Voice cheat sheet

Tone: **blue-collar professional**. Think Milwaukee Tools, ServiceTitan, Jobber, Procore. Not Notion. Not Linear.

| Use | Don't use |
|---|---|
| "Drafts your report" | "Generates AI-powered insights" |
| "Talk through what you see" | "Leverage voice-first workflows" |
| "You approve every finding" | "Human-in-the-loop validation" |
| "Same day, not 4 a.m." | "Accelerate your reporting velocity" |
| "Works on the phone in your pocket" | "Mobile-first PWA experience" |

Plain words. Trade verbs. Specific numbers. No exclamation points anywhere on the page.

---

## 3. Page structure (top to bottom)

1. **Nav** — logo left, "Sign in" + "Start free trial" right
2. **Hero** — headline, sub, primary CTA, trust microcopy
3. **The problem** — what report night currently looks like (the pain)
4. **The fix** — 3-step workflow (capture → draft → approve)
5. **ROI calculator** — interactive, default values pre-filled
6. **Product walkthrough** — screenshots of the actual product on phone + laptop
7. **You stay in control** — the E&O / liability answer
8. **What clients receive** — the report deliverable (PDF + share link)
9. **Pricing** — founding tier + standard, plus "team" placeholder
10. **FAQ** — the 8 questions that block conversion
11. **Final CTA**
12. **Footer**

Length is intentional. Inspectors will scroll if the copy speaks their language. They won't trust a one-screen marketing page.

---

## 4. Section-by-section copy

### 4.1 Nav

```
[LOGO] Lookover                                  Sign in    Start free trial
```

Sticky on scroll. Background goes from transparent to white-with-shadow after 80px.

---

### 4.2 Hero

**Headline (primary — keep as-is, founder approved):**

> Talk through the inspection.
> Get the report drafted before you're back to your truck.

**Sub-headline:**

> Lookover turns your photos and voice notes into a draft inspection report while you're still on-site. You review, edit, and approve every finding on your laptop. Client gets a clean, branded report the same day — not at 11 p.m.

**Primary CTA:** `Start 14-day free trial` → `/signup`
**Secondary CTA:** `See how it works` → smooth-scroll to section 4.4

**Trust microcopy under CTAs:**
> No credit card. Up to 3 inspections during trial. Cancel from settings in one click.

**Visual:** Split layout. Left = copy. Right = a short looping video or 3-frame animation:
- Frame 1: phone in a gloved hand, taking a photo of a water heater
- Frame 2: laptop screen showing a draft finding with severity rating
- Frame 3: phone showing the client-facing report (the share link view)

If video is too much to produce day-1, use three real screenshots stacked with a subtle arrow between them. Do NOT use a generic "dashboard mockup" — every successful trade-software landing page (Jobber, ServiceTitan, Procore) shows the actual product in actual hands.

---

### 4.3 The problem

**Section header:**
> You finished the inspection three hours ago. You're still typing.

**Body:**
> Every inspection is two jobs. The walkthrough — which you're good at — and the report — which eats your evening.
>
> By the time you get home, you've got 80 photos, a notebook full of shorthand, and a client who wants the report tomorrow morning. So you type. Until midnight. And the next day you do it again.
>
> Most inspectors quietly cap their week at 8 inspections because the reporting won't stretch any further. That cap is the ceiling on your income.

**Visual:** A photograph of a laptop on a kitchen table at night, half-finished report on screen, cold coffee. Real. Not stock.

---

### 4.4 The fix — 3-step workflow

**Section header:**
> Three steps. Most of the work happens before you leave the property.

Three column cards, equal width on desktop, stacked on mobile.

**Card 1 — Capture**
> **You walk. You shoot. You talk.**
>
> Open Lookover on your phone, take photos of what you'd normally photograph. Hold the button to record a voice note about what you're looking at. That's the whole on-site workflow.
>
> *Sample voice note:* "Water heater is a 2009 Rheem, 40-gallon. T&P valve discharge pipe terminates above the pan — should be within 6 inches of the floor. Note for the report."

Icon: a phone with a camera shutter
Visual: a screenshot of the mobile capture screen with a photo and a waveform showing the voice note

**Card 2 — Draft**
> **Lookover writes the finding.**
>
> The photo gets analyzed for what's actually in the picture. Your voice note gets transcribed and combined with the visual context. Out comes a draft finding with a severity rating and a recommendation, written in standard SOP language.
>
> Drafts appear as you go. By the time you finish the walkthrough, the report is mostly written.

Icon: a document with a pencil
Visual: a screenshot of a generated finding (water heater example, "Recommendation" / "Severity: Maintenance")

**Card 3 — Approve**
> **You review every finding before it goes out.**
>
> Sit down at your laptop. Read each draft. Edit the wording, change the severity, add a photo, or delete it. Bulk-approve the routine stuff. Spend your time on the findings that matter.
>
> Hit finalize. Client gets a branded PDF and a mobile-friendly link. You're done.

Icon: a checkmark in a circle
Visual: a screenshot of the desktop review interface with one finding being edited

---

### 4.5 ROI calculator

**Section header:**
> What's your report-writing hour worth?

**Interactive widget:**

Three inputs, two outputs. Default values that produce a believable number for a typical solo inspector.

```
Inspections per month       [  20  ]   slider 5–60
Hours saved per inspection  [ 2.5  ]   slider 1–4
Your hourly rate            [ $50  ]   slider $25–$150

─────────────────────────────────────
You'd save                  ~50 hours/month
That's worth                $2,500/month
Lookover costs                $129/month
Net benefit                 $2,371/month  → 19× return
```

**Below the calculator:**
> Or: every month you don't switch, you're paying yourself $2,371 to keep typing.

**Implementation note:** The defaults (20 inspections, 2.5 hrs, $50/hr) yield the same ROI you cite in the handoff (~20×). Use real, conservative numbers — overclaiming kills trust with this audience faster than anything.

**Asset:** This is the single highest-converting interactive element on the page. Build it as a small client component with three controlled inputs and live-computed outputs. No analytics dependency, no backend.

---

### 4.6 Product walkthrough

**Section header:**
> Built for the way you actually work.

A vertical stack of 4 alternating image+text blocks (image left, text right, then flip).

**Block 1 — On the property: capture**
> One thumb, one hand. Photos and voice in the same screen. Works offline; syncs when you're back in service. No login between properties — you stay signed in for the day.

Screenshot: mobile capture screen with offline indicator

**Block 2 — In the truck: drafts arrive**
> By the time you sit down, Lookover has drafted findings for everything you captured. Each one ties back to the photo and voice note it came from, so you always know what informed it.

Screenshot: list of generated findings on phone or tablet

**Block 3 — At your desk: review and edit**
> Inline editing. Severity selector (Maintenance / Minor / Major / Safety). Bulk-approve the routine items. Add or swap photos. Reorder findings into your standard report sections.

Screenshot: desktop review UI mid-edit

**Block 4 — To the client: finalize and send**
> One click produces a branded PDF with your logo, license number, and disclaimer — and a mobile-friendly share link your client can open from the email. Buyer's agent gets the same link. No portal, no login, no friction.

Screenshot: the public report view (e.g. `uselookover.com/report/abc12345`)

---

### 4.7 You stay in control (the E&O / liability section)

This section exists because it is the #1 conversion blocker for this audience. Address it head-on, in the inspector's own words.

**Section header:**
> Your license. Your name. Your call on every finding.

**Body:**
> Lookover is an assistant, not an inspector. Every draft finding requires your review and approval before it makes it into the final report. Nothing leaves your laptop without your sign-off.
>
> Think of it the way a senior inspector thinks of a junior who types up notes: helpful, fast, sometimes wrong about the details. You're the one who knows the standard, knows the house, and knows what to tell the client. Lookover just gets you to the review stage faster.
>
> Every report carries a clear notice: *"Draft assisted by Lookover. Reviewed and approved by [Inspector Name, License #]."* Your professionalism, on the line, with the documentation to prove the review.

**Sub-block: "What about E&O?"** (collapsible or smaller text)
> We don't make E&O claims on your behalf — that's between you and your carrier. But the approval-required workflow exists precisely so that you remain the inspector of record on every report. We're working on guidance you can share with your carrier; in the meantime, the audit trail (which findings were AI-drafted, which were edited, who approved them and when) is available on every report.

---

### 4.8 What clients receive

**Section header:**
> A report your clients will actually read.

**Body:**
> Branded with your logo and contact info. Severity ratings color-coded. Photos inline with each finding. Mobile-friendly so buyers can read it on their phone in the realtor's car.
>
> Delivered two ways at once: a polished PDF for the file, and a shareable web link for the people who never open PDFs.

**Visual:** side-by-side mockup of (a) the PDF first page and (b) the mobile share-link view.

---

### 4.9 Pricing

**Section header:**
> Simple pricing. No per-report fees.

Three cards. Middle card highlighted as recommended.

**Card 1 — Founding (limited)**
> **$79 / month**
> First 50 inspectors. Locked for life.
>
> - Unlimited inspections
> - Unlimited photos and voice notes
> - Branded PDFs and share links
> - Email + SMS support
>
> `Claim founding spot`

**Card 2 — Standard (recommended)**
> **$129 / month**
> For solo inspectors and small shops.
>
> - Everything in Founding
> - Priority support
> - Custom report templates (coming)
>
> `Start 14-day free trial`

**Card 3 — Team**
> **$99 / seat / month**
> 2+ inspectors. Shared brand kit.
>
> - Everything in Standard
> - Shared templates and disclaimers
> - Team-wide branding
>
> `Talk to us`  → mailto or Calendly

**Below the cards:**
> No credit card to start. Cancel from settings in one click. We don't hold your data hostage — export your inspections to JSON any time.

---

### 4.10 FAQ

Eight questions. Accordion-style, all collapsed by default. Order matters — the most-blocking objections first.

**Q1. What if Lookover gets a finding wrong?**
> Every draft finding requires your approval before it makes it into the final report. You can edit any wording, change the severity, swap photos, or delete the finding entirely. Lookover never finalizes a report on its own.

**Q2. Will my E&O carrier cover reports drafted with Lookover?**
> The workflow is built so that you remain the inspector of record — every finding is reviewed and approved by you before the report finalizes, with an audit trail. We don't speak for your carrier, but we're putting together a guidance document you can share with them. If you want to be the first to receive it, reach out.

**Q3. Does this work for InterNACHI SOP / state-specific standards?**
> The draft language is written against InterNACHI Standards of Practice. We're at 86% on our internal benchmark (29 representative findings) and improving every release. State-specific addenda — Texas TREC, California CREIA, etc. — are on the roadmap; in the meantime, your existing report templates and disclaimers can be added in settings.

**Q4. What if I'm offline at the property?**
> Capture works offline. Photos and voice notes queue locally and sync the moment you're back on service. You won't lose anything.

**Q5. Can I keep using my existing report style?**
> Yes — you control wording, structure, severity scale, and disclaimers. Lookover drafts in a neutral SOP-aligned voice that's easy to edit toward your house style. Saved templates are coming.

**Q6. What about commercial inspections?**
> Not yet. Lookover is built for residential. Commercial has a different SOP and different client expectations; we'd rather do residential well than both poorly.

**Q7. What happens to my data if I cancel?**
> It's yours. Export all your inspections, photos, and reports to JSON from settings, any time, no questions. We delete your account on request within 30 days.

**Q8. Who built this?**
> A small team focused only on residential inspection software. We talk to inspectors every week. If something's broken or missing, email the founder directly — address is in your dashboard.

---

### 4.11 Final CTA

Full-width band, dark background (slate-900 or deep navy), white text.

**Headline:**
> Get your next report drafted before you leave the driveway.

**Sub:**
> 14-day free trial. No credit card. Up to 3 inspections.

**Button:**
> `Start free trial`  (large, accent color)

**Trust line under button:**
> Used by [N] inspectors across [N] states.  *(Update once you have real numbers — leave commented out until then.)*

---

### 4.12 Footer

Three columns.

**Column 1 — Lookover**
- About
- Pricing
- Sample report (a live demo of a finalized report)
- Contact

**Column 2 — Resources**
- For your E&O carrier (the guidance doc, once written)
- Inspector blog (once content exists)
- Standards we follow (InterNACHI SOP page)

**Column 3 — Legal**
- Terms
- Privacy
- Data export policy

**Bottom strip:**
> © 2026 Lookover. Built for residential home inspectors.

---

## 5. Asset list (what you need to produce or commission)

Priority order. Don't ship without the [P0] items.

### [P0] Real product screenshots
- Mobile capture screen with a real photo + voice waveform
- Mobile finding-list view after drafts arrive
- Desktop review screen with a finding being edited (severity dropdown open)
- Desktop finalized-inspection view with "Send to client" button
- The client-facing share link view on a phone
- The branded PDF first page

These should be of the actual product with realistic content (a real water heater, a real electrical panel) — not Lorem Ipsum. Use a demo inspection seeded specifically for marketing.

### [P0] Hero visual
Either:
- A 6-second looping video showing capture → draft → approve, OR
- Three real screenshots stacked with subtle motion

Do NOT use an AI-generated hero image. The audience will smell it and bounce.

### [P1] Real photography
- Inspector on a roof with a phone (capture in context)
- Laptop on a kitchen table at night (the "problem" section)
- Phone on a truck dashboard with the app open

If you can't do a photo shoot yet, use high-quality unsplash images of real inspections — but credit-check them and avoid the obvious stock-photo look (no smiling guy in a polo holding a clipboard).

### [P1] Sample report
A live, publicly accessible inspection report at `uselookover.com/sample` (or similar). Linked from the footer and from the FAQ. This is what skeptical inspectors will click to evaluate quality. Make it good.

### [P2] Logo and brand kit
Logo, wordmark, favicon, social card image (Open Graph). Holds for name lock.

### [P2] Testimonial photos + quotes
Headshot, name, company, location, one-sentence quote. From your first 5 beta inspectors. Replaces the "Used by [N] inspectors" line in the final CTA.

---

## 6. Technical implementation notes

This is a Next.js 16 / React 19.2 project (see `AGENTS.md` — don't reach for outdated Next.js patterns).

**File structure suggestion:**
```
app/
  page.tsx                          ← rewrite this (current bare hero)
  (marketing)/
    pricing/page.tsx
    sample/page.tsx                 ← live sample report
    e-and-o/page.tsx                ← E&O guidance page
components/
  marketing/
    Nav.tsx
    Hero.tsx
    ProblemSection.tsx
    HowItWorks.tsx
    RoiCalculator.tsx               ← client component
    ProductWalkthrough.tsx
    ControlSection.tsx
    ClientDeliverable.tsx
    Pricing.tsx
    Faq.tsx                         ← client component (accordion state)
    FinalCta.tsx
    Footer.tsx
```

Keep `app/page.tsx` as a server component that composes the marketing sections. Only `RoiCalculator` and `Faq` need to be client components.

**Auth-aware behavior:** Preserve the existing redirect logic in `app/page.tsx:6-18` — signed-in users skip the landing page and go straight to `/inspections` (or `/onboarding` if incomplete). The marketing rebuild only changes what unauthenticated visitors see.

**Performance:** Hero video should be `<video autoplay loop muted playsinline>` with a poster image, max 800KB. Lazy-load all section images below the fold. Lighthouse Performance target: 90+.

**Styling:** Already on Tailwind (per `globals.css` and current page). Stick with the slate-* palette as base; add one accent color when the brand kit lands. Don't introduce a UI framework — Tailwind + a few primitives is enough.

---

## 7. Remaining account & code actions now that the name is locked

Name: **Lookover**. Domain: **uselookover.com** (purchased via Namecheap).

Do these in order. The ones marked *(account)* need you logged into the relevant dashboard — I can't do them for you.

### Step 1 — Point uselookover.com at Vercel *(account: Namecheap + Vercel)*

In **Vercel** (project → Settings → Domains):
1. Click **Add Domain**, enter `uselookover.com`
2. Also add `www.uselookover.com` (Vercel will offer to set up a redirect — accept it)
3. Vercel will show you DNS records to add — usually an `A` record for the apex (`@` → `76.76.21.21`) and a `CNAME` for `www` (`www` → `cname.vercel-dns.com`). Copy those exact values.

In **Namecheap** (Domain List → Manage → Advanced DNS):
1. Delete the default "Parking Page" CNAME record if it's there
2. Add the `A` record Vercel showed you (Host: `@`, Value: the IP from Vercel)
3. Add the `CNAME` record (Host: `www`, Value: `cname.vercel-dns.com`)
4. Save

DNS propagation usually completes in 5–30 minutes. Vercel will auto-issue an SSL cert once it sees the records.

### Step 2 — Update Vercel env var *(account: Vercel)*

Project → Settings → Environment Variables → edit `NEXT_PUBLIC_APP_URL`:
- New value: `https://uselookover.com`
- Apply to all environments (Production, Preview, Development)
- Redeploy after saving (Vercel won't pick up env changes without a redeploy)

### Step 3 — Verify the domain in Resend so client emails come from `reports@uselookover.com` *(account: Resend)*

Currently emails go from `onboarding@resend.dev`, which the handoff doc flagged as gating for any real beta — no inspector will send their client an email from a random `resend.dev` address.

In **Resend** (Domains → Add Domain → `uselookover.com`):
1. Resend will show you 3–4 DNS records to add (a `TXT` for verification, a `MX` for receiving, two `CNAME` for DKIM signing). Copy them.
2. Back in **Namecheap Advanced DNS**, add each record exactly as Resend specifies.
3. Return to Resend and click **Verify Domain**. Usually verifies within a few minutes.

Once verified, the from-address `reports@uselookover.com` becomes usable.

### Step 4 — Update Resend from-address in code *(code change — I can do this)*

Find every place we send email via Resend (grep for `onboarding@resend.dev` or `Resend(` initializations). Change the from-address to `Lookover Reports <reports@uselookover.com>` (or `Lookover <noreply@uselookover.com>` for system emails like password reset).

Ask me to make this change once Step 3 is verified, so we don't ship a broken from-address.

### Step 5 — Update site metadata in code *(code change — I can do this)*

- `app/layout.tsx` — `<title>`, `<meta description>`, Open Graph title/description/image
- `app/page.tsx` — current "Inspectr" logo text in the header (line 24) becomes "Lookover"
- `public/manifest.webmanifest` — PWA name and short_name
- Any other hard-coded "Inspectr" string (I'll grep before editing)

### Step 6 — Generate the Open Graph social card *(asset — needs a designer or a quick Figma)*

A 1200×630 PNG with the Lookover wordmark + tagline ("Talk through the inspection. Get the report drafted before you're back to your truck.") on a dark background. Drop it at `public/og.png` and reference it in `layout.tsx` metadata.

Holds for logo lockup.

### Step 7 (optional) — Rename the GitHub repo *(account: GitHub)*

`github.com/enlilshalimoon/inspectr` → `github.com/enlilshalimoon/lookover`. GitHub auto-redirects the old URL for a while, but update any CI/CD references, Vercel project name, and the README header.

This is purely cosmetic — nothing breaks if you skip it. Recommend doing it before the first beta inspector clones or sees the repo URL, never after.

### Step 8 (separate task) — Codebase rename of "Inspectr" → "Lookover"

There are likely 30–60 string references to "Inspectr" across the codebase (UI text, emails, PDF templates, README, comments, DECISIONS.md, STRATEGY.md). This is a bigger lift than search-and-replace because some of it is in copy you'll want to tighten while you're in there.

Recommended: a single dedicated session. Ask me to "do the Inspectr → Lookover rename pass" and I'll grep every occurrence, walk you through the non-obvious ones (e.g. `<title>` is one line; the PDF report header is a marketing decision), and ship them as one coherent change.

---

## 8. What to send to the user for review

Before implementation, walk through and react to:

1. **Hero sub-headline** — does it land for an inspector reading it for the first time, or is it still too marketing-y?
2. **ROI calculator defaults** — are 20 inspections / 2.5 hrs / $50/hr the right anchor numbers for a typical solo inspector? (Conservative beats aspirational here.)
3. **The "You stay in control" framing** — does this answer the E&O question well enough to unblock cautious inspectors, or does it need to go further?
4. **Pricing structure** — three tiers (founding / standard / team) feels right per the handoff. Is the founding-tier "first 50, locked for life" framing what you intended, or do you want a time-bound version instead ("through Q3 2026")?
5. **What's NOT in this doc** — by design, no cost estimates, no buyer-facing copy, no "AI-powered" anywhere. Confirm those are still the right omissions.

Once those five are settled, the page can be implemented as-is.
