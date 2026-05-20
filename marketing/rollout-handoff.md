# Lookover — Marketing & Rollout Handoff

> The dev work for the landing page is **done**. The product is **deployed**. Domain is **live**. This document covers everything you need to launch the beta and start the inspector outreach loop.
>
> Read once, then operate from sections 3–5. Cross-references to `STRATEGY.md` and `marketing/landing-page.md` where appropriate so this doc stays focused on *execution*.

---

## 1. Status snapshot (today)

- **Product:** Fully deployed and functional. All MVP flows work end-to-end — signup, mobile photo capture (PWA), voice notes (Whisper), Claude Vision tagging, Sonnet drafting, desktop review/approve, branded PDF + public share link, email delivery via Resend. 86% baseline on the InterNACHI SOP benchmark.
- **Domain:** `uselookover.com` is live (canonical is `www.uselookover.com`; apex 308-redirects).
- **Landing page:** Shipped. 11 sections: nav, hero (with AI brand image), problem, 3-step how-it-works, ROI calculator (interactive), product walkthrough (4 visual blocks), "you stay in control" / E&O section, what-clients-receive (PDF + mobile share), pricing (founding/standard/team), 8-question FAQ, final CTA, footer. See `marketing/landing-page.md` for the source-of-truth spec.
- **Imagery:** 6 AI-generated WebP product mockups in `public/marketing/` (~1.3 MB total). Generated via Higgsfield Nano Banana Pro at 4k, optimized via `scripts/optimize-marketing-images.mjs`.
- **Brand voice:** Locked. Blue-collar professional. No AI-hype. Specifics on `landing-page.md` §2 and §6 below.

---

## 2. Pre-flight checklist — close these before going wide

Four dev items still gate a clean beta launch. None of them are big. All are blockers because an inspector or their client will hit them and notice.

### P0 — Hard blocker for any outreach

**☐ Resend domain verification + change report-email from-address**

Right now, every "your inspection report is ready" email goes from `onboarding@resend.dev`. No inspector will send their paying client an email from a random `resend.dev` address. Career risk for them.

Steps:
1. In Resend (account action): add `uselookover.com` as a domain → grab the TXT, MX, DKIM records → add them in Namecheap Advanced DNS → click Verify in Resend. See `marketing/landing-page.md` §7 Step 3 for the exact walk.
2. Code change: grep the repo for `onboarding@resend.dev` and `Resend(`, change the from-address to `Lookover Reports <reports@uselookover.com>` (for client report emails) and `Lookover <noreply@uselookover.com>` (for system emails like signup/password reset). Ask me or the dev agent to do this once Resend is verified.

### P1 — Beta inspectors will notice these on day 1

**☐ Build (or remove) the footer link pages**

The footer links to `/sample`, `/e-and-o`, `/terms`, `/privacy`, `/data-export`. None of these pages exist yet. Either build minimal versions or temporarily strip the links from `components/marketing/Footer.tsx`.

- `/sample` — **highest leverage of the five**. This is where a skeptical inspector clicks to evaluate report quality before signing up. Seed a real demo inspection (or reuse one of the benchmark cases), finalize it, and make `/sample` redirect to or render that report URL.
- `/terms`, `/privacy` — minimum-viable boilerplate. There are template generators (Termly, Pretty Privacy) that get you to legally-defensible in 30 minutes.
- `/e-and-o` — the guidance doc you can show an inspector's E&O carrier. This is referenced in FAQ Q2 and the "You stay in control" section. Could be a 1-pager.
- `/data-export` — short policy stating "you can export everything as JSON, delete on request within 30 days." Mirrors what the FAQ says.

**☐ Open Graph image**

`app/layout.tsx` references `/og.png` for social-card embeds (commented out for now). Without it, LinkedIn/Twitter/Slack previews look bare. Design a 1200×630 with the Lookover wordmark + the hero slogan ("Talk through the inspection. Get the report drafted before you're back to your truck."). Once `public/og.png` exists, uncomment the `images` lines in `layout.tsx` metadata.

