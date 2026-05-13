-- Inspectr: initial schema
-- Run on Supabase via SQL editor, or `supabase db push` after `supabase link`.

-- Extensions
create extension if not exists "pgcrypto";

-- =========================================================================
-- USERS (inspectors). Mirrors auth.users via trigger; one row per inspector.
-- =========================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  company_name text,
  company_logo_url text,
  license_number text,
  license_state text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- billing
  stripe_customer_id text,
  subscription_status text check (subscription_status in ('trial','active','past_due','canceled')) default 'trial',
  trial_ends_at timestamptz default (now() + interval '14 days'),

  -- defaults
  default_report_template_id uuid,
  default_disclaimer text,
  default_signature_url text,

  -- onboarding state
  onboarding_completed_at timestamptz
);

create index users_stripe_customer_idx on public.users(stripe_customer_id);

-- =========================================================================
-- INSPECTIONS
-- =========================================================================
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('in_progress','review','finalized','delivered')) default 'in_progress',

  -- property
  property_address text not null,
  property_city text,
  property_state text,
  property_zip text,
  property_year_built int,
  property_sqft int,
  property_type text check (property_type in ('single_family','condo','townhouse','multi_family')),

  -- client
  client_name text,
  client_email text,
  client_phone text,

  -- visit conditions
  inspection_date date,
  weather_conditions text,
  temperature_f int,
  occupancy_status text check (occupancy_status in ('occupied','vacant')),
  utilities_on jsonb default '{}'::jsonb,

  -- lifecycle
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  delivered_at timestamptz,

  -- artifacts
  pdf_url text,
  share_url_slug text unique
);

create index inspections_inspector_idx on public.inspections(inspector_id, created_at desc);
create index inspections_status_idx on public.inspections(inspector_id, status);

-- =========================================================================
-- INSPECTION SECTIONS
-- =========================================================================
create table public.inspection_sections (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  section_type text not null,
  section_order int not null default 0,
  summary_text text,
  inspector_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inspection_id, section_type)
);

create index sections_inspection_idx on public.inspection_sections(inspection_id, section_order);

-- =========================================================================
-- PHOTOS
-- =========================================================================
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  section_id uuid references public.inspection_sections(id) on delete set null,
  storage_path text not null,
  thumbnail_path text,
  caption text,
  taken_at timestamptz,
  upload_status text not null check (upload_status in ('queued','uploading','uploaded','failed')) default 'uploaded',
  ai_analysis jsonb,
  order_in_section int default 0,
  created_at timestamptz not null default now()
);

create index photos_inspection_idx on public.photos(inspection_id);
create index photos_section_idx on public.photos(section_id, order_in_section);

-- =========================================================================
-- VOICE NOTES
-- =========================================================================
create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  photo_id uuid references public.photos(id) on delete set null,
  section_id uuid references public.inspection_sections(id) on delete set null,
  storage_path text not null,
  duration_seconds int,
  transcript text,
  transcript_status text not null check (transcript_status in ('pending','completed','failed')) default 'pending',
  created_at timestamptz not null default now()
);

create index voice_notes_inspection_idx on public.voice_notes(inspection_id);
create index voice_notes_photo_idx on public.voice_notes(photo_id);
create index voice_notes_section_idx on public.voice_notes(section_id);

-- =========================================================================
-- FINDINGS
-- =========================================================================
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  section_id uuid references public.inspection_sections(id) on delete set null,
  photo_id uuid references public.photos(id) on delete set null,

  severity text not null check (severity in ('info','monitor','minor_repair','major_repair','safety_hazard')),
  title text not null,
  description text not null,
  recommended_action text,

  is_approved boolean not null default false,
  inspector_edited boolean not null default false,
  ai_confidence float check (ai_confidence between 0 and 1),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index findings_inspection_idx on public.findings(inspection_id);
create index findings_section_idx on public.findings(section_id);
create index findings_severity_idx on public.findings(inspection_id, severity);

-- =========================================================================
-- REPORT TEMPLATES
-- =========================================================================
create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  sections_config jsonb not null default '[]'::jsonb,
  styling jsonb not null default '{}'::jsonb,
  cover_page_config jsonb not null default '{}'::jsonb,
  disclaimer_text text,
  signature_block jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index report_templates_inspector_idx on public.report_templates(inspector_id);

-- One default per inspector
create unique index report_templates_one_default_per_inspector
  on public.report_templates(inspector_id)
  where is_default = true;

-- Fix the FK on users.default_report_template_id now that the table exists
alter table public.users
  add constraint users_default_template_fk
  foreign key (default_report_template_id)
  references public.report_templates(id)
  on delete set null;

