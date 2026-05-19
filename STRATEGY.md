# Lookover — strategy

Living doc. Not a pitch. Things written here are my actual reading of the market, including the parts that aren't flattering.

---

## 1. The market in one paragraph

US residential home inspection is a ~$5B/year service business with ~30,000–40,000 active licensed inspectors. Each inspector does 200–400 inspections/year at $400–700 per inspection — that's $100K–250K of revenue per solo inspector. The deliverable is a **report**, not an estimate or a quote. Reports take 2–4 hours to write per inspection (the photo culling, the typing, the formatting), even when the on-site walkthrough only took 60–90 minutes. That report-writing time is the cost we're attacking.

---

## 2. The value chain (where money sits today)

```
Buyer ──pays $400-700──► Inspector ──writes──► Report ──reads──► Buyer
                                                                   │
                                                                   ▼
Buyer ──shares──► Roofer/Plumber/HVAC ──quotes──► Buyer
                                                   │
                                                   ▼
Buyer ──negotiates with seller──► Closing
```

Three things matter about this picture:

1. **The inspector is the gatekeeper.** Nothing reaches the buyer without going through them. Win the inspector or you don't exist.
2. **The report is the only artifact.** No estimates, no recommendations of specific contractors, no buyer–contractor relationships managed. By professional standard and by state law, inspectors are forbidden from blurring those lines.
3. **The buyer–contractor step is downstream.** That's where the *biggest* dollars move (a $20K roof replacement quote vs. the $500 inspection), but nobody owns that flow today — it's fragmented across Angi, Thumbtack, word-of-mouth, the inspector's "here are some folks I know" Rolodex.

This is the lay of the land. Every business model question reduces to: which of these arrows are you trying to capture?

---

## 3. Competitive landscape

| Platform | Market position | AI capability today | Pricing | Where they're weak |
|---|---|---|---|---|
| **Spectora** | Market leader, ~$50M+ ARR estimated | "Spectora AI" — a writing assistant that polishes inspector-typed narratives. Not vision, not voice-as-input. | $99–199/mo | Old codebase, slow, AI bolted on. Inspector still types every finding. |
| **ISN (Inspection Support Network)** | Scheduling + back-office, owned by Porch (NASDAQ: PRCH) | Minimal AI in the core product | $89–199/mo | Not a report-writing tool primarily — overlaps with us but not direct competitor. |
| **HomeGauge** | Long-running incumbent, mid-market | Limited AI features added 2024 | $59–149/mo | Desktop-feeling, dated UX. Mobile capture is poor. |
| **Tap Inspect** | Mobile-first SMB | Templates + voice-to-text into fields. No real AI drafting. | $39–99/mo | Cheap and basic. No vision. |
| **Horizon** | Mobile, basic | None meaningfully | $30–60/mo | Just a glorified PDF builder. |
| **Repair Pricer** | Add-on (not a primary report tool) | Pricing AI on existing reports | $40–90 per report | Different category — adds estimates to existing reports |
| **Punchlist** | Similar to Repair Pricer | Pricing AI | Acquired by Pinata 2022 | Same |

What none of them do yet:
- **Vision-first capture.** Take a photo → AI identifies the system, defect, severity. Today's tools have the inspector pick from a dropdown and type a description.
- **Voice-driven walkthrough.** Inspector talks while walking, transcript becomes structured findings tied to photos by timestamp.
- **Real-time AI drafting.** Most tools generate the report at the end. We can have a draft ready before the inspector leaves the property.

That gap is real and it's the wedge.

---

## 4. The AI wedge — honest version

### Why AI changes the adoption math

In normal vertical SaaS, the buyer is choosing between roughly-equivalent products. Switching costs (migrating client data, learning new UX, retraining staff) easily exceed the marginal benefit of switching. That's why incumbents like Spectora keep their grip even when their UX is dated.

AI breaks this math by **changing the value proposition by an order of magnitude**, not a percentage. Concretely: if Lookover saves an inspector 2.5 hours per inspection (4hr report → 30min review), at $50/hr opportunity cost and 250 inspections/year, that's **$31,250/year of time saved** per inspector. Against $1,548/year of subscription, that's a **20:1 ROI**.

When ROI is 20:1, switching costs don't matter. The price of *not* switching becomes the dominant cost.

