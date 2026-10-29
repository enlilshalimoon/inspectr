// Server-side reads for the TREC REI 7-6 report.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Finding, SectionType } from "@/lib/supabase/types";
import {
  isTexasLicense,
  itemsMissingStatus,
  parseReportForm,
  resolveItems,
  usesTrecForm,
  type FindingForForm,
  type ReportForm,
} from "./form";

/**
 * The inspection's report_form, or null when the column doesn't exist yet
 * (migration 0005 not applied) — callers then fall back to the standard
 * Lookover report so nothing breaks before the migration runs.
 */
export async function loadReportForm(
  supabase: SupabaseClient,
  inspectionId: string,
): Promise<ReportForm | null> {
  const { data, error } = await supabase
    .from("inspections")
    .select("report_form")
    .eq("id", inspectionId)
    .maybeSingle();
  if (error) {
    console.warn("[trec] report_form unavailable:", error.message);
    return null;
  }
  return parseReportForm((data as { report_form?: unknown } | null)?.report_form);
}

/** Every finding on the inspection, with its Lookover section type. */
export async function loadFindingsForForm(
  supabase: SupabaseClient,
  inspectionId: string,
): Promise<(FindingForForm & Pick<Finding, "section_id" | "photo_id" | "recommended_action">)[]> {
  const [{ data: sections }, { data: findings }] = await Promise.all([
    supabase.from("inspection_sections").select("id, section_type").eq("inspection_id", inspectionId),
    supabase
      .from("findings")
      .select("id, section_id, photo_id, title, description, recommended_action, severity, is_approved")
      .eq("inspection_id", inspectionId),
  ]);
  const typeById = new Map(
    ((sections as { id: string; section_type: SectionType }[] | null) ?? []).map((s) => [s.id, s.section_type]),
  );
  return ((findings as Finding[] | null) ?? []).map((f) => ({
    id: f.id,
    section_id: f.section_id,
    photo_id: f.photo_id,
    title: f.title,
    description: f.description,
    recommended_action: f.recommended_action,
    severity: f.severity,
    is_approved: f.is_approved,
    sectionType: f.section_id ? typeById.get(f.section_id) ?? null : null,
  }));
}

/**
 * Whether this inspection's report is the TREC form, and which items would
 * print with no checkbox. TREC requires a box for every item, so finalize is
 * blocked until `missing` is empty.
 */
export async function loadTrecStatus(
  supabase: SupabaseClient,
  inspectionId: string,
  inspectorId: string,
): Promise<{ applies: boolean; missing: string[] }> {
  const [{ data: inspector }, { data: insp }, form] = await Promise.all([
    supabase.from("users").select("license_state").eq("id", inspectorId).maybeSingle(),
    supabase.from("inspections").select("property_state").eq("id", inspectionId).maybeSingle(),
    loadReportForm(supabase, inspectionId),
  ]);
  const licenseState = (inspector as { license_state: string | null } | null)?.license_state;
  const propertyState = (insp as { property_state: string | null } | null)?.property_state;
  const effectiveState = isTexasLicense(licenseState) ? licenseState : propertyState;
  if (!form || !usesTrecForm(effectiveState, form)) {
    return { applies: false, missing: [] };
  }
  const findings = await loadFindingsForForm(supabase, inspectionId);
  const missing = itemsMissingStatus(resolveItems(form, findings)).map(
    (r) => `${r.item.id} ${r.item.label}`,
  );
  return { applies: true, missing };
}
