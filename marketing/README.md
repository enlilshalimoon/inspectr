# Marketing operations

Operational docs, outreach artifacts, and tracking for the Lookover go-to-market program. Counterpart to `public/marketing/` (which holds the public-facing image assets served via Vercel).

## Layout

```
marketing/
├── README.md                  ← you are here
├── rollout-handoff.md         ← the master rollout playbook (read first)
├── landing-page.md            ← landing-page spec / source of truth
│
├── ads/                       ← Meta ads program
│   └── campaign-agent-prompt.md   ← self-contained playbook for the autonomous campaign-running agent
│
├── outreach/                  ← inspector outreach templates + send log
│   └── youtuber-dms.md            ← 5-channel YouTuber outreach cadence + status
│
└── tracking/                  ← week-over-week metrics
    └── weekly-metrics.md          ← outreach log + funnel metrics

public/marketing/
├── brand/                     ← brand identity assets (logo, cover photo) — see brand/README.md
└── ads/                       ← paid-ad creative library — see ads/README.md
```

## How agents across devices stay in sync

Everything in this repo is the source of truth. To sync to another device or agent:

1. **Clone once:** `git clone git@github.com:enlilshalimoon/inspectr.git` (or HTTPS equivalent)
2. **Pull on every work session:** `git pull origin main` before reading/writing files
3. **Push after every change:** `git add . && git commit -m "..." && git push origin main`

Public image URLs (anything under `public/marketing/`) become live at `https://www.uselookover.com/marketing/<path>` within ~50 seconds of pushing to `main` (Vercel auto-deploys). Agents that only need image fetch — no shell access — can pull via HTTP.

## Adding a new workstream

1. Create `marketing/<workstream>/` folder
2. Drop a `README.md` explaining what's in it
3. Add a row to the layout table above
4. Commit

Standard subfolders to consider: `partnerships/`, `events/`, `content/` (blog drafts, case studies), `analytics/`.
