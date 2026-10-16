// TREC Property Inspection Report Form REI 7-6, rendered with @react-pdf.
//
// 22 TAC §535.223 requires software to reproduce the promulgated form
// verbatim with identical spacing, borders and text placement. So pages 1-2
// and the header/footer of every form page are drawn from rei76-layout.ts —
// each word and rule at the coordinates in TREC's own PDF. The item pages
// (3+) flow, because the rule lets the inspector allocate comment space under
// each item; their spacing matches TREC's (measured from pages 3-6).
//
// Allowed changes we use: inspector's logo in place of TREC's, page
// renumbering, extra comment space, dropping empty "Other" items and unused
// Section VI items (VI re-lettered), and photo pages attached after the form.
// Typeface stays Times at TREC's sizes.

import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { CheckBox } from "@/lib/trec/form";
import {
  bodyFooter,
  bodyHeader,
  checkbox as CHECKBOX_RECTS,
  fields as FIELD,
  page1,
  page2,
  type LayoutBlock,
  type LayoutRect,
  type LayoutWord,
} from "./rei76-layout";

export interface TrecFindingLine {
  title: string;
  description: string;
  recommended_action: string | null;
  photoNo: number | null;
}

export interface TrecItemData {
  letter: string;
  label: string;
  fields: { label: string; value: string }[];
  boxes: Record<CheckBox, boolean>;
  comment: string;
  findings: TrecFindingLine[];
}

export interface TrecSectionData {
  roman: string;
  title: string;
  items: TrecItemData[];
}

export interface TrecReportData {
  clientName: string;
  inspectionDate: string;
  propertyAddress: string;
  inspectorName: string;
  inspectorLicense: string;
  sponsorName: string;
  sponsorLicense: string;
  logoData: string | null;
  additionalInfo: string;
  sections: TrecSectionData[];
  photos: { no: number; caption: string; data: string }[];
}

// ---------------------------------------------------------------------------
// Placement helpers
// ---------------------------------------------------------------------------

const FONT: Record<string, string> = {
  R: "Times-Roman",
  B: "Times-Bold",
  I: "Times-Italic",
  HB: "Helvetica-Bold",
};

// With lineHeight 1, react-pdf puts the baseline this far (× size) below the
// Text box's top for the standard Times/Helvetica fonts. Calibrated against
// PyMuPDF's span origins (scripts/trec/compare.py).
const ASCENT = 0.9;

function Word({ w, dy = 0 }: { w: LayoutWord; dy?: number }) {
  const [x, base, f, size, text, color] = w;
  return (
    <Text
      style={{
        position: "absolute",
        left: x,
        top: base + dy - size * ASCENT,
        fontFamily: FONT[f],
        fontSize: size,
        lineHeight: 1,
        color: color ?? "#000000",
      }}
    >
      {text}
    </Text>
  );
}

function Rect({ r, dy = 0, dx = 0 }: { r: LayoutRect; dy?: number; dx?: number }) {
  const [x, y, w, h, fill] = r;
  return (
    <View
      style={{
        position: "absolute",
        left: x + dx,
        top: y + dy,
        width: w,
        height: h,
        backgroundColor: fill,
      }}
    />
  );
}

function Layout({ block, keep }: { block: LayoutBlock; keep?: (y: number) => boolean }) {
  const k = keep ?? (() => true);
  return (
    <>
      {block.rects.filter((r) => k(r[1])).map((r, i) => (
        <Rect key={`r${i}`} r={r} />
      ))}
      {block.words.filter((w) => k(w[1]) && w[2] !== "HB").map((w, i) => (
        <Word key={`w${i}`} w={w} />
      ))}
    </>
  );
}