### P2 — Sweep before week 3 of beta

**☐ Codebase rename completeness check**

The `Inspectr → Lookover` rename was done in commit `1188a2e` but may have stragglers in PDF templates, email subject lines, README, comments. Run `grep -ri inspectr` in the repo and fix anything user-facing. Folder name is still `inspectr/` which is fine — internal only.

---

## 3. Beta launch playbook — first 10 inspectors

### Goal
By end of week 4: **10 paying (or founding-tier) inspectors actively using Lookover for real client work, with 3 willing to be quoted on the landing page.**

### How (in order)

1. **Day 1–7: Warm intros only.** Don't go cold. Sources of warm-ish leads:
   - **NACHI forums** (`inspectorsjournal.com`, `nachi.org/forums`) — post asking for beta testers. Use the inspector-to-inspector voice, not marketing voice. Lead with "what I built, what it does, what I'm trading for honest feedback" — i.e., **free lifetime account in exchange for one honest 5-minute review video and quote**.
   - **Facebook groups** — "Home Inspectors" (~30K members), "Home Inspection Professionals" (~10K). Same post, slightly adapted.
   - **Local NACHI chapter meetings** — Texas chapters in particular if you're prioritizing TX. Show up to one in person if possible; offer to demo at the end.
   - **Existing personal network** — anyone who knows an inspector. 1 warm intro is worth 50 cold outreaches.

2. **Day 1–14: The 20-min onboarding call.** Every beta inspector gets a personal walk-through. You (founder) on Zoom, screen-share, walk them through capture → review → finalize using one of their photos. ~20 minutes. This sets a quality bar and gives you direct feedback that's worth more than any analytics.

3. **Daily: fix what's broken for the first 10.** Do NOT build new features in weeks 1–4 unless they unblock a paying beta inspector. Stability and polish over breadth.

4. **End of week 4: collect testimonials.** Format: headshot, name, company, location, 1-2 sentence quote. Update the `FinalCta` section's "Used by [N] inspectors across [N] states" line (currently commented out in `components/marketing/FinalCta.tsx`) with real numbers.

### Outreach copy template

Use this for forum posts / DMs / FB groups. It's already in the brand voice.

> **Subject / Title:** Free lifetime account on a new inspection tool — looking for honest feedback from 10 inspectors
>
> **Body:**
>
> Built something I've been wanting for years: capture photos and voice notes on the phone during the walkthrough, AI drafts the findings in standard SOP language, review and approve on the laptop. About 30 minutes per report instead of 3 hours of typing.
>
> Looking for 10 residential inspectors to use it for real client work for the next 30 days. In exchange for:
> - **Honest feedback** — what breaks, what's missing, what's worse than what you use today
> - **One 5-minute review video** at the end (no script, just your real take)
> - **Permission to quote you** on the landing page if you'd recommend it
>
> You get: **free lifetime account** ($129/mo locked at $0 forever).
>
> No credit card to start. Reports go out with your branding, your license, your sign-off. AI drafts the finding, you approve every one.
>
> Built by an actual person you can email back at any time. If interested, reply or DM.
>
> Site: uselookover.com

### What NOT to do in weeks 1–4

- Don't run paid ads (NACHI, Meta, Google). Wait until at least 25 paying inspectors prove organic channels.
- Don't email cold inspector lists. Conversion will be <1% and you'll burn your sender reputation before you have any.
- Don't pitch NACHI for partnership yet. Save that for after testimonials exist. (Approaching them with "10 testimonials, 86% benchmark, here's the demo" is 10× stronger than approaching them empty-handed.)

---

## 4. Distribution playbook — next 100 inspectors

After the first 10 beta inspectors are running clean, the next 90 come from these channels, ranked by leverage:

### Channel 1: InterNACHI partnership (highest leverage)