Compare to the precedent that already happened: **Cursor** took the developer IDE market — a 30-year-old category dominated by VS Code, JetBrains, Vim — and hit $100M ARR in ~24 months because AI assistance was 5–10x productivity, not 20%. The historical adoption curves for "marginal improvement" tools (3–5 years to $5M ARR in vertical SaaS) **don't apply** to AI tools that change the unit economics.

### Why AI isn't actually a "moat"

To be honest with ourselves: AI is a feature, not a moat. Spectora could add Claude Vision in a quarter if they decided to. The Anthropic and OpenAI APIs are commodity. Anyone with a checkbook can replicate our vision pipeline in 30 days.

What's defensible isn't the AI itself. It's:

1. **Workflow integration** — the way photo → voice → finding → review → PDF flows seamlessly. Hard to retrofit onto a 10-year-old codebase like Spectora's.
2. **Brand mindshare in the AI-native category** — first mover advantage in being *known as* "the AI one." When buyers in 2027 ask their inspector friends "what's the AI tool?", we want to be the answer.
3. **Data flywheel** — every approved finding tunes our prompt benchmark. Inspectors editing our drafts is the cheapest training signal in the world.
4. **Distribution lock-in** — inspector signed up via NACHI partnership, integrated into their MLS/CRM, can't easily move.

The window to claim that mindshare is **~18 months**. If Spectora ships real AI in 2027 and we haven't reached escape velocity, the wedge closes and we fight on UX/price, which is a tougher game.

### Realistic scenarios for $5M ARR

| Scenario | Time to $5M ARR | What needs to be true |
|---|---|---|
| **Aggressive (AI-as-wedge wins)** | 12–18 months | Product holds up; we find a distribution lever (NACHI partnership, viral inspector influencer, state-level pilot); ARPU stays ~$130 or grows via add-ons; we don't get distracted by enterprise/commercial early. |
| **Moderate (AI helps but incumbents respond)** | 18–30 months | Some adoption inertia, but ROI story works on demos; we add team plans + repair-estimate add-on to lift ARPU to ~$200 blended. |
| **Conservative (AI is just-another-feature)** | 30–48 months | We grow like normal vertical SaaS, ~1% market share/year. Still works financially, just slower. |
| **Pessimistic (incumbents copy fast + we miss the window)** | Never reaches $5M, plateaus at $1–2M | Spectora ships comparable AI in 2026; we're a commodity feature with no distribution moat. |

I think **moderate is the most likely outcome** (18–30 months) and **aggressive is achievable but requires non-product execution** (great GTM, smart partnerships, founder evangelism). Pessimistic is the real failure mode, and the mitigation is to **move fast on distribution this year**, not to over-engineer the product.

---

## 5. Phased product strategy

This is the order. Don't jump phases.

### Phase 1: Inspection report SaaS (now → +6 months)

**Product:** What we're building. AI vision + voice + draft finding generation + inspector approve + branded PDF + client share link.

**Customer:** Solo and small-team residential inspectors.

**Price:** $129/mo individual ($79/mo founding tier for first 50), $99/seat for teams of 2+.

**Goal:** 50 paying inspectors. ~$80K ARR. Proves the wedge is real. Generates the testimonials and edit-rate data that fund everything else.

**Critical:** Don't add the estimate feature, the contractor marketplace, or the commercial expansion until this phase is *clearly* working. Each extra feature splits attention and dilutes the pitch.

### Phase 2: Repair-estimate add-on (+6 to +12 months)

**Product:** Optional add-on. When the inspector approves a finding, AI generates a regional cost estimate range with disclaimers. Inspector can include in the report, hide, or upsell to the buyer as a $40–80 add-on.

**Customer:** Same inspectors as phase 1. Activates once they trust the platform.

