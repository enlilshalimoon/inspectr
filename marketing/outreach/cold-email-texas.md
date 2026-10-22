# Cold email — Texas home inspectors (Oct 2026)

Sent by hand-style from hello@uselookover.com, signed Enlil. Plain text, no images,
no tracking pixels, ~20 a day. Leads: `leads-*.csv` in this folder (gitignored),
built from inspectors' own websites and checked against TREC's public license list.

## Rules
- Under 110 words. One question at the end. Reads like Enlil typed it.
- Personal line uses a TRUE detail from their site (`personal_detail`). If it's
  weak, drop the line rather than fake it.
- No prices, no "AI" in the subject, no "free for life", no attachments.
- First email has one link at most (the homepage). Follow-ups have none.
- Footer: postal address + "reply 'no thanks' and I won't email again" (CAN-SPAM).
  Honor every opt-out the same day; log it in `outreach-log.json`.
- Stop the sequence the moment anyone replies.

## Email 1 (day 0)

**Subject (A/B test, alternate by lead):**
- A: `{first_name}, quick one about TREC reports`
- B: `TREC report before you leave the driveway?`
Log which one each lead got (`subject_variant`: "A"/"B" in outreach-log.json).

Hey {first_name},

I'm Enlil, I built an app for Texas inspectors called Lookover. {personal_line}

You walk the house and take photos like normal, say a few words about each
defect, and the finding is written for you in SOP language before you leave the
driveway. For Texas it fills out the TREC REI 7-6 form, I/NI/NP/D boxes and all.
You approve every line before anything goes to the client.

Inspectors trying it are getting reports out the same afternoon instead of that
night.

Would you try it on one inspection this week? Free, no card, and I'll set it up
with you on a 10 minute call if that helps.

Enlil
Lookover · uselookover.com/tx

{footer}

### personal_line examples
- "Saw on your site you've been inspecting around Katy for 15 years, so you've
  probably written the same water heater finding a thousand times."
- "Noticed you offer infrared and pool inspections too, which usually means even
  more writing at night."
- (no good detail) → leave the line out.

## Email 2 (day 3, reply in same thread)

Hey {first_name}, bumping this in case it got buried.

The short version: photo + a few words in the field, finished TREC report on
your phone. If report writing isn't a pain for you, no worries, just tell me and
I'll leave you alone.

Enlil

{footer}

## Email 3 (day 8, same thread, last one)

{first_name}, last note from me.

If the timing's wrong, totally fine. If you ever want to see it, reply "show me"
and I'll send a 60-second video of a real report getting written.

Enlil

{footer}

## Footer
```
Lookover · {postal_address}
Not interested? Reply "no thanks" and I won't email again.
```
