# Meta ads, round 2: tracked test against the iPhone picture ad

> Written 2026-10-15. Binding rules: `marketing/OFFER-POLICY.md`. Creative taste and
> craft notes: `marketing/creative-learnings.md`. This doc replaces the hard-coded
> `utm_source=meta&utm_medium=cpc` URLs in older ad docs. From now on every ad uses
> the URL-parameter string in section 1.

## Where we are

- Meta ads ran until early August and brought in about 17 signups. None of them uploaded a photo. Activation is being worked on separately. This round is about finding which ads bring in **the right people**, not just more signups.
- The "iPhone picture" ad is live again.
- As of today the site records first-touch attribution on every signup (utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, external referrer). `/admin` shows it in a **Source** column next to **Onboarded** and **Inspections**. We can now judge each ad by real signups and real usage, not just by what the Meta pixel reports.
- The 17 earlier signups have no source recorded. Every ad's baseline starts today.

How the Source column reads (from `lib/attribution.ts`):

| What the visitor arrived with | What /admin shows |
|---|---|
| Our URL parameters (section 1) | `facebook / paid · <ad name>` |
| An fbclid but no UTMs (an ad that's missing the parameters) | `facebook (click)` |
| Nothing, or a later signup on a different device or browser | `—` |

**If you see `facebook (click)` in /admin, some live ad is missing its URL parameters.** Find it and fix it.

---

## 1. The URL-parameter string

Paste this exact string into the **URL parameters** field of every ad:

```
utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{site_source_name}}
```

- `{{ad.name}}` is what shows up in /admin, so **the ad name is the label you'll read.**
- `{{site_source_name}}` fills in `fb`, `ig`, `msg` or `an`, so the raw data also says whether the click came from Facebook or Instagram.
- `{{campaign.name}}` is the fallback label if an ad name is ever missing.

### Ad naming rules (these names appear in /admin)

- Short, lowercase, hyphens only, no spaces, 20 characters or fewer, unique across the whole account.
- Name the concept, not the date or format. Don't reuse a name for a different creative. A new version of a concept gets a new suffix (`r2-truck-b`).
- Don't rename a live ad mid-test. Clicks before the rename keep the old name and the counts split.

| Ad | Name to use |
|---|---|
| The live iPhone picture ad | `iphone-pic` |
| Round-2 concepts (section 2) | `r2-truck`, `r2-signoff`, `r2-panel-vid`, `r2-wh-carousel`, `r2-dinner` |
| Round-2 campaign | `lk-r2` |
| Round-2 ad set | `r2-test` |

### Where to paste it: the live iPhone picture ad (do this today)

1. Open **Ads Manager**, go to the **Ads** tab, and find the iPhone picture ad. Hover over it and click **Edit**.
2. **Ad name** (top of the edit panel): change it to `iphone-pic`. Renaming doesn't send the ad back through review.
3. Scroll to **Destination**, then **Website URL**. Make sure the URL has **no `?utm_...` on it**. It should be plain, e.g. `https://www.uselookover.com/signup`. If old UTMs are hard-coded there, delete everything from the `?` onward. The site reads the first value it sees, so old hard-coded UTMs would win over the new ones and mislabel every signup.
4. Scroll to the bottom section, **Tracking**. Leave **Website events** checked with the Lookover pixel (`2216322015810270`). In the **URL parameters** field, paste the string above.
5. While you're in there, check the **Description** field. If it says "for life" anywhere (older copy did), change it to: `$79/mo founding price for the first 50 · 14-day free trial, no card`.
6. Click **Publish** (bottom right). This sends the edit to Meta's review, which usually takes minutes to a few hours. Editing a live ad's creative can also briefly reset its delivery learning. That's worth it: without these parameters, every signup the ad produces from here on is just `facebook (click)`.
7. Test it (section 5, step 3).

### Where to paste it: every new ad

The same **Tracking → URL parameters** field sits at the bottom of each ad's edit panel. Shortcut: build all the ads, then on the **Ads** tab tick every ad's checkbox and click **Edit**. Ads Manager edits them together, and the URL parameters field applies to all the selected ads at once. Paste the string once.

You can also click **Build a URL parameter** under the field. It's the same thing. Pasting the string is faster and avoids typos.

---

## 2. Concepts to test against `iphone-pic`

Five concepts. **Launch four (1 to 4). Hold `r2-dinner` in reserve** as the first replacement when something gets killed. At $20/day, five new ads plus a control spreads the money too thin to learn anything.

Shared across all five:

- **CTA:** Sign up. Match whatever the iPhone ad uses so only the creative differs.
- **Website URL:** the same destination the iPhone ad uses (default `https://www.uselookover.com/signup`), with no UTMs in it.
- **Description:** `$79/mo founding price for the first 50 · 14-day free trial, no card`
- **Copy rules followed:** no headline starts with "AI" (the word isn't used at all), no "free for life" or lifetime language, no cost estimates or dollar amounts in any report or UI shown, no stats, testimonials or quotes, no competitor mentions, no exclamation points.

### Higgsfield rules for every prompt below (from creative-learnings.md)

- Model: **Nano Banana Pro** for every still with UI text (it's the only one that renders it cleanly). 4k, then compress to about 550 KB JPEG at 2048×2048 (1:1) and 1080×1920 (9:16).
- Generate **both 1:1 and 9:16** from the same prompt.
- **Hands and wrists only. No faces, no full people.**
- **Bright daylight.** No night, no moody lighting.
- Spell every on-screen string exactly as written. Add "perfect text rendering, no garbled letters" to the prompt. Zoom in on every output and regenerate if any letter is off, especially "Lookover".
- **No dollar amounts, prices, or cost figures anywhere on any screen.**
- Don't use "professional", "magazine quality" or "cinematic" in prompts. They push toward over-polish.
- Video: lock the camera and animate only UI elements as whole units. Pin the approved still as the **end frame** (Seedance) so the last frame is guaranteed crisp.

---

### Concept 1: `r2-truck` (turnaround)

**Angle:** the report is drafted before they're back at the truck. This is the product's core promise, shown at the moment it pays off.

- **Primary text:**
  > The inspection's done by mid-afternoon. Then the report takes your evening.
  >
  > With Lookover you take photos and talk through what you see as you walk the house. By the time you're back at the truck, the findings are drafted. You read each one, fix what you want, and approve it.
  >
  > Built for residential home inspectors. 14-day free trial, no card.
- **Headline:** `Drafted before you're back at the truck`
- **Description:** shared (above)
- **CTA:** Sign up

**Higgsfield prompt (still, 1:1 and 9:16):**
> Photoreal photo, bright midday daylight. Over-the-shoulder view from just behind a home inspector's right hand holding an iPhone at the open driver's door of a white work pickup, parked at the curb in front of a single-story brick ranch house in a Texas suburb. Only the hand and wrist are visible: tan work-shirt cuff, no face, no other people. The truck seat shows a clipboard and a flashlight. The phone screen is sharp and readable and shows a clean app UI with a navy header reading "Lookover", a line reading "Mesquite Ln · Today", a large line reading "27 findings drafted", a smaller gray line "Drafted while you walked", and a rounded orange button reading "Review and approve". White background on the screen, navy text, one orange accent. Shallow depth of field, house slightly soft behind. Perfect text rendering, no garbled letters, no dollar amounts or prices anywhere, no logos other than "Lookover".

---

### Concept 2: `r2-signoff` (staying in control, E&O worry)

**Angle:** the biggest objection is "what if it's wrong, and it's my license?" Answer it head-on: it's a draft until they sign off. Don't promise anything about insurance coverage.

- **Primary text:**
  > It's your license on the report. So it's your call on every finding.
  >
  > Lookover drafts each finding from your photos and voice notes. Nothing goes to your client until you've read it and approved it. Change the wording, change the severity, or delete it. It stays a draft until you sign off.
  >
  > Built for residential home inspectors. 14-day free trial, no card.
- **Headline:** `Nothing goes out without your sign-off`
- **Description:** shared
- **CTA:** Sign up

**Higgsfield prompt (still, 1:1 and 9:16):**
> Photoreal photo, bright daylight from a window on the left. A laptop on a light wood desk in a tidy home office. One hand resting on the trackpad, wrist and forearm only, no face. The laptop screen is sharp, readable and fills most of the frame. It shows a clean review app with a navy left sidebar reading "Lookover" and "12 of 27 approved". The main panel shows one finding card with a photo thumbnail of a water heater, a bold title "TPR discharge terminates too high", and body text reading "The water heater's temperature and pressure relief discharge pipe ends about 18 inches above the floor. Recommend a licensed plumber extend it to within 6 inches of the floor." There's a red pill reading "Safety hazard" with a small dropdown arrow, and three buttons below the card: an orange "Approve", a gray "Edit" and a gray "Delete". White UI, navy text, single orange accent. Perfect text rendering, no garbled letters, no dollar amounts, prices or cost figures anywhere on screen.

---

### Concept 3: `r2-panel-vid` (talk instead of type, 6-second video)

**Angle:** the voice note is the "aha". Show the photo and voice becoming a finding in one loop. Inspectors stop scrolling for defects, so lead with a real one.

- **Primary text:**
  > Say it like you'd say it to your client. Lookover takes the photo and what you said and drafts the finding while you're still standing at the panel.
  >
  > You approve every finding before the report goes out. Talk through the inspection and skip the typing tonight.
  >
  > 14-day free trial, no card.
- **Headline:** `Say what you see. Skip the typing.`
- **Description:** shared
- **CTA:** Sign up

**Higgsfield prompt, step 1 (end-frame still, Nano Banana Pro, 1:1 and 9:16):**
> Photoreal photo, bright daylight in a clean garage. A residential electrical panel on the wall with the gray metal cover on, one knockout on the cover visibly open (a round hole with no filler plate). In the foreground, one hand (wrist only, no face) holds an iPhone up toward the panel. The phone screen is sharp and readable: a photo of the same panel at the top, below it an orange audio waveform, and below that a white finding card with the bold title "Unfilled knockout at panel cover", body text "An open knockout in the electrical panel cover leaves energized parts exposed. Recommend a licensed electrician install a knockout filler plate.", and a red pill reading "Safety hazard". The app header reads "Lookover". White UI, navy text, single orange accent. Perfect text rendering, no garbled letters, no dollar amounts or prices anywhere.

**Higgsfield prompt, step 2 (video, Seedance, 6 s, end frame = the step-1 still):**
> Locked-off camera, no camera movement. Same garage, same hand and phone. 0 to 2 seconds: the phone screen shows the camera taking a photo of the panel, with a white shutter flash. 2 to 4 seconds: an orange audio waveform animates under the photo as if someone is speaking. 4 to 6 seconds: the white finding card pops in as one whole unit, with a soft spring, and settles into the final frame. Animate only whole UI elements. No letter-by-letter typing, no morphing text. The hand stays steady. Soft "pop" sound when the card lands, no music.

QA: step through the video frame by frame. Any garbled text in any frame means regenerate.

---

### Concept 4: `r2-wh-carousel` (defect-first, two-card carousel)

**Angle:** defect photos ("what would you write up here?") are the most engaging format in inspector groups. Card 1 is the hook, card 2 is the reveal. It's also a new **format** (carousel), so it tests something the round-3 singles didn't.

- **Primary text:**
  > You'd write this one up in your sleep. The question is whether you want to type it tonight.
  >
  > Snap it, say it, and the finding is drafted before you leave the garage. You review and approve every finding before your client sees a word.
  >
  > Built for residential home inspectors. 14-day free trial, no card.
- **Card 1 headline:** `What would you write up here?`
- **Card 2 headline:** `Already drafted. Your call.`
- **Description (both cards):** shared
- **CTA:** Sign up
- In Ads Manager, turn **off** "Automatically show the best performing cards first" so the hook always comes first.

**Higgsfield prompt, card 1 (1:1 only, carousels are square):**
> Photoreal photo, bright daylight through an open garage door. A 40-gallon gas water heater standing in a drain pan in a residential garage. The temperature and pressure relief valve discharge pipe runs down the side of the tank and clearly ends about 18 inches above the floor, well above the pan. Concrete floor, pegboard wall, an ordinary lived-in garage. No people, no hands, no text, no labels, no logos. Sharp focus on the end of the discharge pipe.

**Higgsfield prompt, card 2 (1:1):**
> Same garage and water heater as before, now slightly out of focus in the background. In the foreground, one hand (wrist only, no face) holds an iPhone. The screen is sharp and readable: the app header reads "Lookover", a photo thumbnail of the water heater, and a white finding card with the bold title "TPR discharge terminates too high", body text "The relief valve discharge pipe ends about 18 inches above the floor. Recommend a licensed plumber extend it to within 6 inches of the floor.", a red pill reading "Safety hazard" and an orange button reading "Approve". White UI, navy text, single orange accent. Perfect text rendering, no garbled letters, no dollar amounts or prices anywhere.

---

### Concept 5 (reserve): `r2-dinner` (evenings back)

**Angle:** the payoff, not the pain. The report went out and the evening is theirs. Creative-learnings says to keep it daylight: no dark rooms and no exhausted-guy shots.

- **Primary text:**
  > When did you last send a report the same day without staying up to finish it?
  >
  > Lookover drafts the findings while you walk the house, so what's left at home is a review, not a night of typing. You approve every finding before it goes out.
  >
  > Built for residential home inspectors. 14-day free trial, no card.
- **Headline:** `Report sent. Laptop closed before dinner.`
- **Description:** shared
- **CTA:** Sign up

**Higgsfield prompt (still, 1:1 and 9:16):**
> Photoreal photo, warm late-afternoon daylight streaming through a kitchen window, clearly still daytime. A closed laptop pushed to the side of a kitchen counter, a set of truck keys and a work flashlight beside it, and a cutting board with vegetables being prepped for dinner. No people, no faces. An iPhone lies face-up on the counter in the foreground with a sharp, readable notification banner reading "Lookover" on the first line and "Report delivered to client · Mesquite Ln · 4:52 PM" on the second. Clean, ordinary, lived-in home. Perfect text rendering, no garbled letters, no dollar amounts or prices anywhere.

---

## 3. Campaign structure

Keep the iPhone ad where it is. Its ad set is already in delivery, and moving or duplicating it throws that away. Build round 2 as a **separate campaign**, so Meta can't move budget between the control and the test, and so the iPhone ad's learning isn't touched.

| Setting | Round 2 (`lk-r2` / `r2-test`) |
|---|---|
| Campaign objective | **Leads** (as in earlier runs) |
| Campaign budget | **Off** (Advantage campaign budget off, so the budget is set on the ad set) |
| Conversion location | Website |
| Performance goal / event | Maximize conversions, pixel `2216322015810270`, event **CompleteRegistration** (fires only when an account is actually created). Don't optimize for `Lead`. It fires on form submit, before the account exists. |
| Bid | Highest volume (lowest cost), no cap |
| Daily budget | **$20/day** |
| Audience | **Copy the iPhone ad set's audience exactly**, so the only thing that differs is the creative. If you're building it from scratch, use the earlier set: US → Texas, age 35–60, interests Home inspection OR InterNACHI OR Real estate appraisal, Advantage+ audience off. |
| Placements | Manual: Facebook Feed, Instagram Feed, Facebook Stories, Instagram Stories, Instagram Reels. **Off:** Audience Network, right column, Messenger, search and in-stream video. Audience Network brings accidental clicks, not inspectors. |
| Ads | `r2-truck`, `r2-signoff`, `r2-panel-vid`, `r2-wh-carousel`. Hold `r2-dinner` in reserve. |
| Advantage+ creative | **Turn off all enhancements**, including text improvements, music, image touch-ups and adding overlays. Meta's automatic text variations can rewrite the copy into things the offer policy doesn't allow. |
| Status | **Built paused.** You publish it. |

**Budget split for a solo founder:**

| Line | Daily | 14 days |
|---|---|---|
| `iphone-pic` (control, existing ad set) | leave as is if it's $10–15/day; if it's higher, lower it to $15 once | about $140–210 |
| `r2-test` (4 new ads) | $20 | $280 |
| **Total** | **about $30–35/day** | **about $420–490** |

**Hard cap for round 2: $500 total** across both, unless a scale rule in section 4 fires and you decide to go past it.

**How long before judging:**

- **Days 1–3:** don't touch anything except the hard-stop rules. Meta is still learning and the numbers are noise.
- **Day 7:** first ad-level calls (kill rules below).
- **Day 14:** verdict on round 2, meaning which concept replaces or joins `iphone-pic` as the control.
- Judge onboarding no sooner than **72 hours after** a signup. People sign up on their phone and finish onboarding later.

---

## 4. Kill and scale rules

### What to pull, and when

Check once a day, same time. Act only at day 3 (hard stops), day 7 and day 14.

| Number | Where |
|---|---|
| Spend per ad, link CTR, frequency, Meta "Results" (CompleteRegistration), cost per result | Ads Manager, **Ads** tab, date range = since launch |
| Signups per ad | `/admin` Source column: count rows reading `facebook / paid · <ad name>` |
| Onboarded per ad | `/admin` **Onboarded** column on those rows |
| Ran an inspection | `/admin` **Inspections** column ≥ 1 on those rows |

Work out **cost per /admin signup** = Meta spend ÷ /admin signups, and **cost per onboarded signup** = Meta spend ÷ onboarded. **When Meta and /admin disagree, trust /admin.** Meta counts view-through and modeled conversions. /admin counts real accounts that clicked that ad.

The /admin signups table only shows the most recent 25. Once there are more than that, or if you want per-ad totals in one shot, run this read-only query in the **Supabase SQL editor**:

```sql
select
  coalesce(au.raw_user_meta_data->'signup_source'->>'utm_content',
           case when au.raw_user_meta_data->'signup_source'->>'fbclid' is not null
                then 'facebook (click, no params)' end,
           'no source') as ad,
  count(*) as signups,
  count(u.onboarding_completed_at) as onboarded,
  count(*) filter (where exists (
    select 1 from public.inspections i where i.inspector_id = u.id)) as ran_inspection,
  count(*) filter (where exists (
    select 1 from public.inspections i
    join public.photos p on p.inspection_id = i.id
    where i.inspector_id = u.id)) as uploaded_photo
from public.users u
join auth.users au on au.id = u.id
where u.created_at >= '2026-10-15'
group by 1
order by signups desc;
```

### Hard stops (any day)

| Condition | Action |
|---|---|
| An ad is rejected, or the account or Page gets restricted | Pause round 2 and sort it out before spending more |
| `facebook (click)` rows appear in /admin | An ad is missing URL parameters. Fix it the same day (section 1). |
| Round 2 total spend reaches $500 | Pause `r2-test`. Write up the verdict. |

### Kill an ad (day 7 or later)

First match wins.

| # | Condition | Action |
|---|---|---|
| K1 | Spend ≥ $40, **0 /admin signups**, link CTR < 0.6% | Pause. It isn't stopping inspectors. |
| K2 | Spend ≥ $75 and **0 /admin signups**, whatever Meta's "Results" says | Pause. |
| K3 | **3 or more /admin signups and 0 onboarded**, 72 h after the third | Pause even if it's cheap. It's bringing in the wrong people. |
| K4 | Cost per /admin signup more than **2×** the cheapest ad in the test, after $60 spend | Pause. |
| K5 | Frequency > 3.5 and CTR down 30%+ from its first-week average | Swap in `r2-dinner` (or a new version), named with a new suffix. |
| K6 | Meta has spent under $10 on an ad by day 7 | Meta has already passed on it. Leave it, but don't count it as tested. If two ads are starved, swap one for `r2-dinner`. |

When you pause an ad, add the reserve straight away so there are always 3 or 4 live in `r2-test`.

### Scale an ad (day 7 or later)

| # | Condition | Action |
|---|---|---|
| S1 | **3 or more /admin signups, 2 or more onboarded**, and cost per onboarded ≤ $60 | Raise the `r2-test` budget 20%. Wait 3 days before raising it again. Cap: $50/day for the ad set without a deliberate decision to go higher. |
| S2 | **Any signup from the ad has run an inspection** (/admin Inspections ≥ 1) **and** S1 holds | This ad is the round-2 winner candidate. Write down the creative and angle in `creative-learnings.md`. |
| S3 | A round-2 ad beats `iphone-pic` on **cost per onboarded signup** over the same dates, with at least 3 onboarded each | It becomes the new control. Lower `iphone-pic` to $5/day or pause it. |

### Reading the result honestly

- **Onboarded is the creative gate. Inspections is the scale gate.** Activation is being fixed separately, so if *no* paid signup from *any* ad runs an inspection, that's an onboarding problem, not a creative verdict. Don't kill everything for it. But an ad whose signups don't even finish onboarding (K3) is bringing in the wrong people, whatever the onboarding flow does.
- **If $300 is spent across both and nothing has onboarded,** stop round 2. Creative isn't the bottleneck. Go back to the landing page and onboarding before spending more.
- The numbers are small. Three signups versus one signup is a direction, not proof. Write down what you see in `marketing/tracking/weekly-metrics.md` every Sunday.

---

## 5. Founder checklist for Ads Manager

**Today (about 15 minutes):**

1. [ ] Open the live iPhone picture ad, then **Edit**. Rename it to `iphone-pic`.
2. [ ] Strip any `?utm_...` from its **Website URL**. Paste the section 1 string into **Tracking → URL parameters**. If the description says "for life", fix it. Click **Publish**.
3. [ ] Test it. Open a **private or incognito window** (attribution is first-touch, so your normal browser won't count) and visit
   `https://www.uselookover.com/signup?utm_source=facebook&utm_medium=paid&utm_campaign=test&utm_content=test-click`.
   Sign up with a throwaway email. In `/admin`, confirm the new row's Source reads `facebook / paid · test-click`. Delete the test account afterwards (Supabase → Auth → Users).
4. [ ] In Events Manager → pixel `2216322015810270` → **Test events**, confirm that test signup fired `CompleteRegistration`.

**When the round-2 creative is generated (via Higgsfield, from section 2):**

5. [ ] QA every image at 100% zoom: spelling of "Lookover", no garbled text, no faces, no dollar amounts. QA the video frame by frame.
6. [ ] Create campaign `lk-r2`: **Leads** objective, campaign budget **off**.
7. [ ] Create ad set `r2-test`: website conversion, pixel `2216322015810270`, **CompleteRegistration**, $20/day, audience copied from the iPhone ad set, manual placements (no Audience Network, right column or Messenger).
8. [ ] Create the four ads (`r2-truck`, `r2-signoff`, `r2-panel-vid`, `r2-wh-carousel`) with the copy from section 2. Use the same Website URL and CTA as `iphone-pic`, with no UTMs in the URL.
9. [ ] Select all four ads, then **Edit**, then paste the section 1 string into **URL parameters** once.
10. [ ] Turn **off** Advantage+ creative enhancements on each ad. On the carousel, turn off "show best performing cards first".
11. [ ] Re-read every field for: no "AI" in any headline, no "for life", no prices other than the $79 founding price, no stats or quotes.
12. [ ] **Leave the campaign, ad set and ads toggled OFF.** Click Publish only when you're ready, and switch the toggle on yourself. Note the date. Day 7 and day 14 checks count from then.

**Day 7 and day 14:** apply section 4, using `/admin` (or the SQL query) next to the Ads Manager **Ads** tab.
