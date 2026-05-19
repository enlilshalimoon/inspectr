# Lookover

AI-assisted home inspection reports for residential inspectors. Walk the property, take photos, talk through what you see — get a finished, branded report drafted before you're back to your truck.

> **Domain:** [uselookover.com](https://uselookover.com). The repo directory is still named `inspectr` (the original working name) — kept for git history and package stability.

---

## Quick start (local dev)

### 1. Clone and install

```bash
cd inspectr
npm install
```

### 2. Create a Supabase project

1. Go to <https://supabase.com> → **New project** (free tier is fine)
2. Pick a region close to you (US East is a reasonable default)
3. Note the **database password** — you'll need it for the CLI later
4. Once provisioned, open **Project Settings → API**. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the browser)

### 3. Run the migrations

The schema and RLS policies are in `db/migrations/`. Easiest path for now: paste them into the Supabase SQL editor in order.

1. Open **SQL Editor** in the Supabase dashboard
2. Paste the full contents of `db/migrations/0001_initial_schema.sql` → **Run**
3. Paste the full contents of `db/migrations/0002_rls_policies.sql` → **Run**
4. In **Storage**, create two buckets, both **private**:
   - `inspection-media`
   - `report-assets`

(Once we wire up `npx supabase link`, you'll be able to run `supabase db push` instead.)

### 4. Set environment variables

```bash
cp .env.example .env.local
```

Fill in at minimum:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The AI / Stripe / Resend keys can wait — the app will run without them; you just won't be able to use those features yet.

### 5. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## What works right now

- [x] Marketing-lite home page
- [x] Sign up / sign in / password reset (email + password)
- [x] Onboarding form (company info + default disclaimer)
- [x] Authenticated app shell (nav, sign out)
- [x] Inspections dashboard (lists your inspections, empty state)
- [x] Postgres schema + RLS policies
- [x] PWA manifest (installable to home screen)

## What's next (week 2 of the build)

- [ ] "New inspection" form with property + client info
- [ ] Mobile capture: take photo → assign to section → save
- [ ] Photos uploading to Supabase Storage
- [ ] Inspection detail view

See `DECISIONS.md` for tech decisions and the build spec for the full roadmap.

---

## Stack

- **Framework:** Next.js 16 (App Router), React 19.2, TypeScript, Tailwind v4
- **Backend:** Supabase (Postgres + Auth + Storage + RLS)
- **AI:** Anthropic Claude (Haiku for vision, Sonnet for drafting) + OpenAI Whisper
- **Email:** Resend
- **Payments:** Stripe
- **PDF:** `@react-pdf/renderer`
- **Hosting:** Vercel

---

## Project conventions

- All mutations go through Server Actions (`'use server'`), not API routes, unless there's a specific reason (webhooks, file streams, third-party callbacks).
- The middleware file is `proxy.ts` at repo root (Next 16 rename).
- `cookies()`, `headers()`, `params`, `searchParams` are all async — always `await` them.
- New tech decisions get appended to `DECISIONS.md`.
- Database changes are SQL migrations in `db/migrations/`, numbered `NNNN_description.sql`.

---

## Scripts

```bash
npm run dev      # next dev (Turbopack on by default)
npm run build    # next build (production)
npm run start    # serve the production build
npm run lint     # eslint
```
