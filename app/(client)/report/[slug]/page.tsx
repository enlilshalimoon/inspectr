// Public report viewer. No auth. Reachable to anyone with the slug.
//
// Uses the service-role client to look up the inspection by share_url_slug,
// then renders a mobile-first HTML version. Photos are signed for 1 hour.

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { labelForSection } from "@/lib/supabase/sections";
import { SEVERITY_COLOR, SEVERITY_LABEL, sortBySeverity } from "@/lib/utils/severity";
import type { Finding, Photo, Severity, SectionType } from "@/lib/supabase/types";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export default async function PublicReportPage({ params }: Props) {
  const { slug } = await params;
  const sb = createServiceClient();

  const { data: inspection } = await sb
    .from("inspections")
    .select(
      "id, inspector_id, status, finalized_at, property_address, property_city, property_state, property_zip, property_year_built, property_sqft, property_type, client_name, inspection_date, pdf_url",
    )
    .eq("share_url_slug", slug)
    .maybeSingle();

  if (!inspection || (inspection.status !== "finalized" && inspection.status !== "delivered")) {
    notFound();
  }

  const [{ data: inspector }, { data: sections }, { data: findings }, { data: photos }] =
    await Promise.all([
      sb
        .from("users")
        .select(
          "full_name, company_name, license_number, license_state, phone, default_disclaimer",
        )
        .eq("id", inspection.inspector_id)
        .maybeSingle(),
      sb
        .from("inspection_sections")
        .select("id, section_type, section_order")
        .eq("inspection_id", inspection.id)
        .order("section_order"),
      sb
        .from("findings")
        .select(
          "id, section_id, photo_id, severity, title, description, recommended_action, is_approved",
        )
        .eq("inspection_id", inspection.id)
        .eq("is_approved", true),
      sb
        .from("photos")
        .select("id, section_id, storage_path")
        .eq("inspection_id", inspection.id),
    ]);

  const paths = (photos ?? []).map((p) => p.storage_path as string);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await sb.storage
      .from("inspection-media")
      .createSignedUrls(paths, 60 * 60);
    for (const u of urls ?? []) if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
  }
  const photoUrlById = new Map<string, string | null>();
  for (const p of photos ?? []) {
    photoUrlById.set(p.id as string, signed.get(p.storage_path as string) ?? null);
  }

  const findingsBySection = new Map<string | null, Finding[]>();
  for (const f of (findings as Finding[] | null) ?? []) {
    const k = (f.section_id as string | null) ?? null;
    if (!findingsBySection.has(k)) findingsBySection.set(k, []);
    findingsBySection.get(k)!.push(f);
  }

  const photosBySection = new Map<string | null, (Photo & { url: string | null })[]>();
  for (const p of (photos as Photo[] | null) ?? []) {
    const k = (p.section_id as string | null) ?? null;
    if (!photosBySection.has(k)) photosBySection.set(k, []);
    photosBySection.get(k)!.push({ ...p, url: photoUrlById.get(p.id) ?? null });
  }

  const allFindings = (findings as Finding[] | null) ?? [];
  const severityCounts = (
    ["safety_hazard", "major_repair", "minor_repair", "monitor", "info"] as Severity[]
  ).map((s) => ({ severity: s, count: allFindings.filter((f) => f.severity === s).length }));

  let pdfUrl: string | null = null;
  if (inspection.pdf_url) {
    const { data: s } = await sb.storage
      .from("report-assets")
      .createSignedUrl(inspection.pdf_url as string, 60 * 60);
    pdfUrl = s?.signedUrl ?? null;
  }

  const fullAddress = [
    inspection.property_address,
    [inspection.property_city, inspection.property_state].filter(Boolean).join(", "),
    inspection.property_zip,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <header className="space-y-3 border-b border-slate-200 pb-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">
          Residential Property Inspection Report
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          {inspection.property_address}
        </h1>
        {(inspection.property_city || inspection.property_state) && (
          <p className="text-slate-500">
            {[inspection.property_city, inspection.property_state, inspection.property_zip]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-4 text-sm">
          <KV label="Inspector" value={inspector?.full_name ?? ""} subvalue={inspector?.company_name ?? ""} />
          {inspector?.license_number && (
            <KV
              label="License"
              value={`${inspector.license_number}${inspector.license_state ? ` (${inspector.license_state})` : ""}`}
            />
          )}
          <KV label="Client" value={inspection.client_name ?? "—"} />
          <KV label="Inspection date" value={inspection.inspection_date ?? "—"} />
        </div>
      </header>

      {/* Summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
        <div className="flex flex-wrap gap-2">
          {severityCounts
            .filter((s) => s.count > 0)
            .map((s) => {
              const c = SEVERITY_COLOR[s.severity];
              return (
                <span
                  key={s.severity}
                  className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full border ${c.pill}`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
                  {s.count} {SEVERITY_LABEL[s.severity]}
                </span>
              );
            })}
          {severityCounts.every((s) => s.count === 0) && (
            <p className="text-sm text-slate-500">No findings recorded.</p>
          )}
        </div>
        {pdfUrl && (
          <div className="pt-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
            >
              Download PDF
            </a>
          </div>
        )}
      </section>

      {/* Findings by section */}
      {(sections ?? []).map((s) => {
        const sectionFindings = sortBySeverity(findingsBySection.get(s.id) ?? []);
        const sectionPhotos = photosBySection.get(s.id) ?? [];
        if (sectionFindings.length === 0 && sectionPhotos.length === 0) return null;
        return (
          <section key={s.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {labelForSection(s.section_type as SectionType)}
            </h2>
            {sectionPhotos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {sectionPhotos.map((p) => (
                  <div
                    key={p.id}
                    className="aspect-square overflow-hidden rounded-lg bg-slate-100 border border-slate-200"
                  >
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {sectionFindings.map((f) => {
                const c = SEVERITY_COLOR[f.severity];
                return (
                  <div
                    key={f.id}
                    className="rounded-lg border border-slate-200 p-4 space-y-2"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${c.pill}`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
                      {SEVERITY_LABEL[f.severity]}
                    </span>
                    <h3 className="font-medium text-slate-900">{f.title}</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{f.description}</p>
                    {f.recommended_action && (
                      <p className="text-sm text-slate-600 border-l-2 border-slate-200 pl-3">
                        <span className="font-medium text-slate-700">Recommended action:</span>{" "}
                        {f.recommended_action}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Disclaimer */}
      {inspector?.default_disclaimer && (
        <section className="pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Disclaimer and limitations</h2>
          <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
            {inspector.default_disclaimer}
          </p>
        </section>
      )}

      <footer className="pt-6 border-t border-slate-200 text-xs text-slate-400 space-y-1">
        <p>
          AI-assisted draft, reviewed and approved by{" "}
          <span className="text-slate-600">{inspector?.full_name}</span>
          {inspector?.license_number ? `, License ${inspector.license_number}` : ""}.
        </p>
        <p>Finalized {inspection.finalized_at ? new Date(inspection.finalized_at).toLocaleString() : ""}.</p>
        <p className="pt-2">
          Generated by{" "}
          <Link href="/" className="underline underline-offset-4">
            Inspectr
          </Link>
        </p>
      </footer>
    </article>
  );
}

function KV({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value || "—"}</div>
      {subvalue && <div className="text-xs text-slate-500">{subvalue}</div>}
    </div>
  );
}
