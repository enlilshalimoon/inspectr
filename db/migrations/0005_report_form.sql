-- Per-inspection report-form state, used by the Texas TREC REI 7-6 report
-- (lib/trec/form.ts documents the shape): item checkboxes (I / NI / NP / D),
-- comments and data fields per item, the inspector's finding → item
-- assignments, the page-2 "Additional Information" text and the sponsor line.
--
-- Writes go through patch_report_form() so two quick edits on the Review page
-- (e.g. ticking boxes on two items) can't overwrite each other.
--
-- Safe to re-run. Apply in Supabase → SQL Editor BEFORE deploying the code
-- that reads it (the migrate script's direct DB connection is broken; see
-- STATUS.md). Reads tolerate the column being absent; saves will fail until
-- it exists.

alter table public.inspections
  add column if not exists report_form jsonb not null
  default '{"items": {}, "finding_items": {}}'::jsonb;

-- Set one key inside report_form. p_path is 1 or 2 levels deep:
--   {additional_info}, {items, I.A}, {finding_items, <finding uuid>}.
-- A null p_value removes the key. SECURITY INVOKER: RLS on inspections
-- (inspector_id = auth.uid()) still decides which row can be changed.
create or replace function public.patch_report_form(
  p_inspection_id uuid,
  p_path text[],
  p_value jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if array_length(p_path, 1) not between 1 and 2 then
    raise exception 'patch_report_form: path must have 1 or 2 keys';
  end if;

  if array_length(p_path, 1) = 2 then
    update public.inspections
    set report_form = case
      when p_value is null then
        jsonb_set(
          coalesce(report_form, '{}'::jsonb),
          array[p_path[1]],
          coalesce(report_form -> p_path[1], '{}'::jsonb) - p_path[2]
        )
      else
        jsonb_set(
          jsonb_set(
            coalesce(report_form, '{}'::jsonb),
            array[p_path[1]],
            coalesce(report_form -> p_path[1], '{}'::jsonb)
          ),
          p_path,
          p_value
        )
      end
    where id = p_inspection_id;
  else
    update public.inspections
    set report_form = case
      when p_value is null then coalesce(report_form, '{}'::jsonb) - p_path[1]
      else jsonb_set(coalesce(report_form, '{}'::jsonb), p_path, p_value)
      end
    where id = p_inspection_id;
  end if;
end;
$$;

revoke execute on function public.patch_report_form(uuid, text[], jsonb) from public, anon;
grant execute on function public.patch_report_form(uuid, text[], jsonb) to authenticated;
