import type { SupabaseClient } from "@supabase/supabase-js";
import type { SectionType } from "@/lib/supabase/types";
import { sectionOrder } from "./photos";

// The inspection's row for a section type, created on first use (optional
// sections like Pool only exist once something is filed under them).
export async function findOrCreateSection(
  supabase: SupabaseClient,
  inspectionId: string,
  type: SectionType,
): Promise<string | null> {
  const find = () =>
    supabase
      .from("inspection_sections")
      .select("id")
      .eq("inspection_id", inspectionId)
      .eq("section_type", type)
      .maybeSingle();
  const { data: found } = await find();
  if (found) return found.id as string;
  const { data: created } = await supabase
    .from("inspection_sections")
    .insert({ inspection_id: inspectionId, section_type: type, section_order: sectionOrder(type) })
    .select("id")
    .single();
  if (created) return created.id as string;
  // Lost a race with a parallel request creating the same section.
  const { data: again } = await find();
  return (again?.id as string | undefined) ?? null;
}
