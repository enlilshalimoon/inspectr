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
