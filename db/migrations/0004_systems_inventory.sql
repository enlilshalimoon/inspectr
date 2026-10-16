-- Systems inventory + compliance block (state report rules, 2026-10-15).
--
-- 1. inspection_sections.system_status: per-section Inspected / Not
--    inspected / Not present, with reason and description. Shape:
--      {"status": "inspected" | "not_inspected" | "not_present",
--       "reason": text | null, "description": text | null}
-- 2. users.license_expires and users.sop_standard, shown in the report's
--    compliance block (OH, VA and IL require the license expiration date).
--
-- The app works before this runs: it stores the section status in
-- inspection_sections.inspector_notes as "lookover:system_status:{json}" and
-- hides the two Settings fields. Step 3 moves those values to the new column.
--
-- Safe to re-run. Apply in Supabase → SQL Editor (the migrate script's direct
-- DB connection is broken; see STATUS.md).

alter table public.inspection_sections
  add column if not exists system_status jsonb;

alter table public.users
  add column if not exists license_expires date,
  add column if not exists sop_standard text;

-- 3. Move statuses saved before this migration out of inspector_notes.
update public.inspection_sections
set system_status = substring(inspector_notes from length('lookover:system_status:') + 1)::jsonb,
    inspector_notes = null
where system_status is null
  and inspector_notes like 'lookover:system_status:%';

-- 4. 0003 locked users UPDATE to a column list; let inspectors edit the new
--    profile columns from Settings.
grant update (license_expires, sop_standard) on table public.users to authenticated;

-- 5. Tell PostgREST about the new columns right away.
notify pgrst, 'reload schema';
