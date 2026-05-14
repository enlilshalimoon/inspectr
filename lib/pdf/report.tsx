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
    default_disclaimer: string | null;
  };
  sections: {
    section_type: string;
    findings: (Finding & { photoData?: string | null })[];
  }[];
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
  const allFindings = data.sections.flatMap((s) => s.findings);
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

  return (
    <Document
      title={`Inspection Report — ${data.property.address}`}
      author={data.inspector.full_name}
    >
      {/* Cover page */}
      <Page size="LETTER" style={[styles.page, styles.coverPage]}>
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
              <Text style={[styles.coverValue, { fontSize: 11, color: COLOR.slate700 }]}>
                {data.inspector.company_name}
              </Text>
              {data.inspector.license_number && (
                <Text style={{ fontSize: 9, color: COLOR.slate500, marginTop: 4 }}>
                  License {data.inspector.license_number}
                  {data.inspector.license_state ? ` (${data.inspector.license_state})` : ""}
                </Text>
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
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 48, marginTop: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverLabel}>Inspection date</Text>
              <Text style={styles.coverValue}>{data.visit.date ?? "—"}</Text>
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
          Finalized {formatDate(data.finalized_at)}
        </Text>
      </Page>

      {/* Summary page */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Inspection summary</Text>
        <Text style={styles.body}>{fullAddress}</Text>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.h2}>Findings by severity</Text>
          {severityCounts
            .filter((s) => s.count > 0)
            .map((s) => {
              const c = SEV_COLOR[s.severity];
              return (
                <View key={s.severity} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{SEV_LABEL[s.severity]}</Text>
                  <View style={[styles.pill, { backgroundColor: c.bg, color: c.fg, borderColor: c.border }]}>
                    <Text style={{ color: c.fg }}>{s.count}</Text>
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

        <PageFooter inspector={data.inspector} />
      </Page>

      {/* Findings pages */}
      {data.sections
        .filter((s) => s.findings.length > 0)
        .map((s) => (
          <Page key={s.section_type} size="LETTER" style={styles.page}>
            <View style={styles.sectionHeader}>
              <Text style={styles.h1}>{labelForSection(s.section_type as never)}</Text>
              <Text style={styles.body}>
                {s.findings.length} finding{s.findings.length === 1 ? "" : "s"}
              </Text>
            </View>

            {sortBySeverity(s.findings).map((f) => {
              const c = SEV_COLOR[f.severity];
              return (
                <View key={f.id} style={styles.findingCard} wrap={false}>
                  <View style={styles.findingHeader}>
                    <View style={[styles.pill, { backgroundColor: c.bg, color: c.fg, borderColor: c.border }]}>
                      <Text style={{ color: c.fg }}>{SEV_LABEL[f.severity]}</Text>
                    </View>
                  </View>
                  <Text style={styles.findingTitle}>{f.title}</Text>
                  <Text style={styles.findingBody}>{f.description}</Text>
                  {f.recommended_action && (
                    <Text style={styles.actionBlock}>
                      Recommended action: {f.recommended_action}
                    </Text>
                  )}
                  {f.photoData && (
                    <View style={styles.photoRow}>
                      <Image src={f.photoData} style={styles.photo} />
                    </View>
                  )}
                </View>
              );
            })}

            <PageFooter inspector={data.inspector} />
          </Page>
        ))}

      {/* Disclaimer + signature */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Disclaimer and limitations</Text>
        {data.inspector.default_disclaimer ? (
          <Text style={styles.disclaimer}>{data.inspector.default_disclaimer}</Text>
        ) : (
          <Text style={styles.disclaimer}>
            This report reflects the inspector&apos;s observations on the date of
            inspection. It is a visual, non-invasive assessment of accessible
            systems and components and is not a guarantee, warranty, or
            insurance policy.
          </Text>
        )}

        <View style={{ marginTop: 32 }}>
          <Text style={styles.h2}>Inspector signature</Text>
          <Text style={styles.body}>{data.inspector.full_name}</Text>
          <Text style={[styles.body, { color: COLOR.slate500 }]}>
            {data.inspector.company_name}
            {data.inspector.license_number ? ` · License ${data.inspector.license_number}` : ""}
            {data.inspector.license_state ? ` (${data.inspector.license_state})` : ""}
          </Text>
          <Text style={[styles.body, { color: COLOR.slate500, marginTop: 4 }]}>
            Finalized {formatDate(data.finalized_at)}
          </Text>
        </View>

        <PageFooter inspector={data.inspector} />
      </Page>
    </Document>
  );
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
        {inspector.full_name} · {inspector.company_name}
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