- **What:** Sponsor a CE (continuing education) course, get listed in the InterNACHI member directory, secure a booth at the annual InterNACHI conference.
- **Reach:** ~50,000 inspectors.
- **Cost:** Variable — CE course sponsorship is $5–15K, conference booth is $3–8K, directory listing is cheaper.
- **When:** After 10+ beta testimonials. Approaching them with proof.
- **First step:** Email `partnerships@internachi.org` with a 1-page deck: what Lookover is, the 86% benchmark, beta testimonials, what you're proposing. Ask for a 30-min intro call.

### Channel 2: Inspector YouTubers (highest *conversion* leverage)

Small set of channels with 50K–500K subscribers each. Real influence on what tools inspectors adopt.

| Channel | Subs | Why they matter |
|---|---|---|
| **Standards of Practice** (Ben Gromicko) | ~80K | Most respected technical channel, NACHI-adjacent |
| **Habitation Investigation** (Jim Troth, Ohio) | ~40K | Field-day walkthroughs, practical |
| **Innovative Property Solutions** | ~30K | Workflow + tools reviews |
| **Inspector Toolbelt** | ~20K | New tools coverage |

- **What to offer:** Free lifetime account + custom branded landing page if they want one + permission to keep all affiliate revenue if they want to do an affiliate code.
- **Ask:** Honest 5–10 min demo video. Not paid placement, real review.
- **First step:** DM each of them with a short personal note. Mention 1 specific video of theirs you watched. Offer the trade.

### Channel 3: State inspector associations

Tighter than NACHI, more localized, less crowded.

- **TAREI** (Texas Association of Real Estate Inspectors) — ~3,000 members, friendly to new tools, big TX inspector population
- **CREIA** (California Real Estate Inspection Association) — ~2,500 members
- **ASHI** (American Society of Home Inspectors) state chapters — varies by state
- Approach same way as NACHI: 1-page deck, ask for a 30-min call, propose newsletter mention or CE sponsorship.

### Channel 4: Real estate agent referral loop (indirect pull)

Agents pick the inspectors. If Lookover-produced reports look *dramatically* better than typical reports, agents start preferring inspectors who use Lookover. This is a slow pull but it compounds.

- **Tactic:** Once a beta inspector ships a real client report, ask them to share the public share-link with the buyer's agent. The agent sees the polish, asks "what is this tool?" That's the loop.
- **Asset to enable:** the sample report at `/sample` (P1 above). Send agents directly to it.

### Channel 5: Paid acquisition

**Don't.** Not until 50+ paying inspectors. Search-intent SEM ("home inspection report software") is competitive and Spectora outspends. Wait until you have testimonials, conversion data, and an LTV figure.

### Channel 6: Cold outbound

**Don't, mostly.** Inspectors are bad at email. The exception: targeted LinkedIn outreach to inspectors who've shown they like new tools (e.g., commented on inspector software posts, posted about workflow problems). Personal, 1-to-1, no automation.

---

## 5. Content & SEO — first 90 days

Goal: be the result an inspector searching for "how to write home inspection reports faster" or "InterNACHI SOP examples" lands on.

### Pieces to ship, in order

1. **Sample report at `/sample`** — see P1 above. This is also a landing destination. Title page: `uselookover.com/sample`. Make it indexable.

2. **"How to write a home inspection report in 30 minutes"** — blog post. Target keyword: "how to write home inspection report faster". 1,500 words, 8-section outline:
   - The 3-hour problem
   - Why templated tools haven't solved it
   - The voice-and-photo capture approach
   - 3-step workflow walkthrough (capture, draft, approve)
   - What the buyer receives
   - InterNACHI SOP alignment
   - Sample report (link to `/sample`)
   - Trial CTA

3. **"InterNACHI SOP cheat sheet for new inspectors"** — high-intent SEO, top-of-funnel. Builds trust as a tools-for-inspectors brand.

4. **"Lookover vs. Spectora — honest comparison"** — direct comparison page. Inspectors search this. Be honest about what Spectora does better (incumbent integrations, scheduling) and where Lookover wins (AI drafting, voice-first capture, time saved).

5. **"Sample reports gallery"** — 4–6 sample reports across property types (1950s ranch, 1990s 2-story, new build, condo). Goes viral on Reddit r/RealEstate and r/RealEstateInvesting when buyers share "look what my inspector sent me".

