-- One row per photo drafted on the public /try demo (no account needed).
-- Used to rate-limit the demo (per visitor IP hash and a global daily cap, since
-- every row is a paid AI call) and to count how the demo is used. The photo
-- itself is never stored.
--
-- Only the service-role client touches this table: RLS is on with no policies,
-- so anon and signed-in users can't read or write it.
--
-- Safe to re-run.

create table if not exists public.try_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor text not null,          -- sha256 of IP + salt, never the raw IP
  source jsonb,                   -- first-touch utm_* from the lk_src cookie
  section text,
  severity text,
  title text
);

create index if not exists try_drafts_visitor_created_idx
  on public.try_drafts (visitor, created_at desc);
create index if not exists try_drafts_created_idx
  on public.try_drafts (created_at desc);

alter table public.try_drafts enable row level security;