-- =========================================================================
-- ACTIVITY LOG
-- =========================================================================
create table public.inspection_activity (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index inspection_activity_inspection_idx on public.inspection_activity(inspection_id, created_at desc);

-- =========================================================================
-- updated_at TRIGGER
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger inspections_updated_at before update on public.inspections
  for each row execute function public.set_updated_at();
create trigger sections_updated_at before update on public.inspection_sections
  for each row execute function public.set_updated_at();
create trigger findings_updated_at before update on public.findings
  for each row execute function public.set_updated_at();
create trigger report_templates_updated_at before update on public.report_templates
  for each row execute function public.set_updated_at();

-- =========================================================================
-- AUTH -> PUBLIC.USERS BRIDGE
-- When a new auth.users row is created, create a matching public.users row.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- Inspectr: Row Level Security policies
-- Run AFTER 0001_initial_schema.sql.

-- =========================================================================
-- Enable RLS on every table
-- =========================================================================
alter table public.users enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_sections enable row level security;
alter table public.photos enable row level security;
alter table public.voice_notes enable row level security;
alter table public.findings enable row level security;
alter table public.report_templates enable row level security;
alter table public.inspection_activity enable row level security;

-- =========================================================================
-- USERS: an inspector can only see/update their own row.
-- INSERTs are handled by the on_auth_user_created trigger (security definer).
-- =========================================================================
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =========================================================================
-- INSPECTIONS: inspector owns rows where inspector_id = auth.uid()
-- Public report viewers access via a separate signed/slug-based API route
-- using the service_role key — they do NOT hit these policies.
-- =========================================================================
create policy "inspections_select_own"
  on public.inspections for select
  using (inspector_id = auth.uid());

create policy "inspections_insert_own"
  on public.inspections for insert
  with check (inspector_id = auth.uid());

create policy "inspections_update_own"
  on public.inspections for update
  using (inspector_id = auth.uid())
  with check (inspector_id = auth.uid());

create policy "inspections_delete_own"
  on public.inspections for delete
  using (inspector_id = auth.uid());

-- =========================================================================
-- Helper: does the current user own this inspection?
-- =========================================================================
create or replace function public.owns_inspection(p_inspection_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.inspections
    where id = p_inspection_id and inspector_id = auth.uid()
  );
$$;

-- =========================================================================
-- INSPECTION_SECTIONS
-- =========================================================================
create policy "sections_all_own"
  on public.inspection_sections for all
  using (public.owns_inspection(inspection_id))
  with check (public.owns_inspection(inspection_id));

-- =========================================================================
-- PHOTOS
-- =========================================================================
create policy "photos_all_own"
  on public.photos for all
  using (public.owns_inspection(inspection_id))
  with check (public.owns_inspection(inspection_id));

-- =========================================================================
-- VOICE NOTES
-- =========================================================================
create policy "voice_notes_all_own"
  on public.voice_notes for all
  using (public.owns_inspection(inspection_id))
  with check (public.owns_inspection(inspection_id));

-- =========================================================================
-- FINDINGS
-- =========================================================================
create policy "findings_all_own"
  on public.findings for all
  using (public.owns_inspection(inspection_id))
  with check (public.owns_inspection(inspection_id));

-- =========================================================================
-- REPORT TEMPLATES
-- =========================================================================
create policy "templates_all_own"
  on public.report_templates for all
  using (inspector_id = auth.uid())
  with check (inspector_id = auth.uid());

-- =========================================================================
-- ACTIVITY LOG
-- =========================================================================
create policy "activity_select_own"
  on public.inspection_activity for select
  using (public.owns_inspection(inspection_id));

create policy "activity_insert_own"
  on public.inspection_activity for insert
  with check (public.owns_inspection(inspection_id));

-- =========================================================================
-- STORAGE: two buckets.
--   - "inspection-media" : photos + audio. Private. Inspector reads/writes
--     their own files. Path convention: {inspector_id}/{inspection_id}/...
--   - "report-assets"    : company logos, signature images. Private,
--     served via signed URLs.
-- Create the buckets via Supabase dashboard or:
--   insert into storage.buckets (id, name, public) values
--     ('inspection-media','inspection-media', false),
--     ('report-assets','report-assets', false);
-- Then apply these policies:
-- =========================================================================

-- Inspector can read/write only files under their own user-id prefix.
create policy "inspection_media_select_own"
  on storage.objects for select
  using (
    bucket_id = 'inspection-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "inspection_media_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'inspection-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "inspection_media_update_own"
  on storage.objects for update
  using (
    bucket_id = 'inspection-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "inspection_media_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'inspection-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Same scheme for report-assets.
create policy "report_assets_select_own"
  on storage.objects for select
  using (
    bucket_id = 'report-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "report_assets_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'report-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "report_assets_update_own"
  on storage.objects for update
  using (
    bucket_id = 'report-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "report_assets_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'report-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
