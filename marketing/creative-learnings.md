# Creative learnings — what actually works for Lookover ads

> Written 2026-07-15 after three rounds of AI-generated ad creative, one video round,
> and one $409 Meta campaign. The raw source files (18 images at 2k/4k + 3 videos)
> are archived at `E:\Project Megladon\creative-archive\` — Higgsfield account was
> wiped after export, so that folder and this repo are the only copies.
> Feed-ready versions live in `public/marketing/ads/` (round 1-2) and
> `public/marketing/ads/round3/` (current set).

---

## The one-line summary

**Photoreal product-in-the-world beats everything else for this audience. Lead with
the defect, let the app's finding be the punchline, keep faces out of frame.**

---

## What the founder approved (the taste profile)

Consistent pattern across every approval this project:

1. **Apple-style product photography with real UI content** — phone/laptop/PDF
   showing actual SOP findings ("Water heater · 2009 Rheem", "T&P discharge above
   pan"). Approved every time.
2. **Photoreal environmental shots, product embedded** — phone in the utility room,
   laptop with hand on trackpad, hero phone-in-hand at a daylit house. Approved.
3. **Bright daylight** — the twilight/night versions were explicitly rejected
   ("theyre just at night... lets make them day time").
4. **Real inspection content** — the more specific the finding (IRC code cites,
   brand/model/year of water heater), the better it landed.

## What got rejected (do not repeat)

1. **AI-generated people/faces** — "a dude looks weird imo". Even good renders of
   inspectors read as uncanny to the founder (and would to inspectors too). Hands
   and wrists only.
2. **Moody lifestyle photography** — the "exhausted guy typing at midnight" concept:
   "why is the dude in a dark room in his house wtf are we doing". Pain-porn
   framing doesn't fit; the payoff (report delivered, home for dinner) does.
3. **Text-based / flat-design ad cards** — killed on first look ("no text based
   ads")… then the **iMessage thread was revived on 2026-07-19** after the founder
   saw it rendered ("might be really good, can we run those"). Lesson: taste calls
   made sight-unseen aren't final — show the actual render before burying a
   concept. The finding-card and schedule flat-designs stay benched.
4. **Cinematic brand video as a paid ad** — the 8-sec dolly-in was fine as a hero
   loop but has no hook and no "aha"; wrong tool for cold traffic. It now lives as
   the landing-page hero loop (`public/marketing/hero-loop-web.mp4`).

## The creative thesis that survived

- **Inspectors stop scrolling for defects, not software.** Defect photos ("what
  would you write up here?") are the #1 engagement format in inspector Facebook
  groups. Lead with corroded flashing / stained sheathing; the app's already-drafted
  finding is the reveal.
- **Three-frame story arc across the set:** the defect moment (roof), the deep-grit
  moment (attic flashlight), the payoff moment (tailgate, "Report delivered ·
  4:31 PM"). Together they cover hook → credibility → aspiration.
- **The UI-pop video** (photo → waveform → finding card springs in, 6 sec) is the
  product's aha compressed into one loop. Built by pinning the approved still as
  the **end frame** in Seedance so mid-frames animate toward a guaranteed-crisp
  ending.

## Technical craft notes (for the next person generating)

- **Model:** Higgsfield Nano Banana Pro (`nano_banana_2`) for anything with UI
  text — the only model that renders "IRC P2804.6" legibly. 4k for photoreal,
  2k for flat design.
- **Text rules that worked:** spell out every string verbatim in the prompt, demand
  "perfect text rendering, no garbled letters," and keep body copy under ~3 lines
  per card. QA every output by zooming on the text; regen on any garble.
- **Trigger words to avoid:** "professional / magazine quality / cinematic" push
  toward over-polish; "AI" in visible ad text reads as gimmick to this audience
  (per OFFER-POLICY / campaign playbook brand rules).
- **Video that works:** lock the camera, animate ONLY UI elements as whole units
  (cards popping in), pin start or end frames to approved stills. Letter-by-letter
  or morphing text always garbles.
- **Pipeline:** generate 4k → `ffmpeg -q:v 2` to ~550 KB JPEG at 2048 (1:1) or
  1080×1920 (9:16) → commit. Videos: strip audio only if for muted placements;
  the UI-pop keeps its soft pop sound.

## The funnel lesson (more important than any creative)

The first $409 Meta campaign produced **zero registrations — and it was never a
creative test.** Signup was broken (Supabase email-confirmation rate limit) and the
pixel's Lead event fired on page view instead of submit for most of the run.

**Before any future spend, verify end-to-end:** ad URL → landing → signup completes
→ `CompleteRegistration` fires in Events Manager. Five minutes of checking beats
$400 of learning nothing.

## Current deliverable state (2026-07-15)

| Asset | File | Status |
|---|---|---|
| Roof defect 1:1 + 9:16 | `round3/ad-roof-defect-1x1.jpg`, `ad-roof-9x16.jpg` | Ready |
| Attic flashlight 1:1 + 9:16 | `round3/ad-attic-flashlight-1x1.jpg`, `ad-attic-9x16.jpg` | Ready |
| Tailgate delivered 1:1 + 9:16 | `round3/ad-tailgate-delivered-1x1.jpg`, `ad-tailgate-9x16.jpg` | Ready |
| UI-pop video 1:1 (6s) | `round3/ad-roof-ui-pop-1x1.mp4` | QA'd frame-by-frame, ready |
| iMessage thread 1:1 | `round3/ad-imessage-1x1.jpg` (+ `-alt` variant) | Revived 2026-07-19, QA'd, ready. Copy: "The 8:47 PM 'is the report ready?' text hits different when you sent it at 4:30." / headline "Same-day reports. Every day." Chat-UI ads may get a slower manual review pass on Meta — normal. |
| Copy pairings | this doc + chat log | Roof: "You saw it. It wrote it up. You approve it." / Attic: "Voice notes in the crawlspace become SOP findings by the truck." / Tailgate: "Report delivered before you left the driveway." |

Next step when resuming: load these into the **Lookover Ads** account
(3154552934738836 — NOT the Bella Venice account) as one ad set optimizing for
CompleteRegistration at $30/day per `marketing/ads/campaign-agent-prompt.md`,
leave the five dead ad sets from the June run paused, stop before Publish for
founder sign-off.

## Archive inventory (`E:\Project Megladon\creative-archive\`)

- `images-raw/` — 18 PNGs, human-renamed: `photo-{roof,tailgate,attic}-{1x1,9x16}-v{1,2}`
  (v1 = the picked winners for 1:1), `text-{imessage,findingcard,schedule}-1x1-v{1,2}`
  (rejected direction, kept for record).
- `videos/` — `video-roof-ui-pop-1x1.mp4` (the ad), `video-hero-brand-16x9.mp4` +
  `video-hero-brand-9x16.mp4` (brand/hero loops), plus QA frames.
