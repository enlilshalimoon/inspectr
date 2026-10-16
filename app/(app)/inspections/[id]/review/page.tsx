import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_COLOR, SEVERITY_LABEL, sortBySeverity } from "@/lib/utils/severity";
import { labelForSection } from "@/lib/supabase/sections";
import type { Finding, Photo, Severity, SectionType } from "@/lib/supabase/types";
import { EditableFindingCard } from "./finding-card";
import { BulkApproveButton } from "./bulk-approve-button";
import { TrecPanel } from "./trec-panel";
import { AddFindingForm } from "./add-finding-form";
import { isLockedStatus } from "@/lib/inspection/lock";
import { isTexasLicense, itemsMissingStatus, resolveItems, usesTrecForm } from "@/lib/trec/form";
import { loadFindingsForForm, loadReportForm } from "@/lib/trec/load";
import { SectionStatusControl } from "./section-status";
import { readSectionStatus, sectionsNeedingStatus } from "@/lib/inspection/system-status";
import { STANDARD_SECTIONS } from "@/lib/supabase/sections";

type Props = { params: Promise<{ id: string }> };

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Independent reads, all RLS-scoped to this inspector — fetch concurrently
  // instead of four sequential round-trips before anything paints.
  const [{ data: inspection }, { data: sections }, { data: findings }, { data: photoRows }] =
    await Promise.all([
      supabase
        .from("inspections")
        .select("id, status, property_year_built, property_sqft, property_type")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("inspection_sections")
        // "*" so the page still loads before migration 0004 adds system_status.
        .select("*")
        .eq("inspection_id", id)
        .order("section_order"),
      supabase
        .from("findings")
        .select(
          "id, inspection_id, section_id, photo_id, severity, title, description, recommended_action, is_approved, inspector_edited, ai_confidence, created_at, updated_at",
        )
        .eq("inspection_id", id),
      supabase
        .from("photos")
        .select("id, section_id, storage_path, created_at")
        .eq("inspection_id", id)
        .order("created_at", { ascending: false }),
    ]);
  if (!inspection) notFound();

  // Texas: the deliverable is TREC form REI 7-6, set up in a panel here.
  const { data: inspector } = await supabase
    .from("users")
    .select("license_state")
    .eq("id", user.id)
    .maybeSingle();
  const trecForm = isTexasLicense(inspector?.license_state) ? await loadReportForm(supabase, id) : null;
  const trecFindings = trecForm ? await loadFindingsForForm(supabase, id) : [];
  const trecMissing =
    trecForm && usesTrecForm(inspector?.license_state, trecForm)
      ? itemsMissingStatus(resolveItems(trecForm, trecFindings)).length
      : 0;

  // Sign URLs for photos (private bucket)
  const paths = (photoRows ?? []).map((p) => p.storage_path as string);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage
      .from("inspection-media")
      .createSignedUrls(paths, 60 * 60);
    for (const u of urls ?? []) {
      if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
    }
  }

  const findingsBySection = new Map<string | null, Finding[]>();
  for (const f of findings ?? []) {
    const k = (f.section_id as string | null) ?? null;
    if (!findingsBySection.has(k)) findingsBySection.set(k, []);
    findingsBySection.get(k)!.push(f as Finding);
  }

  const photoUrlById = new Map<string, string | null>();
  for (const p of photoRows ?? []) {
    photoUrlById.set(p.id as string, signed.get(p.storage_path as string) ?? null);
  }

  // Each finding shows its own photo, so the strip only lists photos that
  // aren't in the report (finding deleted, draft failed, or still drafting).
  const photosWithFinding = new Set((findings ?? []).map((f) => f.photo_id as string | null));
  const photosBySection = new Map<string | null, (Photo & { url: string | null })[]>();
  for (const p of photoRows ?? []) {
    if (photosWithFinding.has(p.id as string)) continue;
    const k = (p.section_id as string | null) ?? null;
    if (!photosBySection.has(k)) photosBySection.set(k, []);
    const url = signed.get(p.storage_path as string) ?? null;
    photosBySection.get(k)!.push({ ...(p as unknown as Photo), url });
  }

  const approvedCount = (findings ?? []).filter((f) => f.is_approved).length;
  const totalCount = findings?.length ?? 0;
  const remaining = totalCount - approvedCount;
  const pct = totalCount === 0 ? 0 : Math.round((approvedCount / totalCount) * 100);
  const allApproved = totalCount > 0 && remaining === 0;
  const locked = isLockedStatus(inspection.status);

  // Systems inventory: every required section plus any optional one in use,
  // then the unused optional ones (fireplace, pool...) so they can be marked.
  type SectionRow = { id: string; section_type: string; section_order: number; system_status?: unknown; inspector_notes?: string | null };
  const sectionRows = (sections ?? []) as SectionRow[];
  const rowByType = new Map(sectionRows.map((r) => [r.section_type, r]));
  const inventory = [
    ...sectionRows,
    ...STANDARD_SECTIONS.filter((d) => d.required && !rowByType.has(d.type)).map((d) => ({
      id: null,
      section_type: d.type,
      section_order: d.order,
      system_status: null,
    })),
  ].sort((a, b) => a.section_order - b.section_order);
  const unusedOptional = STANDARD_SECTIONS.filter((d) => !d.required && !rowByType.has(d.type));
  const missingStatus = sectionsNeedingStatus(sectionRows);
  const nothingCaptured = (photoRows?.length ?? 0) === 0 && totalCount === 0;

  return (
    <div className="space-y-6">
      {locked && (
        <Card className="border-2 border-emerald-300 bg-emerald-50">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-emerald-900">
              <span className="font-medium">Finalized and locked.</span> This is what the client
              sees. To change anything, re-open the report on the Finalize tab.
            </span>
            <Link
              href={`/inspections/${id}/finalize`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
            >
              Finalize tab →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Approval-progress banner — sticky so it stays visible while scrolling */}
      {totalCount > 0 && !locked && (
        <div
          data-approval-banner
          className="sticky top-2 z-20"
        >
          <Card
            className={`shadow-sm border-2 ${
              allApproved
                ? "border-emerald-300 bg-emerald-50"
                : "border-amber-300 bg-amber-50"
            }`}
          >
            <CardContent className="p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {allApproved ? (
                    <span className="text-sm font-medium text-emerald-900">
                      All {totalCount} findings approved
                      {trecMissing ? "" : " — ready to finalize"}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-amber-900">
                      {remaining} finding{remaining === 1 ? "" : "s"} still need your approval
                    </span>
                  )}
                  <span className="text-xs text-slate-600 shrink-0">
                    ({approvedCount} / {totalCount})
                  </span>
                </div>
                {allApproved && trecMissing > 0 ? (
                  <a
                    href="#trec-form"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700"
                  >
                    Set {trecMissing} TREC form item{trecMissing === 1 ? "" : "s"} ↓
                  </a>
                ) : allApproved ? (
                  <Link
                    href={`/inspections/${id}/finalize`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
                  >
                    Go to finalize →
                  </Link>
                ) : (
                  <span className="text-xs text-amber-900">
                    Review the AI draft, edit if needed, tap{" "}
                    <span className="font-medium">Approve</span> on each one.
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                <div
                  className={`h-full transition-all ${
                    allApproved ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <Stat label="Photos" value={String(photoRows?.length ?? 0)} />
          <Stat label="Findings" value={String(totalCount)} />
          <Stat label="Approved" value={`${approvedCount} / ${totalCount}`} />
          {inspection.property_year_built && (
            <Stat label="Year built" value={String(inspection.property_year_built)} />
          )}
          {inspection.property_sqft && (
            <Stat label="Sq ft" value={inspection.property_sqft.toLocaleString()} />
          )}
          <SeverityLegend findings={(findings ?? []) as Finding[]} />
        </CardContent>
      </Card>

      {nothingCaptured && (
        // With sections but no photos, the page was blank under the stats
        // card, with no way forward.
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-500">
              Nothing to review yet. Add photos on the Capture tab and drafted
              findings will show up here.
            </p>
            <Link
              href={`/inspections/${id}/capture`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              Go to Capture →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* A disabled fieldset turns off every edit control below (approve, edit,
          delete, voice, status, TREC boxes) once the report is finalized. The
          server actions refuse the edits too. */}
      <fieldset disabled={locked} className="space-y-6 min-w-0 border-0 p-0 m-0">
      <div className="text-sm text-slate-600">
        Mark every system <span className="font-medium">Inspected</span>,{" "}
        <span className="font-medium">Not inspected</span> (with the reason) or{" "}
        <span className="font-medium">Not present</span>. Most states require this list in the
        report.{" "}
        {missingStatus.length > 0 ? (
          <span className="text-amber-800 font-medium">
            {missingStatus.length} system{missingStatus.length === 1 ? "" : "s"} still need a status.
          </span>
        ) : (
          <span className="text-emerald-700 font-medium">All systems marked.</span>
        )}
      </div>

      {inventory.map((s) => {
          const sectionFindings = s.id ? sortBySeverity(findingsBySection.get(s.id) ?? []) : [];
          const sectionPhotos = s.id ? photosBySection.get(s.id) ?? [] : [];
          const sectionPhotoCount = (photoRows ?? []).filter((p) => p.section_id === s.id).length;
          const approvedInSection = sectionFindings.filter((f) => f.is_approved).length;
          return (
            <section key={s.section_type} className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-3 min-w-0">
                  <h2 className="text-lg font-medium text-slate-900">
                    {labelForSection(s.section_type as SectionType)}
                  </h2>
                  <span className="text-xs text-slate-400 shrink-0">
                    {sectionPhotoCount} photo{sectionPhotoCount === 1 ? "" : "s"} ·{" "}
                    {sectionFindings.length} finding{sectionFindings.length === 1 ? "" : "s"}
                  </span>
                </div>
                <BulkApproveButton
                  inspectionId={id}
                  sectionId={s.id}
                  totalCount={sectionFindings.length}
                  approvedCount={approvedInSection}
                />
              </div>

              <SectionStatusControl
                inspectionId={id}
                sectionType={s.section_type as SectionType}
                initial={readSectionStatus(s)}
                locked={locked}
              />

              {sectionPhotos.length > 0 && (
                <div className="space-y-1">
                <p className="text-xs text-slate-500">
                  Not in the report (no finding). Draft one from Capture if needed.
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
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
                </div>
              )}

              {sectionFindings.length > 0 && (
                <div className="space-y-2">
                  {sectionFindings.map((finding) => (
                    <EditableFindingCard
                      key={finding.id}
                      finding={finding}
                      inspectionId={id}
                      userId={user.id}
                      photoUrl={finding.photo_id ? photoUrlById.get(finding.photo_id) : null}
                      sectionType={s.section_type as SectionType}
                    />
                  ))}
                </div>
              )}

              {!locked && (
                <AddFindingForm inspectionId={id} sectionType={s.section_type as SectionType} />
              )}
            </section>
          );
        })}

      {unusedOptional.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-medium text-slate-900">Other systems</h2>
          <p className="text-xs text-slate-500">
            Only appear in the report once you set a status or add a finding. Mark a fireplace{" "}
            <span className="font-medium">Not present</span> if the home has none.
          </p>
          {unusedOptional.map((d) => (
            <div key={d.type} className="space-y-1.5">
              <div className="text-sm font-medium text-slate-800">{d.label}</div>
              <SectionStatusControl
                inspectionId={id}
                sectionType={d.type}
                initial={null}
                locked={locked}
                optional
              />
              {!locked && <AddFindingForm inspectionId={id} sectionType={d.type} />}
            </div>
          ))}
        </section>
      )}

      {trecForm && (
        <TrecPanel
          inspectionId={id}
          initialForm={trecForm}
          findings={trecFindings.map((f) => ({
            id: f.id,
            title: f.title,
            description: f.description,
            severity: f.severity,
            is_approved: f.is_approved,
            sectionType: f.sectionType,
          }))}
        />
      )}
      </fieldset>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function SeverityLegend({ findings }: { findings: Finding[] }) {
  const order: Severity[] = ["safety_hazard", "major_repair", "minor_repair", "monitor", "info"];
  const counts = new Map<Severity, number>(order.map((s) => [s, 0]));
  for (const f of findings) counts.set(f.severity, (counts.get(f.severity) ?? 0) + 1);
  return (
    <div className="flex items-center gap-3 ml-auto">
      {order.map((s) => {
        const n = counts.get(s) ?? 0;
        if (n === 0) return null;
        const c = SEVERITY_COLOR[s];
        return (
          <span
            key={s}
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${c.pill}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
            {n} {SEVERITY_LABEL[s]}
          </span>
        );
      })}
    </div>
  );
}
