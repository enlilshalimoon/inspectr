-- Harden try_leads so real /try leads persist and can't be wiped by a cleanup.
--
-- 1. purpose: 'email' (visitor asked us to email their findings) or 'unlock'
--    (visitor gave an email to see the rest of their findings on /try).
-- 2. internal: our own test addresses (lib/email/internal.ts), set by the API.
-- 3. API-only access: anon / authenticated lose every table privilege. RLS stays on
--    with no policies, so even a re-granted privilege can't read or write rows.
--    Only the service role (used by /api/try/email) inserts.
-- 4. Real leads can't be deleted: a trigger rejects DELETE of any row that is not
--    sample=true or internal=true. Test/QA rows can still be cleaned up.
--
-- Safe to re-run.

alter table public.try_leads add column if not exists purpose text not null default 'email';
alter table public.try_leads add column if not exists internal boolean not null default false;

do $$ begin
  alter table public.try_leads
    add constraint try_leads_purpose_check check (purpose in ('email', 'unlock'));
exception when duplicate_object then null; end $$;

alter table public.try_leads enable row level security;
revoke all on table public.try_leads from anon, authenticated;
grant select, insert, update, delete on table public.try_leads to service_role;

create or replace function public.try_leads_protect_real()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not (old.sample or old.internal) then
    raise exception 'try_leads: real leads are kept (id %). Only sample or internal rows can be deleted.', old.id;
  end if;
  return old;
end;
$$;

drop trigger if exists try_leads_protect_real on public.try_leads;
create trigger try_leads_protect_real
  before delete on public.try_leads
  for each row execute function public.try_leads_protect_real();