/** Single-line value placed on a page-1 form line (fields are bottom-aligned on the rule). */
function FieldValue({ field, value }: { field: string; value: string }) {
  const [x0, , x1, y1] = FIELD[field];
  if (!value) return null;
  return (
    <Text
      style={{
        position: "absolute",
        left: x0 + 2,
        width: x1 - x0 - 4,
        top: y1 - 3 - 10 * ASCENT,
        fontFamily: "Times-Roman",
        fontSize: 10,
        lineHeight: 1,
        maxLines: 1,
      }}
    >
      {value}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Page 1
// ---------------------------------------------------------------------------

function PageOne({ d }: { d: TrecReportData }) {
  return (
    <Page size="LETTER" style={{ position: "relative" }}>
      {/* TREC logo slot (32.5, 26.8)–(105.2, 86.6): the inspector's logo, or blank. */}
      {d.logoData ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image
          src={d.logoData}
          style={{
            position: "absolute",
            left: 32.5,
            top: 26.8,
            width: 72.7,
            height: 59.8,
            objectFit: "contain",
          }}
        />
      ) : null}
      <Layout block={page1} />
      <FieldValue field="Name of Client" value={d.clientName} />
      <FieldValue field="Date of Inspection" value={d.inspectionDate} />
      <FieldValue field="Address of Inspected Property" value={d.propertyAddress} />
      <FieldValue field="Name of Inspector" value={d.inspectorName} />
      <FieldValue field="TREC License" value={d.inspectorLicense} />
      <FieldValue field="Name of Sponsor if applicable" value={d.sponsorName} />
      <FieldValue field="TREC License_2" value={d.sponsorLicense} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Page 2. Everything above the "ADDITIONAL INFORMATION" box is fixed; the box
// grows with the inspector's text (allowed: allocate comment space), and the
// rule + "Page 2 of __" follow it.
// ---------------------------------------------------------------------------

const P2_BOX_TOP = 432.4;
// Roughly 12 lines fit before the page bottom; beyond that the text goes on
// an attached page (the box says so).
export const ADDITIONAL_INFO_MAX_CHARS = 1400;

function PageTwo({ d }: { d: TrecReportData }) {
  const overflow = d.additionalInfo.length > ADDITIONAL_INFO_MAX_CHARS;
  const boxText = overflow
    ? "See “Additional Information Provided by Inspector” attached after the form."
    : d.additionalInfo;
  return (
    <Page size="LETTER" style={{ position: "relative" }}>
      <Layout block={page2} keep={(y) => y < P2_BOX_TOP} />
      {/* TREC sets this heading in Calibri Bold 11, which isn't a PDF base
          font. Helvetica Bold is wider, so it is set as one line centered on
          the original's span (183.2–433.3) instead of word by word. */}
      <Text
        style={{
          position: "absolute",
          left: 108.25,
          width: 400,
          top: page2.words.find((w) => w[2] === "HB")![1] - 11 * ASCENT,
          textAlign: "center",
          fontFamily: "Helvetica-Bold",
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        {page2.words.filter((w) => w[2] === "HB").map((w) => w[4]).join(" ")}
      </Text>
      {/* Footer (promulgation line + form id) sits below the flowing part. */}
      <Layout block={{ words: page2.words.filter((w) => w[1] > 760), rects: page2.rects.filter((r) => r[1] > 760) }} />
      <View fixed style={{ position: "absolute", left: 35, top: P2_BOX_TOP, width: 542.3 }}>
        {/* Sunken text-field border, as on TREC's fillable form. */}
        <View
          style={{
            width: 540.8,
            minHeight: 65.2,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderTopColor: "#404040",
            borderLeftColor: "#808080",
            borderBottomWidth: 0.5,
            borderRightWidth: 0.5,
            borderBottomColor: "#d3d0c7",
            borderRightColor: "#d3d0c7",
            paddingHorizontal: 3,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.15 }}>{boxText}</Text>
        </View>
        <View style={{ marginTop: 2.9, height: 1.6, width: 542.3, backgroundColor: "#000000" }} />
        <View style={{ position: "relative", flexDirection: "row", marginTop: 7.7, marginLeft: 237.1 }}>
          <Text style={{ fontFamily: "Times-Roman", fontSize: 12, lineHeight: 1 }}>Page 2 of </Text>
          <View style={{ width: 19, marginLeft: 1.3 }}>
            <Text
              style={{ fontFamily: "Times-Roman", fontSize: 12, lineHeight: 1, textAlign: "center" }}
              render={({ totalPages }) => `${totalPages}`}
            />
          </View>
          {/* TREC's blank for the page total: 0.54pt rule 3.3pt under the baseline. */}
          <View
            style={{ position: "absolute", left: 49.98, top: 12 * ASCENT + 3.3, width: 19.02, height: 0.54, backgroundColor: "#000000" }}
          />
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Item pages (3+): fixed header/footer from TREC's page 3, flowing items.
// ---------------------------------------------------------------------------

const BODY_TOP = 96;
const BODY_BOTTOM = 792 - 746;

function BodyChrome({ reportId, legend }: { reportId: string; legend: boolean }) {
  // "Page 3 of" in TREC's footer becomes the live page number.
  const footerWords = bodyFooter.words.filter((w) => !(w[1] > 750 && w[1] < 765));
  const footerRects = bodyFooter.rects.filter((r) => !(r[1] > 755 && r[1] < 765));
  const headerWords = legend ? bodyHeader.words : bodyHeader.words.filter((w) => w[1] < 50);
  const headerRects = legend ? bodyHeader.rects : bodyHeader.rects.filter((r) => r[1] < 50);
  return (
    <View fixed style={{ position: "absolute", left: 0, top: 0, width: 612, height: 1 }}>
      <Layout block={{ words: headerWords, rects: headerRects }} />
      <Text
        style={{
          position: "absolute",
          left: 131,
          width: 442,
          top: 44.22 - 1.5 - 10 * ASCENT,
          fontFamily: "Times-Roman",
          fontSize: 10,
          lineHeight: 1,
          maxLines: 1,
        }}
      >
        {reportId}
      </Text>
      {legend ? <Layout block={{ words: footerWords, rects: footerRects }} /> : null}
      <Text
        style={{
          position: "absolute",
          left: 272.1,
          top: 757.92 - 12 * ASCENT,
          fontFamily: "Times-Roman",
          fontSize: 12,
          lineHeight: 1,
        }}
        render={({ pageNumber }) => `Page ${pageNumber} of`}
      />
      <Text
        style={{
          position: "absolute",
          left: 322.1,
          width: 19,
          top: 757.92 - 12 * ASCENT,
          fontFamily: "Times-Roman",
          fontSize: 12,
          lineHeight: 1,
          textAlign: "center",
        }}
        render={({ totalPages }) => `${totalPages}`}
      />
      <View style={{ position: "absolute", left: 322.1, top: 761.0, width: 19, height: 0.54, backgroundColor: "#000000" }} />
    </View>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={{ width: 10.02, height: 10.02, position: "relative" }}>
      {CHECKBOX_RECTS.map((r, i) => (
        <Rect key={i} r={r} />
      ))}
      {checked ? (
        <Text
          style={{
            position: "absolute",
            left: 1.6,
            top: 0.6,
            fontFamily: "Helvetica-Bold",
            fontSize: 9.5,
            lineHeight: 1,
          }}
        >
          X
        </Text>
      ) : null}
    </View>
  );
}

// Body text metrics (baselines measured on TREC pages 3-6, 10pt Times):
const LINE = 11.5; // field / comment line pitch
const HEAD_TO_FIELD = 11.8; // item heading baseline → first italic line
const ITEM_GAP = 32.5 - LINE; // last line baseline → next heading, minus one line
const TITLE_TO_ITEM = 14.4; // section title baseline → first item heading
const FIRST_TITLE_TO_ITEM = 26.9; // same, for Section I at the top of page 3
const ITEM_TO_TITLE = 37.3; // last line baseline → next section title

const PAD_LEFT = 30.2;
const CHECKBOX_X = [33.4, 51.4, 72.0, 90.6];

function Item({ it }: { it: TrecItemData }) {
  const commentParas: ReactNode[] = [];
  if (it.comment.trim()) {
    for (const para of it.comment.trim().split(/\n+/)) commentParas.push(para);
  }
  for (const f of it.findings) {
    const parts = [f.title.trim().replace(/\.?$/, "."), f.description.trim()];
    if (f.recommended_action?.trim()) parts.push(f.recommended_action.trim());
    if (f.photoNo) parts.push(`(See Photo ${f.photoNo}.)`);
    commentParas.push(parts.join(" "));
  }
  const body = { fontFamily: "Times-Roman", fontSize: 10, lineHeight: LINE / 10 } as const;
  const italic = { ...body, fontFamily: "Times-Italic" } as const;
  return (
    <View style={{ marginBottom: ITEM_GAP }}>
      <View wrap={false} style={{ position: "relative" }}>
        {CHECKBOX_X.map((x, i) => (
          <View key={i} style={{ position: "absolute", left: x - PAD_LEFT, top: 1.1 }}>
            <Checkbox checked={it.boxes[(["i", "ni", "np", "d"] as CheckBox[])[i]]} />
          </View>
        ))}
        <Text style={{ marginLeft: 108 - PAD_LEFT, fontFamily: "Times-Bold", fontSize: 10, lineHeight: 1 }}>
          {`${it.letter}.  ${it.label}`}
        </Text>
        <View style={{ marginLeft: 125.88 - PAD_LEFT, marginTop: HEAD_TO_FIELD - 10 }}>
          {it.fields.map((f) => (
            <Text key={f.label} style={italic}>
              {f.label}
              {f.value ? <Text style={body}>{` ${f.value}`}</Text> : null}
            </Text>
          ))}
          <Text style={italic}>Comments:</Text>
        </View>
      </View>
      {commentParas.length ? (
        <View style={{ marginLeft: 125.88 - PAD_LEFT, marginRight: 8 }}>
          {commentParas.map((p, i) => (
            <Text key={i} style={{ ...body, marginTop: i === 0 ? 0 : 3 }}>
              {p}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SectionBlock({ s, first }: { s: TrecSectionData; first: boolean }) {
  return (
    <View>
      <View wrap={false} minPresenceAhead={60}>
        <Text
          style={{
            marginTop: first ? -0.7 : ITEM_TO_TITLE - ITEM_GAP - LINE - 1.6,
            textAlign: "center",
            marginLeft: 0,
            fontFamily: "Times-Bold",
            fontSize: 12,
            lineHeight: 1,
            marginBottom: (first ? FIRST_TITLE_TO_ITEM : TITLE_TO_ITEM) - 10.2,
          }}
        >
          {`${s.roman}. ${s.title}`}
        </Text>
      </View>
      {s.items.map((it) => (
        <Item key={it.letter} it={it} />
      ))}
    </View>
  );
}

function ItemPages({ d }: { d: TrecReportData }) {
  return (
    <Page
      size="LETTER"
      style={{ paddingTop: BODY_TOP + 4, paddingBottom: BODY_BOTTOM + 8, paddingLeft: PAD_LEFT, paddingRight: 612 - 575.3 }}
    >
      <BodyChrome reportId={d.propertyAddress} legend />
      {d.sections.map((s, i) => (
        <SectionBlock key={s.roman} s={s} first={i === 0} />
      ))}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Attachments after the form: overflowing page-2 text and photos.
// ---------------------------------------------------------------------------

function Attachments({ d }: { d: TrecReportData }) {
  const longInfo = d.additionalInfo.length > ADDITIONAL_INFO_MAX_CHARS;
  if (!longInfo && d.photos.length === 0) return null;
  return (
    <Page size="LETTER" style={{ paddingTop: 64, paddingBottom: 64, paddingHorizontal: 36 }}>
      <BodyChrome reportId={d.propertyAddress} legend={false} />
      {longInfo ? (
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontFamily: "Times-Bold", fontSize: 11, textAlign: "center", marginBottom: 8 }}>
            ADDITIONAL INFORMATION PROVIDED BY INSPECTOR
          </Text>
          <Text style={{ fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.15 }}>{d.additionalInfo}</Text>
        </View>
      ) : null}
      {d.photos.length ? (
        <>
          <Text minPresenceAhead={220} style={{ fontFamily: "Times-Bold", fontSize: 11, textAlign: "center", marginBottom: 10 }}>
            PHOTOS
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {d.photos.map((p) => (
              <View key={p.no} wrap={false} style={{ width: 264, marginBottom: 14 }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={p.data} style={{ width: 264, height: 198, objectFit: "cover" }} />
                <Text style={{ fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.15, marginTop: 4 }}>
                  <Text style={{ fontFamily: "Times-Bold" }}>{`Photo ${p.no}. `}</Text>
                  {p.caption}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Page>
  );
}

export function TrecReportDoc({ data }: { data: TrecReportData }) {
  return (
    <Document title={`Property Inspection Report — ${data.propertyAddress}`} author={data.inspectorName}>
      <PageOne d={data} />
      <PageTwo d={data} />
      <ItemPages d={data} />
      <Attachments d={data} />
    </Document>
  );
}