**Price:** Two models to test:
- $0.50 per finding (rolled into inspector's plan)
- 50/50 split with inspector on the $40–80 buyer add-on (so the inspector keeps $20–40 pure margin per inspection)

**Why this is phase 2, not phase 1:** It only works if inspectors already trust the platform with their core report. If we lead with estimates, inspectors get defensive ("you're saying you can do my job?"). If we follow with estimates after they're hooked, it's pure upside ("Lookover also generates these helpful estimates I can upsell").

**Reference business:** Repair Pricer is doing $5–10M ARR doing only this, sold as a separate product. We'd capture that and grow it because it's bundled into the existing workflow.

### Phase 3: Contractor marketplace (+12 to +24 months)

**Product:** Buyer-facing. The approved inspection report has a "Get quotes" button on each major-repair item. Buyer clicks → we route to vetted contractors → contractor pays us a referral fee (15–25% of first invoice, or flat $100–500 per qualified lead).

**Customer:** Two-sided: vetted contractors (supply) and inspection report recipients (demand).

**Revenue model:** Lead gen / referral fee. Not a percentage of the repair cost (that's a kickback in many states for inspectors; we're a separate entity referring downstream so it's structurally fine, but the **inspector cannot get a cut** or they're violating their license).

**Risks:** This is the biggest swing. Angi/Thumbtack/HomeAdvisor own consumer home services and will fight. But:
- We have **intent data they don't** — we know exactly which repairs the buyer needs, with photos + severity, on day one
- We have a **trust transfer from the inspector** — buyer just got a 50-page report telling them what's wrong; they're primed to act
- We control **timing** — the moment the report lands is the highest-intent moment in the entire home-buying journey

If this works, it's the multi-hundred-million-dollar outcome. If it doesn't, phase 1+2 alone can be a healthy $5–20M ARR business.

### Phase 4: Adjacent expansion (+18+ months)

Options, in rough order of attractiveness:

- **Commercial inspections** — different SOP (ASTM E2018, BOMA), higher ACV ($300–600/mo), smaller TAM, but defensible.
- **Real estate brokerage integrations** — Compass, Redfin, eXp partnerships where the inspection report integrates into the transaction platform.
- **Insurance carrier reports** — wildfire / flood / windstorm risk assessments that mirror inspection workflow. Big checks from insurers.
- **DIY homeowner inspection** — let homeowners do their own "annual checkup" inspections with AI assistance. Different market entirely.

Don't commit to any of these now. They're optionality for the right moment.

---

## 6. Go-to-market hypotheses (untested, prioritized)

Listed by my belief in them, highest first. Each one is a real question we need to answer with data, not assertion.

### H1 — InterNACHI is the wedge channel (high confidence)

InterNACHI has ~50,000 members, runs continuing-education courses, hosts forums and conferences. They're the closest thing to a unified membership body inspectors trust. If we:

- Sponsor a NACHI CE course on "AI-assisted reporting"
- Get listed in the NACHI partner directory
- Pay for a booth at the annual conference

...we'd reach 10–20% of the active US market in one year of effort. That's the difference between 12-month and 24-month paths to $5M ARR.

**Action:** Reach out to NACHI's partnership team in month 2 (after we have 5 paying inspectors who'll vouch).

### H2 — Inspector influencers exist and matter (medium-high confidence)

YouTube has a small but dedicated set of inspector-creators (e.g. Standards of Practice, Habitation Investigation, etc.) with 50K–500K subscribers. They drive real software adoption. One favorable demo video = 100+ trial signups in 24 hours. We should:

- Identify the top 10 by subscriber count
- Offer free lifetime access in exchange for an honest review
- Engineer a "wow" demo that takes 5 minutes and produces a finished report

**Action:** Month 1–2 of public launch.

### H3 — State association partnerships (medium confidence)

State-level inspector associations (Texas TAREI, California CREIA, etc.) are smaller but tighter than NACHI. A favorable nod from a state board's "approved software list" is a strong signal. Same play but localized.

**Risk:** Some states are political/incumbent-favoring. Could cost months for a "no."

### H4 — Real estate agent referral loop (medium confidence)

Real estate agents recommend inspectors. If our reports look *dramatically* better than the alternatives — modern HTML report, mobile-friendly, branded, fast — agents will start recommending Lookover-using inspectors specifically. That's pull through the channel.

**Action:** Make the client-side report (the deliverable) genuinely beautiful. Phase 1 priority.

### H5 — Paid acquisition (low confidence)

Google / Facebook / LinkedIn ads to inspectors. Probably works but expensive ($150–300 CAC) and slow to optimize. Save for after H1–H4 are flowing.

### H6 — Cold outreach (lowest confidence)

Building a list, sending emails. Inspectors are bad at email. Will probably underperform.

---

## 7. Risks, in order of how-likely-they-kill-us

### R1 — Inspectors don't trust AI for liability reasons (high impact, medium probability)

