# Cold email — Texas home inspectors (Oct 2026)

Sent by hand-style from hello@uselookover.com, signed Enlil. Plain text, no images,
no tracking pixels, ~20 a day. Leads: `leads-*.csv` in this folder (gitignored),
built from inspectors' own websites and checked against TREC's public license list.

## Rules
- Under 110 words. One question at the end. Reads like Enlil typed it.
- Personal line uses a TRUE detail from their site (`personal_detail`). If it's
  weak, drop the line rather than fake it.
- Never claim results, customers or numbers Lookover doesn't have (no
  "inspectors are getting…", no user counts). Claims must be about what the app
  does.
- personal_line: one sentence, about them, and ideally tied to report writing or
  how busy they are. Vary the opener ("Saw…", "Noticed…", "Looks like…", "Your
  site mentions…"). Write numbers with commas (15,750). Skip praise of slogans or
  review counts. If they already advertise same-day reports, don't pitch
  "same afternoon"; say it cuts the writing time instead.
- No prices, no "AI" in the subject, no "free for life", no attachments.
- Each email has exactly one link: the state short link (`https://uselookover.com/tx`,
  `/fl`, `/go`). It lands on /try, the no-signup demo where they drop photos and
  see the written findings. Follow-ups carry the same link.
- Links (since 2026-11-08): always the full `https://uselookover.com/<code>` —
  never bare `uselookover.com/...` (Gmail autolinks that as `http://`, adding an
  http→https hop), never `www.` (adds a www→apex hop), never a Google
  `google.com/url?q=` wrapper (the Gmail connector adds one; send from the Gmail web
  UI only). In compose, the link must be a real anchor whose href is that exact
  https URL. Check: `curl -sIL -o /dev/null -w "%{num_redirects}"` on the URL prints 1.
- Suppression (since 2026-11-08): never email anyone in `suppression-list.txt`
  (case-insensitive) or anyone whose `outreach-log.json` entry has `opted_out`,
  `bounced` or `replied_at` set. Check both before every send, including follow-ups.
- The ask (since 2026-10-28) is "try it on your last inspection" at that link.
  It replaced the reply-with-photos offer (2026-10-26) and the video offer before
  that: 100 emails, 3 replies, all no. If someone still replies with photos, the
  signup monitor and `write-it-for-you.md` handle it.
- Footer: postal address + "reply 'no thanks' and I won't email again" (CAN-SPAM).
  Honor every opt-out the same day; log it in `outreach-log.json`.
- Stop the sequence the moment anyone replies.

## Email 1 (day 0)

**Subject (A/B test, alternate by lead):**
- A: `{first_name}, try this on your last inspection`
- B: `Your photos, written up as TREC findings`
Log which one each lead got (`subject_variant`: "A"/"B" in outreach-log.json).

Hey {first_name},

I'm Enlil, I built Lookover, an app that writes inspection findings from your
photos. {personal_line}

Quickest way to judge it: go to https://uselookover.com/tx, pick 10 photos from your last
inspection, and each one comes back as a written finding in SOP language,
grouped by section. Takes about two minutes. No signup, and the photos aren't
saved.

On a real job you add a few spoken words per defect and approve every line
before it goes out, and for Texas it fills out the TREC REI 7-6, I/NI/NP/D boxes and all.

Worth two minutes to see if it gets your houses right?

Enlil
Lookover

{footer}

### personal_line examples
- "Saw on your site you've been inspecting around Katy for 15 years, so you've
  probably written the same water heater finding a thousand times."
- "Noticed you offer infrared and pool inspections too, which usually means even
  more writing at night."
- New licensee (leads-tx-new-*.csv): "Saw you got your TREC license this summer
  and started {company}, so you're probably still figuring out how you want to
  write reports." Never say how we know beyond "saw"; never say "new" in a way
  that sounds like a knock.
- (no good detail) → leave the line out.

## Email 2 (day 3, reply in same thread)

Hey {first_name}, bumping this in case it got buried.

If you've got two minutes between jobs: https://uselookover.com/tx, drop in a few photos from
any inspection and see what it writes. No signup. If report writing isn't a
pain for you, just tell me and I'll leave you alone.

Enlil

{footer}

## Email 3 (day 8, same thread, last one)

{first_name}, last note from me.

If you ever want to see it on your own houses, https://uselookover.com/tx takes two minutes
and no signup. Either way, good luck with the rest of the season.

Enlil

{footer}

## Footer
```
Lookover · {postal_address}
Not interested? Reply "no thanks" and I won't email again.
```
