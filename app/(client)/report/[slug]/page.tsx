// Public report viewer. No auth. Reachable to anyone with the slug.
//
// Uses the service-role client to look up the inspection by share_url_slug,
// then renders a mobile-first HTML version. Photos are signed for 1 hour.

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { labelForSection } from "@/lib/supabase/sections";
import { SEVERITY_COLOR, SEVERITY_LABEL, sortBySeverity } from "@/lib/utils/severity";
import { isOwnStoragePath } from "@/lib/inspection/photos";
import type { Finding, Severity, SectionType } from "@/lib/supabase/types";
import { readSectionStatus, type SectionStatus } from "@/lib/inspection/system-status";
import {
  buildCompliance,
  formatDateOnly,
  licenseLine,
  ncSummaryItems,
  recommendationFor,
  statusLabel,
  wiSummaryGroups,
} from "@/lib/compliance/report";
import {
  NC_SUMMARY_STATEMENT,
  PA_UNREASONABLE_RISK_LABEL,
  WI_SUMMARY_STATEMENTS,
} from "@/lib/compliance/state-rules";

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

  const [{ data: inspector }, { data: sections }, { data: findings }] =
    await Promise.all([
      sb
        .from("users")
        // "*" so license_expires / sop_standard come through once migration
        // 0004 adds them, without breaking before it does.
        .select("*")
        .eq("id", inspection.inspector_id)
        .maybeSingle(),
      sb
        .from("inspection_sections")
        .select("*")
        .eq("inspection_id", inspection.id)
        .order("section_order"),
      sb
        .from("findings")
        .select(
          "id, section_id, photo_id, severity, title, description, recommended_action, is_approved",
        )
        .eq("inspection_id", inspection.id)
        .eq("is_approved", true),
    ]);

  // Only photos attached to an approved finding reach the client. Photos the
  // inspector dropped (finding deleted, never approved) stay private.
  const reportPhotoIds = Array.from(
    new Set(((findings as Finding[] | null) ?? []).map((f) => f.photo_id).filter(Boolean) as string[]),
  );
  const { data: photos } = reportPhotoIds.length
    ? await sb.from("photos").select("id, storage_path").in("id", reportPhotoIds)
    : { data: [] as { id: string; storage_path: string }[] };

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

  const allFindings = (findings as Finding[] | null) ?? [];
  type SectionRow = { id: string; section_type: string; system_status?: unknown; inspector_notes?: string | null };
  const sectionList = ((sections as SectionRow[] | null) ?? []).map((s) => ({
    ...s,
    status: readSectionStatus(s),
  }));
  const compliance = buildCompliance({
    licenseState: inspector?.license_state ?? null,
    propertyState: inspection.property_state,
    sopStandard: (inspector?.sop_standard as string | null | undefined) ?? null,
    yearBuilt: inspection.property_year_built,
    sections: sectionList,
  });
  const sectionTypeById = new Map(sectionList.map((s) => [s.id, s.section_type]));
  const summaryFindings = sortBySeverity(allFindings).map((f) => ({
    ...f,
    section_type: (f.section_id && sectionTypeById.get(f.section_id)) || "",
  }));
  const license = inspector ? licenseLine(inspector) : null;
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

  let logoUrl: string | null = null;
  if (inspector?.company_logo_url && isOwnStoragePath(inspector.company_logo_url, inspection.inspector_id)) {
    const { data: s } = await sb.storage
      .from("report-assets")
      .createSignedUrl(inspector.company_logo_url, 60 * 60);
    logoUrl = s?.signedUrl ?? null;
  }

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <header className="space-y-3 border-b border-slate-200 pb-6">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={inspector?.company_name ?? ""}
            className="h-16 w-16 object-contain mb-4"
          />
        )}
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
          {license && <KV label="License" value={license} />}
          <KV label="Client" value={inspection.client_name ?? "—"} />
          <KV
            label="Inspection date"
            value={inspection.inspection_date ? formatDateOnly(inspection.inspection_date) : "—"}
          />
        </div>
      </header>

      {/* State-mandated summary pages (NC G.S. 143-151.58(a1), Wis. Stat. 440.975(3)(cr)) */}
      {compliance.ncSummary && (
        <section className="space-y-3 rounded-lg border-2 border-slate-900 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Summary page</h2>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed">{NC_SUMMARY_STATEMENT}</p>
          <p className="text-sm text-slate-600">
            Systems or components that do not function as intended, or that appear not to and need
            further evaluation by a specialist:
          </p>
          <SummaryList
            items={ncSummaryItems(summaryFindings).map((f) => ({
              key: f.id,
              label: SEVERITY_LABEL[f.severity],
              title: f.title,
              where: f.section_type ? labelForSection(f.section_type as SectionType) : "",
            }))}
          />
        </section>
      )}
      {compliance.wiSummary && (
        <section className="space-y-3 rounded-lg border-2 border-slate-900 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Summary page</h2>
          {WI_SUMMARY_STATEMENTS.map((t) => (
            <p key={t.slice(0, 20)} className="text-sm text-slate-700 leading-relaxed">
              {t}
            </p>
          ))}
          <h3 className="font-medium text-slate-900">Defects</h3>
          <SummaryList
            items={wiSummaryGroups(summaryFindings).defects.map((f) => ({
              key: f.id,
              label: "Defect",
              title: f.title,
              where: f.section_type ? labelForSection(f.section_type as SectionType) : "",
            }))}
          />
          <h3 className="font-medium text-slate-900">
            Repairs, further evaluation, monitoring and maintenance
          </h3>
          <SummaryList
            items={wiSummaryGroups(summaryFindings).other.map((f) => ({
              key: f.id,
              label: f.label,
              title: f.title,
              where: f.section_type ? labelForSection(f.section_type as SectionType) : "",
            }))}
          />
        </section>
      )}

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

      {/* Systems inventory */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Systems inventory</h2>
        <p className="text-sm text-slate-600">{compliance.scopeStatement}</p>
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {sectionList.map((s) => {
            const n = findingsBySection.get(s.id)?.length ?? 0;
            return (
              <a
                key={s.id}
                href={`#section-${s.section_type}`}
                className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    {labelForSection(s.section_type as SectionType)}
                  </div>
                  {(s.status?.description || s.status?.reason) && (
                    <div className="text-xs text-slate-500">
                      {[
                        s.status?.description,
                        s.status?.reason &&
                          (s.status.status === "not_inspected"
                            ? `Not inspected: ${s.status.reason}`
                            : s.status.reason),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={s.status} />
                  {n > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {n} finding{n === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Every section: status, then its findings */}
      {sectionList.map((s) => {
        const sectionFindings = sortBySeverity(findingsBySection.get(s.id) ?? []);
        return (
          <section key={s.id} id={`section-${s.section_type}`} className="space-y-3 scroll-mt-4">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200 pb-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {labelForSection(s.section_type as SectionType)}
              </h2>
              <StatusBadge status={s.status} />
            </div>
            {s.status?.description && (
              <p className="text-sm text-slate-700">
                <span className="font-medium">Description:</span> {s.status.description}
              </p>
            )}
            {s.status && s.status.status !== "inspected" && s.status.reason && (
              <p className="text-sm text-slate-700">
                <span className="font-medium">
                  {s.status.status === "not_inspected" ? "Reason not inspected" : "Note"}:
                </span>{" "}
                {s.status.reason}
              </p>
            )}
            {sectionFindings.length === 0 && s.status?.status === "inspected" && (
              <p className="text-sm text-slate-500">No deficiencies observed.</p>
            )}
            <div className="space-y-3">
              {sectionFindings.map((f) => {
                const c = SEVERITY_COLOR[f.severity];
                const rec = recommendationFor(f);
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
                    {compliance.flagUnreasonableRisk && f.severity === "safety_hazard" && (
                      <p className="text-sm font-bold uppercase text-red-700">
                        {PA_UNREASONABLE_RISK_LABEL}
                      </p>
                    )}
                    <h3 className="font-medium text-slate-900">{f.title}</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{f.description}</p>
                    {rec && (
                      <p className="text-sm text-slate-600 border-l-2 border-slate-200 pl-3">
                        <span className="font-medium text-slate-700">Recommendation:</span>{" "}
                        {rec}
                      </p>
                    )}
                    {f.photo_id && photoUrlById.get(f.photo_id) && (
                      <a
                        href={photoUrlById.get(f.photo_id)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block pt-1"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrlById.get(f.photo_id)!}
                          alt={f.title}
                          className="w-full max-h-96 object-cover rounded-md border border-slate-200 bg-slate-100"
                        />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Standards, limitations, state statements, signature */}
      <section className="pt-6 border-t border-slate-200 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Standards, scope and limitations</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{compliance.scopeStatement}</p>
        {compliance.notInspected.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-900">
              Limited inspection: systems not inspected
            </h3>
            <ul className="list-disc pl-5 text-sm text-slate-600">
              {compliance.notInspected.map((n) => (
                <li key={n.label}>
                  {n.label}
                  {n.reason ? `: ${n.reason}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-900">Limitations</h3>
          {compliance.limitations.map((t) => (
            <p key={t.slice(0, 24)} className="text-sm text-slate-500 leading-relaxed">
              {t}
            </p>
          ))}
          {inspector?.default_disclaimer && (
            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
              {inspector.default_disclaimer}
            </p>
          )}
        </div>
        {compliance.packs
          .filter((p) => p.statements.length > 0 || p.listExclusions)
          .map((p) => (
            <div key={p.state} className="space-y-2">
              <h3 className="text-sm font-medium text-slate-900">{p.title} required statements</h3>
              {p.statements.map((st) =>
                st.conspicuous ? (
                  <p
                    key={st.text.slice(0, 24)}
                    className="text-sm font-bold text-slate-900 leading-relaxed border-2 border-slate-900 rounded-md p-3"
                  >
                    {st.text}
                  </p>
                ) : (
                  <p key={st.text.slice(0, 24)} className="text-sm text-slate-600 leading-relaxed">
                    {st.text}
                  </p>
                ),
              )}
              {p.listExclusions && compliance.exclusions && (
                <div>
                  <h4 className="text-sm font-medium text-slate-800">Exclusions</h4>
                  <ul className="list-disc pl-5 text-sm text-slate-600">
                    {compliance.exclusions.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

        <div className="pt-4 space-y-1">
          <h3 className="text-sm font-medium text-slate-900">Inspector signature</h3>
          <div className="h-8 w-64 border-b border-slate-900" />
          <p className="text-sm text-slate-700">
            Electronically signed by {inspector?.full_name}
            {inspection.finalized_at
              ? ` on ${new Date(inspection.finalized_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
              : ""}
          </p>
          {license && <p className="text-sm font-semibold text-slate-900">{license}</p>}
          {inspector?.company_name && (
            <p className="text-sm text-slate-500">{inspector.company_name}</p>
          )}
        </div>
      </section>

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
            Lookover
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

function StatusBadge({ status }: { status: SectionStatus | null }) {
  const cls = !status
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : status.status === "inspected"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status.status === "not_inspected"
        ? "bg-orange-50 text-orange-800 border-orange-200"
        : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

function SummaryList({
  items,
}: {
  items: { key: string; label: string; title: string; where: string }[];
}) {
  if (items.length === 0) return <p className="text-sm text-slate-500">None.</p>;
  return (
    <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {items.map((i) => (
        <li key={i.key} className="px-3 py-2 text-sm">
          <span className="font-semibold text-slate-900">{i.label}:</span>{" "}
          <span className="text-slate-700">{i.title}</span>
          {i.where && <span className="text-slate-500"> (see {i.where})</span>}
        </li>
      ))}
    </ul>
  );
}
