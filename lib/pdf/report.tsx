// React-PDF template for the finalized inspection report.
// Used by /api/pdf/[id] to render to a Buffer for storage upload.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import type { Finding, Severity } from "@/lib/supabase/types";
import { labelForSection } from "@/lib/supabase/sections";
import type { SectionStatus } from "@/lib/inspection/system-status";
import {
  formatDateOnly,
  licenseLine,
  ncSummaryItems,
  recommendationFor,
  statusLabel,
  wiSummaryGroups,
  type Compliance,
} from "@/lib/compliance/report";
import {
  NC_SUMMARY_STATEMENT,
  PA_UNREASONABLE_RISK_LABEL,
  WI_SUMMARY_STATEMENTS,
} from "@/lib/compliance/state-rules";

// ---------------------------------------------------------------------------
// Types the renderer expects
// ---------------------------------------------------------------------------
export interface ReportData {
  property: {
    address: string;
    city: string | null;
    state: string | null;
    zip: string | null;
    year_built: number | null;
    sqft: number | null;
    type: string | null;
  };
  client: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  visit: {
    date: string | null;
    weather: string | null;
    temperature_f: number | null;
    occupancy_status: string | null;
  };
  inspector: {
    full_name: string;
    company_name: string;
    license_number: string | null;
    license_state: string | null;
    phone: string | null;
    company_logo_url: string | null;
    logo_data: string | null;
    default_disclaimer: string | null;
    license_expires: string | null;
  };
  sections: {
    section_type: string;
    status: SectionStatus | null;
    findings: (Finding & { photoData?: string | null })[];
  }[];
  compliance: Compliance;
  finalized_at: string;
}

// ---------------------------------------------------------------------------
// Style tokens — keep close to the web app palette
// ---------------------------------------------------------------------------
const COLOR = {
  slate900: "#0F172A",
  slate700: "#334155",
  slate500: "#64748B",
  slate300: "#CBD5E1",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",
  slate50: "#F8FAFC",
  red700: "#B91C1C",
  red50: "#FEF2F2",
  orange700: "#C2410C",
  orange50: "#FFF7ED",
  amber700: "#B45309",
  amber50: "#FFFBEB",
  sky700: "#0369A1",
  sky50: "#F0F9FF",
};

const SEV_LABEL: Record<Severity, string> = {
  info: "Informational",
  monitor: "Monitor",
  minor_repair: "Minor Repair",
  major_repair: "Major Repair",
  safety_hazard: "Safety Hazard",
};

const SEV_COLOR: Record<Severity, { bg: string; fg: string; border: string }> = {
  info: { bg: COLOR.slate100, fg: COLOR.slate700, border: COLOR.slate300 },
  monitor: { bg: COLOR.sky50, fg: COLOR.sky700, border: "#BAE6FD" },
  minor_repair: { bg: COLOR.amber50, fg: COLOR.amber700, border: "#FDE68A" },
  major_repair: { bg: COLOR.orange50, fg: COLOR.orange700, border: "#FED7AA" },
  safety_hazard: { bg: COLOR.red50, fg: COLOR.red700, border: "#FECACA" },
};

