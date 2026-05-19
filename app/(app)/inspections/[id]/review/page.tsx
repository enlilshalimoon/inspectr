import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_COLOR, SEVERITY_LABEL, sortBySeverity } from "@/lib/utils/severity";
import { labelForSection } from "@/lib/supabase/sections";
import type { Finding, Photo, Severity, SectionType } from "@/lib/supabase/types";
import { EditableFindingCard } from "./finding-card";
import { BulkApproveButton } from "./bulk-approve-button";

type Props = { params: Promise<{ id: string }> };

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: inspection } = await supabase
    .from("inspections")
    .select("id, status, property_year_built, property_sqft, property_type")
    .eq("id", id)
    .maybeSingle();
  if (!inspection) notFound();

  const { data: sections } = await supabase
    .from("inspection_sections")
    .select("id, section_type, section_order")
    .eq("inspection_id", id)
    .order("section_order");

  const { data: findings } = await supabase
    .from("findings")
    .select(
      "id, inspection_id, section_id, photo_id, severity, title, description, recommended_action, is_approved, inspector_edited, ai_confidence, created_at, updated_at",
    )
    .eq("inspection_id", id);

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, section_id, storage_path, created_at")
    .eq("inspection_id", id)
    .order("created_at", { ascending: false });

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

  const photosBySection = new Map<string | null, (Photo & { url: string | null })[]>();
  for (const p of photoRows ?? []) {
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

  return (
    <div className="space-y-6">
      {/* Approval-progress banner — sticky so it stays visible while scrolling */}
      {totalCount > 0 && (
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
                      All {totalCount} findings approved — ready to finalize
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
                {allApproved ? (
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

      {!sections?.length ? (
        <EmptyState message="No sections yet. Capture photos from a phone to start." />
      ) : (
        sections.map((s) => {
          const sectionFindings = sortBySeverity(findingsBySection.get(s.id) ?? []);
          const sectionPhotos = photosBySection.get(s.id) ?? [];
          if (sectionPhotos.length === 0 && sectionFindings.length === 0) return null;
          const approvedInSection = sectionFindings.filter((f) => f.is_approved).length;
          return (
            <section key={s.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-3 min-w-0">
                  <h2 className="text-lg font-medium text-slate-900">
                    {labelForSection(s.section_type as SectionType)}
                  </h2>
                  <span className="text-xs text-slate-400 shrink-0">
                    {sectionPhotos.length} photo{sectionPhotos.length === 1 ? "" : "s"} ·{" "}
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

              {sectionPhotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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

              {sectionFindings.length > 0 && (
                <div className="space-y-2">
                  {sectionFindings.map((finding) => (
                    <EditableFindingCard
                      key={finding.id}
                      finding={finding}
                      inspectionId={id}
                      userId={user.id}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
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

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-slate-500">{message}</CardContent>
    </Card>
  );
}
