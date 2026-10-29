// Server-side PDF rendering pipeline.
//
// Given an inspection id, loads the inspection + sections + approved findings
// + linked photos (fetched as base64 so react-pdf can embed them), renders to
// a Buffer via @react-pdf/renderer.

import { renderToBuffer } from "@react-pdf/renderer";
import { InspectionReportDoc, type ReportData } from "./report";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Finding, Photo, SectionType } from "@/lib/supabase/types";
import { TrecReportDoc } from "./trec/rei76-doc";
import { buildTrecReportData } from "./trec/build";
import { loadReportForm } from "@/lib/trec/load";
import { isTexasLicense, usesTrecForm, type ReportForm } from "@/lib/trec/form";
import { isOwnStoragePath } from "@/lib/inspection/photos";
import { readSectionStatus } from "@/lib/inspection/system-status";
import { buildCompliance } from "@/lib/compliance/report";

type Mode = "session" | "service";

export async function renderInspectionPdf(
  inspectionId: string,
  mode: Mode = "session",
  // Finalize renders before it saves the status, so it passes the timestamp
  // it is about to write.
  finalizedAt?: string,
): Promise<Buffer> {
  const supabase =
    mode === "service" ? createServiceClient() : await createClient();

  const data = await loadReportData(supabase, inspectionId);
  if (finalizedAt) data.finalized_at = finalizedAt;

  // Texas inspectors deliver the promulgated TREC REI 7-6 form instead.
  const form = await loadReportForm(supabase, inspectionId);
  const effectiveTrecState = isTexasLicense(data.inspector.license_state)
    ? data.inspector.license_state
    : data.property.state;
  if (form && usesTrecForm(effectiveTrecState, form)) {
    return renderToBuffer(<TrecReportDoc data={trecDataFrom(data, form)} />);
  }
  return renderToBuffer(<InspectionReportDoc data={data} />);
}

