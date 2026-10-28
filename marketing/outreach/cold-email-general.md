# Cold email — home inspectors in other states (not TX or FL)

Same rules, footer, cadence and logging as `cold-email-texas.md`. Used for any
`leads-<state>-*.csv` file whose state isn't TX or FL. Link: `uselookover.com/go`
(redirects to the /try demo with utm_campaign=states_oct26). Lookover's report includes a full
systems inventory plus state-specific statements for NC, VA, PA, WI and KY
(`lib/compliance/state-rules.ts`). Only mention a state rule if it's in that file.

## Email 1 (day 0)

**Subject (A/B test, alternate by lead):**
- A: `{first_name}, try this on your last inspection`
- B: `Your inspection photos, written up in 2 minutes`

Hey {first_name},

I'm Enlil, I built Lookover, an app that writes inspection findings from your
photos. {personal_line}

Quickest way to judge it: go to uselookover.com/go, pick 10 photos from your last
inspection, and each one comes back as a written finding in SOP language,
grouped by section. Takes about two minutes. No signup, and the photos aren't
saved.

On a real job you add a few spoken words per defect and approve every line
before it goes out, with the inspected / not inspected / not present line for every system.

Worth two minutes to see if it gets your houses right?

Enlil
Lookover

{footer}

## Email 2 (day 3) and Email 3 (day 8)

Same as `cold-email-florida.md`, with uselookover.com/go in place of uselookover.com/fl.
