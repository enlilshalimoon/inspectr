-- One row each time a /try visitor asks to have their drafted findings emailed.
-- This is the only contact detail the demo collects, and it is also used to
-- rate-limit the send route. Findings themselves aren't stored here.
--
-- Only the service-role client touches this table: RLS is on with no policies,
-- so anon and signed-in users can't read or write it.
--
-- Safe to re-run.

create table if not exists public.try_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor text not null,          -- sha256 of IP + salt, same as try_drafts
  email text not null,
  source jsonb,                   -- first-touch utm_* from the lk_src cookie
  finding_count int not null,
  sample boolean not null default false,
  sent boolean not null default false
);

create index if not exists try_leads_visitor_created_idx
  on public.try_leads (visitor, created_at desc);
create index if not exists try_leads_email_created_idx
  on public.try_leads (email, created_at desc);

alter table public.try_leads enable row level security;