function trecDataFrom(data: ReportData, form: ReportForm) {
  const p = data.property;
  const cityLine = [p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return buildTrecReportData({
    form,
    findings: data.sections.flatMap((s) =>
      s.findings.map((f) => ({ ...f, sectionType: s.section_type as SectionType })),
    ),
    clientName: data.client.name,
    inspectionDate: data.visit.date,
    propertyAddress: [p.address, cityLine].filter(Boolean).join(", "),
    inspectorName: data.inspector.full_name,
    inspectorLicense: data.inspector.license_number,
    logoData: data.inspector.logo_data,
  });
}

export async function loadReportData(
  supabase: SupabaseClient,
  inspectionId: string,
): Promise<ReportData> {
  const { data: insp, error } = await supabase
    .from("inspections")
    .select(
      "id, inspector_id, property_address, property_city, property_state, property_zip, property_year_built, property_sqft, property_type, client_name, client_email, client_phone, inspection_date, weather_conditions, temperature_f, occupancy_status, finalized_at",
    )
    .eq("id", inspectionId)
    .maybeSingle();
  if (error || !insp) throw new Error("inspection not found");

  const { data: inspector } = await supabase
    .from("users")
    // "*" so license_expires / sop_standard come through once migration 0004
    // adds them, without breaking before it does.
    .select("*")
    .eq("id", insp.inspector_id)
    .maybeSingle();

  const { data: sectionRows } = await supabase
    .from("inspection_sections")
    .select("*")
    .eq("inspection_id", inspectionId)
    .order("section_order");

  const { data: findingRows } = await supabase
    .from("findings")
    .select(
      "id, section_id, photo_id, severity, title, description, recommended_action, is_approved, inspector_edited, ai_confidence, created_at, updated_at, inspection_id",
    )
    .eq("inspection_id", inspectionId)
    .eq("is_approved", true);

  // Gather photo paths referenced by findings, base64 them once.
  const photoIds = Array.from(
    new Set(((findingRows as Finding[]) ?? []).map((f) => f.photo_id).filter(Boolean) as string[]),
  );
  const photoMap: Record<string, string | null> = {};
  if (photoIds.length) {
    const { data: photos } = await supabase
      .from("photos")
      .select("id, storage_path")
      .in("id", photoIds);
    const paths = ((photos as Pick<Photo, "id" | "storage_path">[] | null) ?? []).map(
      (p) => p.storage_path,
    );
    if (paths.length) {
      const { data: signedUrls } = await supabase.storage
        .from("inspection-media")
        .createSignedUrls(paths, 60 * 5);
      const urlByPath = new Map<string, string>();
      for (const u of signedUrls ?? []) {
        if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
      }
      const dataByPath: Record<string, string | null> = {};
      await Promise.all(
        Array.from(urlByPath.entries()).map(async ([path, url]) => {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = Buffer.from(await res.arrayBuffer());
            const mime = res.headers.get("content-type") ?? "image/jpeg";
            dataByPath[path] = `data:${mime};base64,${buf.toString("base64")}`;
          } catch (err) {
            console.warn("[pdf] photo fetch failed:", path, err);
            dataByPath[path] = null;
          }
        }),
      );
      for (const photo of (photos as Pick<Photo, "id" | "storage_path">[] | null) ?? []) {
        photoMap[photo.id] = dataByPath[photo.storage_path] ?? null;
      }
    }
  }

  // Bucket findings by section
  const findingsBySection = new Map<string, (Finding & { photoData?: string | null })[]>();
  for (const f of (findingRows as Finding[] | null) ?? []) {
    const k = (f.section_id as string | null) ?? "_unassigned";
    if (!findingsBySection.has(k)) findingsBySection.set(k, []);
    findingsBySection.get(k)!.push({
      ...f,
      photoData: f.photo_id ? photoMap[f.photo_id] ?? null : null,
    });
  }

  const sections = (
    (sectionRows as
      | { id: string; section_type: string; section_order: number; system_status?: unknown; inspector_notes?: string | null }[]
      | null) ?? []
  ).map((s) => ({ ...s, status: readSectionStatus(s) }));

  // Fetch the logo as base64 so react-pdf can embed it
  let logoData: string | null = null;
  if (inspector?.company_logo_url && isOwnStoragePath(inspector.company_logo_url, insp.inspector_id)) {
    try {
      const { data: signed } = await supabase.storage
        .from("report-assets")
        .createSignedUrl(inspector.company_logo_url, 60 * 5);
      if (signed?.signedUrl) {
        const res = await fetch(signed.signedUrl);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const mime = res.headers.get("content-type") ?? "image/png";
          logoData = `data:${mime};base64,${buf.toString("base64")}`;
        }
      }
    } catch (err) {
      console.warn("[pdf] logo fetch failed", err);
    }
  }

  return {
    property: {
      address: insp.property_address,
      city: insp.property_city,
      state: insp.property_state,
      zip: insp.property_zip,
      year_built: insp.property_year_built,
      sqft: insp.property_sqft,
      type: insp.property_type,
    },
    client: {
      name: insp.client_name,
      email: insp.client_email,
      phone: insp.client_phone,
    },
    visit: {
      date: insp.inspection_date,
      weather: insp.weather_conditions,
      temperature_f: insp.temperature_f,
      occupancy_status: insp.occupancy_status,
    },
    inspector: {
      full_name: inspector?.full_name ?? "Inspector",
      company_name: inspector?.company_name ?? "",
      license_number: inspector?.license_number ?? null,
      license_state: inspector?.license_state ?? null,
      phone: inspector?.phone ?? null,
      company_logo_url: inspector?.company_logo_url ?? null,
      logo_data: logoData,
      default_disclaimer: inspector?.default_disclaimer ?? null,
      license_expires: (inspector?.license_expires as string | null | undefined) ?? null,
    },
    sections: sections.map((s) => ({
      section_type: s.section_type,
      status: s.status,
      findings: findingsBySection.get(s.id) ?? [],
    })),
    compliance: buildCompliance({
      licenseState: inspector?.license_state ?? null,
      propertyState: insp.property_state,
      sopStandard: (inspector?.sop_standard as string | null | undefined) ?? null,
      yearBuilt: insp.property_year_built,
      sections,
    }),
    finalized_at: insp.finalized_at ?? new Date().toISOString(),
  };
}
