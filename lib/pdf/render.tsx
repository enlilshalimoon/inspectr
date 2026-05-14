// Server-side PDF rendering pipeline.
//
// Given an inspection id, loads the inspection + sections + approved findings
// + linked photos (fetched as base64 so react-pdf can embed them), renders to
// a Buffer via @react-pdf/renderer.

import { renderToBuffer } from "@react-pdf/renderer";
import { InspectionReportDoc, type ReportData } from "./report";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Finding, Photo } from "@/lib/supabase/types";

type Mode = "session" | "service";

export async function renderInspectionPdf(
  inspectionId: string,
  mode: Mode = "session",
): Promise<Buffer> {
  const supabase =
    mode === "service" ? createServiceClient() : await createClient();

  const data = await loadReportData(supabase, inspectionId);
  return renderToBuffer(<InspectionReportDoc data={data} />);
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
    .select(
      "full_name, company_name, company_logo_url, license_number, license_state, phone, default_disclaimer",
    )
    .eq("id", insp.inspector_id)
    .maybeSingle();

  const { data: sectionRows } = await supabase
    .from("inspection_sections")
    .select("id, section_type, section_order")
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
  let photoMap: Record<string, string | null> = {};
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

  const sections =
    (sectionRows as { id: string; section_type: string; section_order: number }[] | null) ?? [];

  // Fetch the logo as base64 so react-pdf can embed it
  let logoData: string | null = null;
  if (inspector?.company_logo_url) {
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
    },
    sections: sections.map((s) => ({
      section_type: s.section_type,
      findings: findingsBySection.get(s.id) ?? [],
    })),
    finalized_at: insp.finalized_at ?? new Date().toISOString(),
  };
}
