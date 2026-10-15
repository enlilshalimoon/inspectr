-- Lock billing/entitlement columns on public.users.
--
-- Problem: the "users_update_own" RLS policy lets a signed-in user update ANY
-- column of their own row, and Supabase grants table-wide UPDATE to the
-- `authenticated` role by default. So anyone could run, in the browser console,
--   supabase.from('users').update({ subscription_status: 'active' })
-- and get unlimited access without paying.
--
-- Fix: take away table-wide UPDATE and grant it back only on the profile
-- columns the app edits with the user's own session (signup, onboarding,
-- settings). Billing columns (subscription_status, trial_ends_at,
-- stripe_customer_id) and id/email are then writable only by the service role
-- (Stripe webhook, billing reconcile, admin comp) — which bypasses grants.
--
-- The updated_at trigger still works: column privileges only apply to the
-- columns named in the UPDATE statement, not to values a trigger sets.
--
-- Safe to re-run. Apply in Supabase → SQL Editor (the migrate script's direct
-- DB connection is broken; see STATUS.md).

revoke update on table public.users from authenticated, anon;

grant update (
  full_name,
  company_name,
  company_logo_url,
  license_number,
  license_state,
  phone,
  default_disclaimer,
  default_signature_url,
  default_report_template_id,
  onboarding_completed_at
) on table public.users to authenticated;

-- Insert is done only by the on_auth_user_created trigger (security definer).
revoke insert, delete on table public.users from authenticated, anon;

-- Check (should list only the columns above for `authenticated`):
--   select grantee, column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'users' and privilege_type = 'UPDATE'
--   order by grantee, column_name;
