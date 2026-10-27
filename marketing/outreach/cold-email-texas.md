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
- First email has one link at most (the homepage). Follow-ups have none.
- The ask (since 2026-10-26) is the write-it-for-you offer: they reply with
  photos from a recent inspection and get the finished report back. Leads already
  in the sequence get the new email 3 (day 8); handling photo replies is in the
  signup monitor task.
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

Easiest way to judge it: reply with 10 to 15 photos from any recent
inspection and I'll send back the finished report so you
can see it on a house you know. No signup.

Want to send me a few?

Enlil
Lookover · uselookover.com/tx

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

The offer stands: reply with photos from one recent inspection and you'll get
the finished TREC report back, no signup. If report writing isn't a pain for
you, no worries, just tell me and I'll leave you alone.

Enlil

{footer}

## Email 3 (day 8, same thread, last one)

{first_name}, last note from me.

If the timing's wrong, totally fine. If you're curious, reply with a handful of
photos from any inspection and I'll send back the finished report so you can
see what it writes. That's all it takes.

Enlil

{footer}

## Footer
```
Lookover · {postal_address}
Not interested? Reply "no thanks" and I won't email again.
```
