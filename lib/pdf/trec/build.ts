// Turns the inspection + report_form + approved findings into the data the
// REI 7-6 document renders. Pure (no DB) so the sample script and tests can
// use it.

import {
  printedItems,
  resolveItems,
  type FindingForForm,
  type ReportForm,
} from "@/lib/trec/form";
import { REI76_SECTIONS } from "@/lib/trec/rei76";
import type { TrecReportData, TrecSectionData } from "./rei76-doc";

export interface TrecBuildInput {
  form: ReportForm;
  findings: (FindingForForm & {
    recommended_action: string | null;
    photoData?: string | null;
  })[];
  clientName: string | null;
  inspectionDate: string | null;
  propertyAddress: string;
  inspectorName: string;
  inspectorLicense: string | null;
  logoData: string | null;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function formatTrecDate(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

export function buildTrecReportData(input: TrecBuildInput): TrecReportData {
  const { form } = input;
  const resolved = printedItems(resolveItems(form, input.findings));
  const findingById = new Map(input.findings.map((f) => [f.id, f]));

  // Photos are numbered in form order so "See Photo 3" reads naturally.
  const photos: TrecReportData["photos"] = [];
  const sections: TrecSectionData[] = [];
  for (const sec of REI76_SECTIONS) {
    const rows = resolved.filter((r) => sec.items.includes(r.item));
    if (!rows.length) continue;
    sections.push({
      roman: sec.roman,
      title: sec.title,
      items: rows.map((r, idx) => {
        // Section VI items that were deleted leave the rest re-lettered (22 TAC §535.223).
        const letter = sec.optional ? LETTERS[idx] : r.item.letter;
        return {
          letter,
          label: r.item.label,
          boxes: r.boxes,
          comment: r.entry.comment ?? "",
          fields: r.item.fields.map((label) => ({
            label,
            value: r.entry.fields?.[label]?.trim() ?? "",
          })),
          findings: r.findingIds.map((id) => {
            const f = findingById.get(id)!;
            let photoNo: number | null = null;
            if (f.photoData) {
              photoNo = photos.length + 1;
              photos.push({
                no: photoNo,
                data: f.photoData,
                caption: `${sec.roman}.${letter} ${r.item.label}: ${f.title}`,
              });
            }
            return {
              title: f.title,
              description: f.description,
              recommended_action: f.recommended_action,
              photoNo,
            };
          }),
        };
      }),
    });
  }

  return {
    clientName: input.clientName ?? "",
    inspectionDate: formatTrecDate(input.inspectionDate),
    propertyAddress: input.propertyAddress,
    inspectorName: input.inspectorName,
    inspectorLicense: input.inspectorLicense ?? "",
    sponsorName: form.sponsor_name?.trim() ?? "",
    sponsorLicense: form.sponsor_license?.trim() ?? "",
    logoData: input.logoData,
    additionalInfo: form.additional_info?.trim() ?? "",
    sections,
    photos,
  };
}