Every inspector carries E&O insurance. Their carrier may explicitly exclude AI-assisted reports. If carriers start excluding, Lookover is dead in the water.

**Mitigation:** Our "inspector approves every finding" architecture is the legal answer. AI drafts, human signs. We need a published whitepaper on this with citations to existing AI-disclosure rulings, ready for any underwriter or board to read. Also get an E&O carrier (Allen Insurance, Hartford) to *bless* Lookover explicitly — that's gold for the inspector pitch.

### R2 — Incumbent ships comparable AI before we hit escape velocity (high impact, medium probability)

Spectora has 5x the engineers and a customer base to defend. If they ship "Spectora Vision" in 2027 and it's 70% as good as ours, we lose the differentiation pitch.

**Mitigation:** Speed. The window is 18 months. Don't get distracted by enterprise/commercial/marketplace until we have 1,000+ inspectors on the platform.

### R3 — AI hallucinations or wrong severity calls leak through to a finalized report (catastrophic impact, low probability)

If our AI says "no GFCI hazard" and there is one, and the buyer gets electrocuted, *and* the inspector signed off without reading carefully — we get sued. The inspector also gets sued, but our liability is real.

**Mitigation:** "Inspector approves every finding" is the architectural answer. UI nudges: can't finalize without explicit per-finding approval. Track edit rate as a quality signal. Keep prompts conservative on severity.

### R4 — Cost of AI eats margins (medium impact, low probability)

If Whisper + Claude costs balloon (Anthropic raises prices, inspectors do longer voice notes), our gross margin could compress.

**Mitigation:** Today, all-in AI cost per inspection is ~$0.50–1.00 (Haiku vision × 30 photos = $0.30, Sonnet drafting × 30 findings = $0.30, Whisper × 5 min audio = $0.05). At $129/mo and 20 inspections/mo per inspector, that's $20 of AI cost on $129 of revenue — 85% gross margin. Healthy. Could compress to 70% even with 2x cost increases.

### R5 — Adoption is genuinely slower than the AI thesis predicts (medium impact, high probability)

Inspectors are *conservative*. They've been writing reports the same way for 20 years. "AI" is scary for the older half. Our adoption curve may look like normal vertical SaaS even though the ROI story is dramatic.

**Mitigation:** Don't bet the company on aggressive timelines. Plan for moderate (18–30 months to $5M). Aggressive is upside.

---

## 8. Open questions for Enlil to answer

Things I'm guessing on right now, that need real input or data:

1. **Founder background pitch.** Do you have an inspector connection? An ex-Spectora hire? A real estate agent partner? These shape distribution paths. If "no" to all — the first hire should be someone with that connection.
2. **Funding plan.** Bootstrapped vs. raise? Aggressive AI timelines assume capital for NACHI sponsorship, conference booths, and 2–3 hires. Bootstrapped is fine but pushes you into "moderate" scenario.
3. **Initial geography.** All-US from day 1, or pilot in one state? Single state has tighter feedback loops and easier conference presence; all-US is bigger TAM. I'd lean Texas (large inspector base, friendly regulatory environment, you're probably here based on the demo address I generated earlier).
4. **Time horizon you care about.** Is the target "shipping to first 10 paying users by month 3" (lean MVP, fast iteration), or "first $1M ARR by year 1" (need to start the GTM machine in parallel with product)?
5. **What happens if Spectora calls in 6 months and offers to acquire?** Founders often don't think about this until it's in front of them. Worth pre-deciding the floor number.

---

## 9. What this strategy means for what we're building right now

Direct implication for the codebase:

- **The inspector-approval architecture is correct.** Keep building it. It's the legal moat *and* the data flywheel.
- **The client-facing report (PDF + share link) deserves real design love.** It's the marketing surface — every buyer who sees an Lookover report is a potential referral to their next inspector friend or family member's inspector.
- **The repair-estimate add-on is a v2 plumbing decision now.** Build the data model so we can layer it later without a migration. The findings table is already there.
- **Voice notes are non-negotiable.** The mobile voice walkthrough is *the* differentiated demo moment. Polish it.
- **The brand should lean into "AI-native" but not "AI hype."** Inspectors hate hype. "Talk through the inspection. We draft the report. You approve every word." That's the line.

---

*Last updated: 2026-05-13. Edit liberally. Append; don't delete history.*