### Channels to publish

- **Own blog** at `uselookover.com/blog` (when you build it)
- **LinkedIn** — long-form posts in the founder voice (you're a "builder making tools for inspectors", not a corporate brand)
- **YouTube** — short product demos (60–90 sec) edited from beta inspector use
- **Reddit** — r/RealEstate, r/homeinspection — share sample reports, don't promote
- **Inspector forums** (NACHI, ActiveRain) — answer questions in your name, link to relevant content when helpful

### What to skip in the first 90 days

- TikTok / Instagram Reels (wrong demographic — inspectors aren't on these)
- Twitter/X (anyone you reach is irrelevant to selling to inspectors)
- Podcasts (low leverage unless it's an inspector-specific podcast — and there are very few)

---

## 6. Brand voice cheat sheet

Lock these in your head before writing *any* copy. (Same rules used to write the landing page.)

| Use | Don't use |
|---|---|
| "Drafts your report" | "Generates AI-powered insights" |
| "Talk through what you see" | "Leverage voice-first workflows" |
| "You approve every finding" | "Human-in-the-loop validation" |
| "Same day, not 4 a.m." | "Accelerate your reporting velocity" |
| "Works on the phone in your pocket" | "Mobile-first PWA experience" |
| "Built for residential home inspectors" | "Built for the modern inspection professional" |
| "Reviewed and approved by [Inspector Name]" | "Quality-assured by certified professionals" |

**Rules:**
- Plain words. Trade verbs.
- Specific numbers, not adjectives. "$2,371/month back" beats "significant savings".
- No exclamation points. Anywhere.
- Tone reference: ServiceTitan, Jobber, Procore. **Not** Notion, Linear.
- If you wouldn't say it to an inspector at the bar after a long day, don't write it.

---

## 7. The "do not" list (founder red lines)

These have already been decided. Keep them in mind if you're tempted to drift.

- **Never put cost estimates in the report.** US inspectors are legally barred from quoting repair costs. Cost-estimate add-on is phase 2 only.
- **Never market to home buyers directly.** Buyer is the consumer, not the customer.
- **Never lead with "AI" in headlines.** Audience (avg 45+, conservative) reads "AI" as gimmick.
- **Never bundle commercial inspections.** Different SOP, different segment, dilutes positioning.
- **Never burn paid-ad budget until 50+ paying inspectors prove organic.**
- **Never offer per-report pricing.** Flat monthly only. Pricing complexity kills trial conversion.

---

## 8. What to measure

Track these weekly. Spreadsheet > dashboard until you have the data to need a dashboard.

| Metric | Target by end of week 4 | End of week 12 |
|---|---|---|
| Paying inspectors | 10 (founding tier) | 50 |
| Real client reports finalized | 30 (3 per inspector × 10) | 250+ |
| % of drafts approved without edit | >40% (signals AI quality) | >55% |
| Avg time from finalize to client open | <30 min | <15 min |
| NPS from beta inspectors | 8+ | 9+ |
| Beta testimonials collected | 3 | 15 |
| Landing page → signup conversion | (baseline this week 1) | 2× the week-1 number |
| Free trial → paid conversion | (baseline) | 30%+ |

If any of these are far off target, that's the next thing to debug. Don't chase additional metrics.

---

## 9. Open strategic questions (founder hasn't answered yet)

These don't need to be answered today, but they shape big decisions in the next 60 days:

1. **Bootstrapped vs. raise.** Aggressive distribution (NACHI sponsorship, conference booth, content team) assumes capital. If bootstrapped, the GTM mix tilts harder toward warm intros + organic content. If raising, the question is when (after 25 paying inspectors? after 100?) and from whom.
2. **Geo focus.** All-US from day 1 vs. Texas pilot. Texas leans favorable — large inspector base, friendly regulators, TAREI is approachable. A 90-day Texas pilot would let you build local NACHI chapter relationships and physical-event presence without burning cycles cross-country.
3. **Acquisition floor.** If Spectora calls in 6 months — what number do you say yes to? Worth pre-deciding now while there's no emotional pressure. Easier to walk a strong yes/no through with a board/advisor (if you have one) than to figure it out at the moment.
4. **Pricing test.** Founding tier is $79/mo locked-for-life for first 50. Should it be the first 100? Should there be a time-bound version ("through Q3 2026")? Lock-for-life is generous but creates a permanent low-margin cohort.
5. **Phase 2 timing.** When do you start building the cost-estimate add-on? It's the highest-leverage product expansion (per `STRATEGY.md`). Earliest is after 100 paying inspectors. Latest is when a competitor ships it.

---

## 10. Asset inventory (what's ready for outbound)

Everything you need to do outreach is already in the repo or live on the site.

### Landing page
Live at `uselookover.com`. All 11 sections shipped. Last verified clean: typecheck + ESLint pass, ROI calculator math is correct (`ed1088b`).

### Visual assets — `public/marketing/`

| File | Use for |
|---|---|
| `hero-capture-draft-done.webp` | Hero shot. Can be cropped for LinkedIn header, deck cover, email banner. |
| `phone-capture-finding.webp` | Mobile capture screen. Use in social posts, "how it works" carousels. |
| `phone-utility-room.webp` | Real-world inspector context. Great for "in the field" social posts. |
| `laptop-review-hand.webp` | Desktop review interface with hand. Use for "review your reports" angle posts. |
| `phone-share-report.webp` | Buyer-facing share link view. Use when explaining "what clients receive". |
| `pdf-report-page.webp` | Branded PDF first page. Use for "professional report" angle, agent-facing material. |

All are 4k-sourced, WebP-optimized (~200 KB each), and brand-consistent. Re-optimization for new images is one command: `node scripts/optimize-marketing-images.mjs`.

### Existing docs to send to interested partners or beta testers

- **One-pager for NACHI / state associations:** doesn't exist yet — should be built before pitching them. Use the landing page content + 86% benchmark as the base.
- **E&O carrier guidance doc:** referenced repeatedly on the landing page (FAQ Q2, ControlSection sub-block). Doesn't exist yet but inspectors will ask for it. P1 to draft.
- **Spec & strategy:** `STRATEGY.md` (market + competitive + thesis), `marketing/landing-page.md` (page spec + copy + design intent), `DECISIONS.md` (tech decisions log). These are internal; reference but don't share externally.

---

## 11. Pointers to related docs in this repo

- **`STRATEGY.md`** — market read, competitive landscape (esp. Spectora deep-dive), AI-as-wedge thesis with scenarios, phased roadmap, the 4 defenses, risk register. **Read this before any positioning / pricing decision.**
- **`marketing/landing-page.md`** — landing page rebuild spec. Section copy is the source of truth for the live page.
- **`DECISIONS.md`** — tech/product decision log. Has the rationale for why we picked PWA over native, Whisper over Deepgram, Sonnet over GPT-4, etc.
- **`AGENTS.md`** — Next.js 16 gotchas for anyone touching the codebase.
- **`db/benchmark/README.md`** — how the 86% AI quality benchmark is measured against the 29-case InterNACHI SoP test set. Useful for partnership pitches.

---

## 12. The next 7 days, concretely

If you read nothing else in this doc, do these:

1. **Verify Resend domain** (P0). Once `reports@uselookover.com` works, every other thing in this doc can proceed.
2. **Build (or remove) the footer page stubs.** At minimum: `/sample` should resolve to a real report URL. Other 4 can be 1-paragraph placeholders.
3. **Write the InterNACHI forum post.** Use the template in §3. Don't post yet — read it back to yourself the next morning and edit.
4. **Pick 5 inspector YouTubers and write the DM.** Personal. Mention a specific video. Send 1 per day, not all at once.
5. **Decide on geo focus** (all-US or Texas pilot). This shapes whether you're going to a local NACHI chapter meeting in 14 days or not.

Everything else can wait.