const SEV_ORDER: Severity[] = [
  "safety_hazard",
  "major_repair",
  "minor_repair",
  "monitor",
  "info",
];

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLOR.slate900,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  // Cover
  coverPage: { paddingTop: 80, paddingHorizontal: 56 },
  coverEyebrow: {
    fontSize: 10,
    color: COLOR.slate500,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: COLOR.slate900,
    lineHeight: 1.15,
  },
  coverSubtitle: { fontSize: 14, color: COLOR.slate500, marginTop: 12 },
  coverBlock: { marginTop: 56 },
  coverLabel: {
    fontSize: 9,
    color: COLOR.slate500,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  coverValue: { fontSize: 13, color: COLOR.slate900 },
  coverFooter: {
    position: "absolute",
    bottom: 48,
    left: 56,
    right: 56,
    fontSize: 9,
    color: COLOR.slate500,
  },
  // Section heads
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 12, color: COLOR.slate900 },
  h2: { fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 6, color: COLOR.slate900 },
  h3: { fontSize: 11, fontWeight: 700, marginBottom: 4, color: COLOR.slate900 },
  body: { fontSize: 10, color: COLOR.slate700, lineHeight: 1.5 },
  // Severity pill
  pill: {
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  // Summary table
  summaryRow: { flexDirection: "row", marginBottom: 4 },
  summaryLabel: { width: 130, color: COLOR.slate500, fontSize: 10 },
  summaryValue: { color: COLOR.slate900, fontSize: 10 },
  // Finding cards
  findingCard: {
    borderWidth: 1,
    borderColor: COLOR.slate200,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  findingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  findingTitle: { fontSize: 11, fontWeight: 700, color: COLOR.slate900, marginBottom: 4 },
  findingBody: { fontSize: 10, color: COLOR.slate700, lineHeight: 1.5, marginBottom: 6 },
  actionBlock: {
    fontSize: 9,
    color: COLOR.slate700,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLOR.slate200,
  },
  // Photo strip
  photoRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 4,
    objectFit: "cover",
  },
  // Footer
  pageFooter: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    color: COLOR.slate500,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLOR.slate200,
  },
  // Section divider
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.slate200,
  },
  // Systems inventory table
  invRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLOR.slate200,
    paddingVertical: 5,
  },
  invSystem: { width: 150, fontSize: 9.5, color: COLOR.slate900, fontWeight: 700 },
  invStatus: { width: 90, fontSize: 9.5 },
  invNote: { flex: 1, fontSize: 9, color: COLOR.slate700, lineHeight: 1.4 },
  // Statements
  statement: { fontSize: 9.5, color: COLOR.slate700, lineHeight: 1.5, marginBottom: 6 },
  conspicuous: {
    borderWidth: 1.5,
    borderColor: COLOR.slate900,
    padding: 10,
    marginBottom: 8,
  },
  conspicuousText: { fontSize: 10, fontWeight: 700, color: COLOR.slate900, lineHeight: 1.5, marginBottom: 5 },
  bullet: { fontSize: 9.5, color: COLOR.slate700, lineHeight: 1.5, marginBottom: 2, paddingLeft: 8 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: COLOR.slate900, width: 260, marginTop: 28, marginBottom: 4 },
  // Disclaimer
  disclaimer: {
    fontSize: 9,
    color: COLOR.slate500,
    lineHeight: 1.6,
    marginTop: 18,
  },
});

