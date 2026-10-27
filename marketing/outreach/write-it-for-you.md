# Write-it-for-you reports

Since 2026-10-26 the cold emails offer: "reply with 10 to 15 photos from any
recent inspection and I'll send back the finished report." This is the playbook
for building and sending one. The signup monitor acknowledges the photos, marks
the lead `"report_status": "waiting"` in `outreach-log.json` and push-notifies
Enlil. The build happens in an interactive Claude session ("build the report for
<name>") in the Mac Chrome where hello@uselookover.com and uselookover.com/admin
are signed in.

Promise: report back within 24 hours of the photos arriving. That reply is the
best shot we have at a paying inspector, so it beats everything else that day.

## Build

1. Save their photos from the Gmail thread into
   `marketing/outreach/photos/<lead-email>/` (gitignored, delete after 30 days).
   Ask before downloading if the thread looks off (strange senders, archives,
   anything that isn't images).
2. In Lookover, start a new inspection. Address: the city and state they gave, or
   "Sample — <their company>" if none. Client email: hello@uselookover.com, never
   the lead (the app would email them as if they were the home buyer).
3. Capture → Choose existing photos → upload them all. Let every draft finish.
4. Review: read every finding. Fix anything wrong for what the photo shows, drop
   duplicates and anything you can't support from the photo. Don't invent
   conditions the photos don't show. Approve.
5. Finalize. Open the client report link (`/report/<slug>`) and the PDF and
   check them as the inspector would: right state form (TREC REI 7-6 for Texas),
   no empty sections that look broken, no test data.

## Send (reply in their thread, from hello@)

Short and plain, signed Enlil:
- Here's the report Lookover wrote from your photos: <report link>.
- These were drafted from photos alone; on a real inspection you'd add a few
  spoken words per defect, and it gets sharper.
- If you want to run your next inspection through it, sign up at
  uselookover.com/signup (14-day free trial, no card), pick "Licensed home
  inspector", and I'll help set it up. Or grab 15 minutes with me: <ask for times>.

No prices, no "AI" in the subject, no "free for life", no claims about other
customers. Then set `"report_status": "sent"` and `"report_sent_at"` in the log,
and push-notify Enlil with the link.

## Follow-up

Two days later, if they haven't replied or signed up, one short bump in the same
thread asking what they thought and whether anything was wrong. Then stop.
