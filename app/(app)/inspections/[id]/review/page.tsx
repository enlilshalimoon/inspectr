import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_COLOR, SEVERITY_LABEL, sortBySeverity } from "@/lib/utils/severity";
import { STANDARD_SECTIONS, labelForSection } from "@/lib/supabase/sections";
import type { Finding, Severity, SectionType } from "@/lib/supabase/types";

type Props = { params: Promise<{ id: string }> };

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: inspection } = await supabase
    .from("inspections")
    .select("id, status, property_year_built, property_sqft, property_type")
    .eq("id", id)
    .maybeSingle();
  if (!inspection) notFound();

  const { data: sections } = await supabase
    .from("inspection_sections")
    .select("id, section_type, section_order")
    .eq("inspection_id", id);

  const { data: findings } = await supabase
    .from("findings")
    .select("id, section_id, severity, title, description, recommended_action, is_approved")
    .eq("inspection_id", id);

  const findingsBySection = new Map<string | null, Finding[]>();
  for (const f of findings ?? []) {
    const k = (f.section_id as string | null) ?? null;
    if (!findingsBySection.has(k)) findingsBySection.set(k, []);
    findingsBySection.get(k)!.push(f as Finding);
  }

  const sectionRows = (sections ?? [])
    .slice()
    .sort((a, b) => (a.section_order ?? 0) - (b.section_order ?? 0));

  const approvedCount = (findings ?? []).filter((f) => f.is_approved).length;
  const totalCount = findings?.length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <Stat label="Findings" value={String(totalCount)} />
          <Stat label="Approved" value={`${approvedCount} / ${totalCount}`} />
          {inspection.property_year_built && (
            <Stat label="Year built" value={String(inspection.property_year_built)} />
          )}
          {inspection.property_sqft && (
            <Stat label="Square feet" value={inspection.property_sqft.toLocaleString()} />
          )}
          {inspection.property_type && (
            <Stat label="Type" value={String(inspection.property_type).replace(/_/g, " ")} />
          )}
          <SeverityLegend findings={(findings ?? []) as Finding[]} />
        </CardContent>
      </Card>

      {sectionRows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-500">
            No sections yet. Capture photos from a phone to start.
          </CardContent>
        </Card>
      ) : (
        sectionRows.map((s) => {
          const f = sortBySeverity(findingsBySection.get(s.id) ?? []);
          return (
            <section key={s.id} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-medium text-slate-900">
                  {labelForSection(s.section_type as SectionType)}
                </h2>
                <span className="text-xs text-slate-400">
                  {f.length} finding{f.length === 1 ? "" : "s"}
                </span>
              </div>
              {f.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-sm text-slate-400 italic">
                    No findings drafted yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {f.map((finding) => (
                    <FindingCard key={finding.id} finding={finding} />
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

function FindingCard({ finding }: { finding: Finding }) {
  const c = SEVERITY_COLOR[finding.severity];
  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${c.pill}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
                {SEVERITY_LABEL[finding.severity]}
              </span>
              {finding.is_approved && (
                <span className="text-xs text-emerald-700">✓ Approved</span>
              )}
            </div>
            <h3 className="font-medium text-slate-900">{finding.title}</h3>
          </div>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{finding.description}</p>
        {finding.recommended_action && (
          <p className="text-sm text-slate-600 border-l-2 border-slate-200 pl-3">
            <span className="font-medium text-slate-700">Recommended action:</span>{" "}
            {finding.recommended_action}
          </p>
        )}
      </CardContent>
    </Card>
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

// keep linter happy about STANDARD_SECTIONS import (we use labelForSection only here)
void STANDARD_SECTIONS;
