// Renders a sample REI 7-6 report to a local file for checking against
// TREC's official PDF (see scripts/trec/compare.py). No database needed.
//
//   npx tsx scripts/trec/render-sample.tsx /tmp/trec-sample.pdf [--blank]
//
// --blank renders the form with no data, for an overlay against the
// unfilled official form. --stress adds long comments, overflowing page-2
// text and a logo, to check page breaks and attachments.

import { renderToFile } from "@react-pdf/renderer";
import { TrecReportDoc } from "../../lib/pdf/trec/rei76-doc";
import { buildTrecReportData } from "../../lib/pdf/trec/build";
import { parseReportForm } from "../../lib/trec/form";

const out = process.argv[2] ?? "trec-sample.pdf";
const blank = process.argv.includes("--blank");
const stress = process.argv.includes("--stress");
const LONG = Array.from({ length: 14 }, (_, i) => `Sentence ${i + 1} of a long inspector note about this item.`).join(" ");

// 1x1 grey PNG stands in for photos.
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGO4BwAAzQDMXWmWuQAAAABJRU5ErkJggg==";

const form = parseReportForm(
  blank
    ? {}
    : {
        items: {
          "I.A": { i: true, fields: { "Type of Foundation(s):": "Slab on grade" }, comment: "No significant movement observed at the time of inspection." },
          "I.C": { fields: { "Types of Roof Covering:": "Composition shingles", "Viewed From:": "Roof surface" } },
          "I.D": { i: true, ni: true, comment: "Attic viewed from the hatch only; stored items blocked access to the north side." },
          "II.A": { i: true, comment: stress ? Array.from({ length: 8 }, () => LONG).join("\n") : undefined },
          "VI.A": { np: true },
          "VI.C": { removed: true },
          "VI.D": { removed: true },
        },
        additional_info: stress
          ? Array.from({ length: 6 }, () => LONG).join("\n\n")
          : "Inspection performed with the home vacant and all utilities on. Temperature 78°F, clear.",
        sponsor_name: "",
      },
);

const data = buildTrecReportData({
  form,
  findings: blank
    ? []
    : [
        {
          id: "f1",
          sectionType: "roof",
          title: "Cracked and lifted shingles at south slope",
          description: "Several shingles near the ridge are cracked and lifted, which can let water in during wind-driven rain.",
          recommended_action: "Recommend a qualified roofing contractor evaluate and repair.",
          severity: "minor_repair",
          is_approved: true,
          photoData: PHOTO,
        },
        {
          id: "f2",
          sectionType: "electrical",
          title: "Missing GFCI protection at kitchen receptacles",
          description: "Countertop receptacles did not trip when tested and have no upstream GFCI protection.",
          recommended_action: "Recommend a licensed electrician evaluate and repair.",
          severity: "safety_hazard",
          is_approved: true,
          photoData: PHOTO,
        },
      ],
  clientName: blank ? null : "Jane Buyer",
  inspectionDate: blank ? null : "2026-10-14",
  propertyAddress: blank ? "" : "123 Main St, Beeville, TX 78102",
  inspectorName: blank ? "" : "Sample Inspector",
  inspectorLicense: blank ? null : "12345",
  logoData: stress ? PHOTO : null,
});

renderToFile(<TrecReportDoc data={data} />, out).then(() => console.log("wrote", out));