// ---------------------------------------------------------------------------
// PDF document
// ---------------------------------------------------------------------------
export function InspectionReportDoc({ data }: { data: ReportData }) {
  const c = data.compliance;
  const allFindings = data.sections.flatMap((s) =>
    s.findings.map((f) => ({ ...f, section_type: s.section_type })),
  );
  const severityCounts = SEV_ORDER.map((s) => ({
    severity: s,
    count: allFindings.filter((f) => f.severity === s).length,
  }));
  const fullAddress = [
    data.property.address,
    [data.property.city, data.property.state].filter(Boolean).join(", "),
    data.property.zip,
  ]
    .filter(Boolean)
    .join(" · ");
  const license = licenseLine(data.inspector);

  return (
    <Document
      title={`Inspection Report — ${data.property.address}`}
      author={data.inspector.full_name}
    >
      {/* Cover page */}
      <Page size="LETTER" style={[styles.page, styles.coverPage]}>
        {data.inspector.logo_data && (
          <View style={{ marginBottom: 32 }}>
            <Image
              src={data.inspector.logo_data}
              style={{ width: 80, height: 80, objectFit: "contain" }}
            />
          </View>
        )}
        <Text style={styles.coverEyebrow}>Residential Property Inspection Report</Text>
        <Text style={styles.coverTitle}>{data.property.address}</Text>
        {(data.property.city || data.property.state) && (
          <Text style={styles.coverSubtitle}>
            {[data.property.city, data.property.state, data.property.zip]
              .filter(Boolean)
              .join(", ")}
          </Text>
        )}

        <View style={styles.coverBlock}>
          <View style={{ flexDirection: "row", gap: 48 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverLabel}>Inspector</Text>
              <Text style={styles.coverValue}>{data.inspector.full_name}</Text>
              {data.inspector.company_name && (
                <Text style={[styles.coverValue, { fontSize: 11, color: COLOR.slate700 }]}>
                  {data.inspector.company_name}
                </Text>
              )}
              {license && (
                <Text style={{ fontSize: 9, color: COLOR.slate500, marginTop: 4 }}>{license}</Text>
              )}
              {data.inspector.phone && (
                <Text style={{ fontSize: 9, color: COLOR.slate500 }}>{data.inspector.phone}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverLabel}>Client</Text>
              <Text style={styles.coverValue}>{data.client.name ?? "—"}</Text>
              {data.client.email && (
                <Text style={{ fontSize: 9, color: COLOR.slate500, marginTop: 4 }}>
                  {data.client.email}
                </Text>
              )}
              {data.client.phone && (
                <Text style={{ fontSize: 9, color: COLOR.slate500 }}>{data.client.phone}</Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 48, marginTop: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverLabel}>Inspection date</Text>
              <Text style={styles.coverValue}>
                {data.visit.date ? formatDateOnly(data.visit.date) : "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverLabel}>Conditions</Text>
              <Text style={styles.coverValue}>
                {[
                  data.visit.weather,
                  data.visit.temperature_f != null ? `${data.visit.temperature_f}°F` : null,
                  data.visit.occupancy_status,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.coverFooter}>
          AI-assisted draft, reviewed and approved by {data.inspector.full_name}
          {data.inspector.license_number ? `, License ${data.inspector.license_number}` : ""}
          {" · "}
          Report prepared {formatDate(data.finalized_at)}
        </Text>
      </Page>

      {/* State-mandated summary pages come right after the cover. */}
      {c.ncSummary && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.h1}>Summary page</Text>
          <View style={styles.conspicuous}>
            <Text style={styles.conspicuousText}>{NC_SUMMARY_STATEMENT}</Text>
          </View>
          <Text style={[styles.body, { marginBottom: 8 }]}>
            Systems or components that do not function as intended, or that appear not to and need
            further evaluation by a specialist:
          </Text>
          <SummaryList
            items={sortBySeverity(ncSummaryItems(allFindings)).map((f) => ({
              key: f.id,
              label: SEV_LABEL[f.severity],
              title: f.title,
              where: labelForSection(f.section_type as never),
            }))}
          />
          <PageFooter inspector={data.inspector} />
        </Page>
      )}
      {c.wiSummary && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.h1}>Summary page</Text>
          {WI_SUMMARY_STATEMENTS.map((t) => (
            <Text key={t.slice(0, 20)} style={styles.statement}>
              {t}
            </Text>
          ))}
          <Text style={styles.h2}>Defects</Text>
          <SummaryList
            items={sortBySeverity(wiSummaryGroups(allFindings).defects).map((f) => ({
              key: f.id,
              label: "Defect",
              title: f.title,
              where: labelForSection(f.section_type as never),
            }))}
          />
          <Text style={styles.h2}>Repairs, further evaluation, monitoring and maintenance</Text>
          <SummaryList
            items={sortBySeverity(wiSummaryGroups(allFindings).other).map((f) => ({
              key: f.id,
              label: f.label,
              title: f.title,
              where: labelForSection(f.section_type as never),
            }))}
          />
          <PageFooter inspector={data.inspector} />
        </Page>
      )}

      {/* Summary + systems inventory */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Inspection summary</Text>
        <Text style={styles.body}>{fullAddress}</Text>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.h2}>Findings by severity</Text>
          {severityCounts
            .filter((s) => s.count > 0)
            .map((s) => {
              const col = SEV_COLOR[s.severity];
              return (
                <View key={s.severity} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{SEV_LABEL[s.severity]}</Text>
                  <View style={[styles.pill, { backgroundColor: col.bg, color: col.fg, borderColor: col.border }]}>
                    <Text style={{ color: col.fg }}>{s.count}</Text>
                  </View>
                </View>
              );
            })}
          {severityCounts.every((s) => s.count === 0) && (
            <Text style={styles.body}>No findings reported.</Text>
          )}
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={styles.h2}>Property details</Text>
          {data.property.year_built && (
            <SummaryRow label="Year built" value={String(data.property.year_built)} />
          )}
          {data.property.sqft && (
            <SummaryRow label="Approx. sq ft" value={data.property.sqft.toLocaleString()} />
          )}
          {data.property.type && (
            <SummaryRow label="Type" value={data.property.type.replace(/_/g, " ")} />
          )}
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={styles.h2}>Scope</Text>
          <Text style={styles.body}>{c.scopeStatement}</Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={styles.h2} minPresenceAhead={60}>
            Systems inventory
          </Text>
          {data.sections.map((s) => (
            <View key={s.section_type} style={styles.invRow} wrap={false}>
              <Text style={styles.invSystem}>{labelForSection(s.section_type as never)}</Text>
              <Text style={[styles.invStatus, { color: statusColor(s.status) }]}>
                {statusLabel(s.status)}
              </Text>
              <Text style={styles.invNote}>{inventoryNote(s)}</Text>
            </View>
          ))}
        </View>

        <PageFooter inspector={data.inspector} />
      </Page>

      {/* Every section: status, description, then findings */}
      <Page size="LETTER" style={styles.page}>
        {data.sections.map((s) => (
          <View key={s.section_type} style={{ marginBottom: 6 }}>
            <View style={styles.sectionHeader} minPresenceAhead={80}>
              <Text style={styles.h1}>{labelForSection(s.section_type as never)}</Text>
              <Text style={[styles.body, { color: statusColor(s.status) }]}>
                {statusLabel(s.status)}
              </Text>
            </View>
            {s.status?.description && (
              <Text style={[styles.body, { marginBottom: 4 }]}>
                Description: {s.status.description}
              </Text>
            )}
            {s.status?.status !== "inspected" && s.status?.reason && (
              <Text style={[styles.body, { marginBottom: 4 }]}>
                {s.status.status === "not_inspected" ? "Reason not inspected" : "Note"}:{" "}
                {s.status.reason}
              </Text>
            )}
            {s.findings.length === 0 ? (
              s.status?.status === "inspected" ? (
                <Text style={[styles.body, { color: COLOR.slate500, marginBottom: 6 }]}>
                  No deficiencies observed.
                </Text>
              ) : null
            ) : (
              sortBySeverity(s.findings).map((f) => {
                const col = SEV_COLOR[f.severity];
                const rec = recommendationFor(f);
                return (
                  <View key={f.id} style={styles.findingCard} wrap={false}>
                    <View style={styles.findingHeader}>
                      <View style={[styles.pill, { backgroundColor: col.bg, color: col.fg, borderColor: col.border }]}>
                        <Text style={{ color: col.fg }}>{SEV_LABEL[f.severity]}</Text>
                      </View>
                    </View>
                    {c.flagUnreasonableRisk && f.severity === "safety_hazard" && (
                      <Text style={{ fontSize: 10, fontWeight: 700, color: COLOR.red700, marginBottom: 4 }}>
                        {PA_UNREASONABLE_RISK_LABEL.toUpperCase()}
                      </Text>
                    )}
                    <Text style={styles.findingTitle}>{f.title}</Text>
                    <Text style={styles.findingBody}>{f.description}</Text>
                    {rec && <Text style={styles.actionBlock}>Recommendation: {rec}</Text>}
                    {f.photoData && (
                      <View style={styles.photoRow}>
                        <Image src={f.photoData} style={styles.photo} />
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ))}

        <PageFooter inspector={data.inspector} />
      </Page>

      {/* Standards, limitations, state statements, signature */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Standards, scope and limitations</Text>
        <Text style={styles.statement}>{c.scopeStatement}</Text>

        {c.notInspected.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.h3}>Limited inspection: systems not inspected</Text>
            {c.notInspected.map((n) => (
              <Text key={n.label} style={styles.bullet}>
                • {n.label}
                {n.reason ? `: ${n.reason}` : ""}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Limitations</Text>
        {c.limitations.map((t) => (
          <Text key={t.slice(0, 24)} style={styles.statement}>
            {t}
          </Text>
        ))}
        {data.inspector.default_disclaimer && (
          <Text style={styles.statement}>{data.inspector.default_disclaimer}</Text>
        )}

        {c.packs
          .filter((p) => p.statements.length > 0 || p.listExclusions)
          .map((p) => (
            <View key={p.state} style={{ marginTop: 8 }}>
              <Text style={styles.h2} minPresenceAhead={60}>
                {p.title} required statements
              </Text>
              {p.statements.map((st) =>
                st.conspicuous ? (
                  <View key={st.text.slice(0, 24)} style={styles.conspicuous} wrap={false}>
                    <Text style={styles.conspicuousText}>{st.text}</Text>
                  </View>
                ) : (
                  <Text key={st.text.slice(0, 24)} style={styles.statement}>
                    {st.text}
                  </Text>
                ),
              )}
              {p.listExclusions && c.exclusions && (
                <View>
                  <Text style={styles.h3}>Exclusions</Text>
                  {c.exclusions.map((e) => (
                    <Text key={e} style={styles.bullet}>
                      • {e}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}

        <View style={{ marginTop: 24 }} wrap={false}>
          <Text style={styles.h2}>Inspector signature</Text>
          <View style={styles.sigLine} />
          <Text style={styles.body}>
            Electronically signed by {data.inspector.full_name} on {formatDate(data.finalized_at)}
          </Text>
          {license && <Text style={[styles.body, { fontWeight: 700 }]}>{license}</Text>}
          {data.inspector.company_name && (
            <Text style={[styles.body, { color: COLOR.slate500 }]}>{data.inspector.company_name}</Text>
          )}
          <Text style={[styles.body, { color: COLOR.slate500, marginTop: 6, fontSize: 9 }]}>
            Findings were drafted with AI assistance from the inspector&apos;s photos and notes. The
            inspector reviewed, edited as needed, and approved every finding in this report.
          </Text>
        </View>

        <PageFooter inspector={data.inspector} />
      </Page>
    </Document>
  );
}

function SummaryList({
  items,
}: {
  items: { key: string; label: string; title: string; where: string }[];
}) {
  if (items.length === 0) return <Text style={styles.body}>None.</Text>;
  return (
    <View>
      {items.map((i) => (
        <View key={i.key} style={styles.invRow} wrap={false}>
          <Text style={[styles.invStatus, { width: 150, fontWeight: 700 }]}>{i.label}</Text>
          <Text style={styles.invNote}>
            {i.title} (see {i.where})
          </Text>
        </View>
      ))}
    </View>
  );
}

function statusColor(s: SectionStatus | null): string {
  if (!s) return COLOR.amber700;
  if (s.status === "inspected") return "#047857";
  if (s.status === "not_inspected") return COLOR.orange700;
  return COLOR.slate500;
}

function inventoryNote(s: ReportData["sections"][number]): string {
  const parts: string[] = [];
  if (s.status?.description) parts.push(s.status.description);
  if (s.status?.status === "not_inspected" && s.status.reason) parts.push(`Not inspected: ${s.status.reason}`);
  else if (s.status?.reason) parts.push(s.status.reason);
  const n = s.findings.length;
  if (n) parts.push(`${n} finding${n === 1 ? "" : "s"}`);
  return parts.join(" · ") || "—";
}


// Small helper components
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function PageFooter({ inspector }: { inspector: ReportData["inspector"] }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>
        {inspector.full_name}
        {inspector.company_name ? ` · ${inspector.company_name}` : ""}
        {inspector.license_number ? ` · License ${inspector.license_number}` : ""}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function sortBySeverity<T extends { severity: Severity }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity),
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// Silence Font import — not used yet but reserved for later branding.
void Font;
