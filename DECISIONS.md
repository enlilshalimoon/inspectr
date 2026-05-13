# Decisions log

Append-only record of meaningful tech decisions. Each entry: date, decision, why, what we'd reconsider.

---

## 2026-05-12 — Initial stack

**Decision:** Next.js 14 (App Router) + Supabase + Vercel + Anthropic + OpenAI Whisper + Resend + Stripe.

**Why:**
- One codebase for mobile (PWA) and desktop review.
- Supabase bundles Postgres + auth + file storage + RLS — replaces 3-4 separate services.
- All components are well-documented and known to Claude Code.
- No vendor lock-in beyond Supabase/Vercel, both straightforward to migrate off.

**Reconsider if:** Supabase becomes a bottleneck at scale (>10k inspections/day), or RLS gets unwieldy. At that point evaluate Neon + a separate auth provider.

---

## 2026-05-12 — Mobile = PWA, not native

**Decision:** Ship a Progressive Web App, installable to home screen on iOS/Android. No native app for v1.

**Why:** Single codebase. No app store cycles. Camera/mic/offline storage all work in modern mobile browsers. Inspectors install once from a link.

**Reconsider if:** We need background photo uploads while phone locked, or push notifications on iOS — both are weak in PWAs today. Path forward then is Capacitor (wraps the existing PWA), not a full rewrite.

---

## 2026-05-12 — AI model selection

**Decision:**
- **Vision (every photo):** `claude-haiku-4-5` — cheap, fast, good enough to identify subject + section + obvious defects.
- **Drafting (findings, summaries):** `claude-sonnet-4-6` — better prose, better severity judgment.
- **Transcription:** OpenAI Whisper API (`whisper-1`). $0.006/min, single language English.

**Why:** Haiku for high-volume per-photo work keeps cost low (~$0.001/photo). Sonnet only for the smaller number of drafting calls per inspection (~20-40 findings). Whisper is the cheapest reliable option; word-level timestamps help with Mode B section walkthroughs.

**Reconsider if:** Edit rate on Haiku-classified sections is too high → bump vision to Sonnet. Or if Whisper accuracy is poor on noisy/echoey environments (basements) → try Deepgram nova-2.

---

## 2026-05-12 — Background jobs

**Decision:** Use Next.js API routes for AI processing, triggered from the client after upload. Supabase realtime channels notify the client when results land. No external queue for v1.

**Why:** Simplest possible architecture. No new service. Vercel function timeout (60s on Pro, 10s on Hobby) is enough for individual AI calls. Long-running batch (finding generation across a whole inspection) is fine to run via a single API route that streams progress over a Supabase realtime channel.

**Reconsider if:** We hit Vercel function timeouts, or we want retry/backoff/dead-letter semantics. Then switch to Trigger.dev or Inngest — both have clean Next.js integrations.

---

## 2026-05-12 — Email = Resend

**Decision:** Resend for transactional (client report delivery, auth emails, billing notices).

**Why:** Cleanest API. React Email templates. 3k/month free, $20/mo for 50k. Supabase Auth can also call Resend for magic links / password resets via custom SMTP.

**Reconsider if:** Deliverability issues — fall back to Postmark.

---

## 2026-05-12 — Camera = native input, not a library

**Decision:** Use `<input type="file" accept="image/*" capture="environment">` for photo capture. No camera library.

**Why:** Zero dependencies. Works on iOS Safari, Android Chrome, every modern browser. Opens the OS camera app, returns the photo. Inspector gets the camera UX they already know.

**Reconsider if:** We need in-app live preview, burst mode, or custom overlays — then evaluate `react-html5-camera-photo` or build a `getUserMedia` flow.

---

## 2026-05-12 — Next.js 16 specifics

**Decision:** Build against Next.js 16 (released, stable) + React 19.2 conventions. Key differences from the older docs Claude was trained on:

- Middleware file is **`proxy.ts`** at repo root, with `export function proxy(...)`. The old `middleware.ts` / `export function middleware` is deprecated.
- `cookies()`, `headers()`, `params`, `searchParams` are all **async** — must `await` them. No synchronous compatibility fallback.
- Turbopack is on by default for `next dev` and `next build` — no `--turbopack` flag needed.
- Mutations use **Server Actions** (`'use server'`) called via `<form action={...}>` — preferred over API routes for form-driven flows. Always re-check auth inside the action.
- `next lint` is gone — use ESLint CLI directly. `package.json` script is `"lint": "eslint"`.
- `revalidateTag` takes a required second arg (cacheLife profile). Use `updateTag` in Server Actions for read-your-writes UI.
- Parallel routes need an explicit `default.tsx` in every slot or build fails.

**Why this matters now:** Several of these (`middleware`, sync `cookies()`, sync `params`) appear in pre-16 examples Claude has seen and would otherwise generate incorrectly.

---

## 2026-05-13 — Industry benchmark before prompt tuning

**Decision:** Built a 29-case calibration test set (`db/benchmark/cases/*.json`) grounded in InterNACHI's Standards of Practice §3.1–3.10. The runner (`scripts/benchmark.ts`, `npm run benchmark`) calls Claude with our system prompt and scores output on severity + keyword presence. Baseline against `claude-sonnet-4-6`: **86% (100/116)**.

**Why:** We want to design prompts to pass a known-good test, not write prompts and hope. Per-section scores tell us where the prompt is weak. Beta-tester edits in week 8+ become new test cases.

**What we learned from the baseline:**
- Severity calls are mostly right (24/29). The misses are genuine judgment-call disagreements (e.g. "Federal Pacific panel that was retrofitted" — got info, correct; "16-yr-old water heater with corrosion" — got major_repair, I expected monitor, both defensible).
- The prose quality is excellent and reads like a real inspector. Most "title missed keyword" failures are the AI using more precise language than my benchmark required (wrote "p-trap" instead of "sink").
- Hard rules are holding: no dollar amounts even when the inspector volunteered them, no use of the word "dangerous", correctly defers to inspector when vision AI conflicts.

**Reconsider if:** Real beta-tester edit rate is >30%. Then we tune the prompt and re-run benchmark to verify the fix didn't break other cases. Also: keyword scoring is brittle — when we have budget for it, add LLM-as-judge for description quality (a second Claude call grades each output 1-5).

**Operational notes:**
- `.env*` is gitignored. Dotenv preload uses `dotenv_config_override=true` because the Claude Code shell sets a placeholder `ANTHROPIC_API_KEY` that would otherwise win.
- Each run writes a timestamped markdown report to `db/benchmark/results/`. Those reports are gitignored too — they contain quoted SoP language and full LLM outputs that bloat the repo.

---

## 2026-05-12 — PDF generation = React-PDF

**Decision:** `@react-pdf/renderer` for the final report PDF.

**Why:** Layout in React/JSX, no headless Chrome needed (no Puppeteer in serverless). Generates in the API route directly. Good enough for a structured inspection report.

**Reconsider if:** Layout gets too complex (multi-column flow, advanced typography). Then move to Puppeteer + a separate worker (Vercel functions can't run Chrome).
