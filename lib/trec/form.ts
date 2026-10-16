// TREC REI 7-6 report state: what the inspector set on the Review page, plus
// the draft we derive from approved findings. Pure functions only (unit
// tested in form.test.ts); the DB read/write lives in the review actions and
// lib/pdf/render.tsx.
//
// Storage: inspections.report_form (jsonb, migration 0005):
//   {
//     use_trec?: boolean,              // default true for TX inspectors
//     items: { "I.A": ItemEntry, ... }, // only items the inspector touched
//     finding_items: { <finding id>: "I.C" }, // inspector's re-assignments
//     additional_info?: string,        // page 2 box
//     sponsor_name?: string, sponsor_license?: string,
//   }

import type { Finding, SectionType } from "@/lib/supabase/types";
import { REI76_ITEMS, REI76_ITEM_IDS, type TrecItem } from "./rei76";

export type CheckBox = "i" | "ni" | "np" | "d";
export const CHECKBOXES: CheckBox[] = ["i", "ni", "np", "d"];
export const CHECKBOX_LABEL: Record<CheckBox, string> = {
  i: "I",
  ni: "NI",
  np: "NP",
  d: "D",
};

export interface ItemEntry {
  i?: boolean;
  ni?: boolean;
  np?: boolean;
  d?: boolean;
  comment?: string;
  /** Values for the item's italic fields, keyed by the field label. */
  fields?: Record<string, string>;
  /** Leave this item off the report (only "Other" and Section VI items). */
  removed?: boolean;
}

export interface ReportForm {
  use_trec?: boolean;
  items: Record<string, ItemEntry>;
  finding_items: Record<string, string>;
  additional_info?: string;
  sponsor_name?: string;
  sponsor_license?: string;
}

export function parseReportForm(raw: unknown): ReportForm {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ReportForm>;
  return {
    ...r,
    items: r.items && typeof r.items === "object" ? r.items : {},
    finding_items: r.finding_items && typeof r.finding_items === "object" ? r.finding_items : {},
  };
}

/** TX license → the promulgated form is the deliverable (unless the inspector opts out). */
export function isTexasLicense(state: string | null | undefined): boolean {
  const s = (state ?? "").trim().toLowerCase();
  return s === "tx" || s === "texas";
}

export function usesTrecForm(licenseState: string | null | undefined, form: ReportForm): boolean {
  return isTexasLicense(licenseState) && form.use_trec !== false;
}

// ---------------------------------------------------------------------------
// Finding → REI 7-6 item. Lookover sections are broader than TREC items, so
// keywords in the finding pick the item; the section gives the fallback.
// The inspector can move any finding to another item on the Review page.
// ---------------------------------------------------------------------------

type Rule = [RegExp, string];

const KEYWORD_RULES: Partial<Record<SectionType, Rule[]>> = {
  grounds: [
    [/irrigation|sprinkler/, "VI.A"],
    [/\b(deck|porch|balcon|carport|patio cover)/, "I.K"],
    [/\b(stair|steps?)\b/, "I.I"],
    [/\b(well)\b/, "VI.D"],
    [/septic|drain field|aerobic/, "VI.E"],
    [/gas meter|gas line|gas pip/, "IV.E"],
  ],
  roof: [
    [/attic|truss|rafter|decking|sheathing|insulation|purlin|ridge beam|collar/, "I.D"],
    [/chimney|flue/, "I.J"],
  ],
  exterior: [
    [/window|glazing|screen/, "I.H"],
    [/\bdoors?\b/, "I.G"],
    [/\b(deck|porch|balcon|carport)/, "I.K"],
    [/\b(stair|steps?)\b|baluster|handrail|guardrail/, "I.I"],
    [/grading|drainage|gutter|downspout|slope/, "I.B"],
    [/receptacle|outlet|gfci|light fixture|wiring/, "II.B"],
    [/hose bib|spigot|faucet/, "IV.A"],
    [/gas meter|gas line|gas pip/, "IV.E"],
    [/foundation|slab|pier|beam/, "I.A"],
  ],
  structure: [
    [/grading|drainage/, "I.B"],
    [/floor|joist|subfloor/, "I.F"],
    [/\bwalls?\b/, "I.E"],
  ],
  garage: [
    [/opener|operator|auto[- ]?reverse|photo[- ]?eye|safety sensor/, "V.G"],
    [/\bdoors?\b|fire[- ]rated|self[- ]clos/, "I.G"],
    [/receptacle|outlet|gfci|wiring|light/, "II.B"],
    [/water heater/, "IV.C"],
    [/slab|floor|crack/, "I.F"],
    [/\bwalls?\b|ceiling|drywall|firewall/, "I.E"],
  ],
  attic: [],
  electrical: [
    [/panel|breaker|service|meter|main disconnect|bonding|grounding|ground rod|subpanel|sub-panel/, "II.A"],
    [/.*/, "II.B"],
  ],
  plumbing: [
    [/\bdrain|waste|vent|sewer|trap|clean[- ]?out/, "IV.B"],
    [/\bgas\b|csst/, "IV.E"],
    [/whirlpool|jetted|hydro[- ]?massage|jacuzzi/, "IV.D"],
    [/water heater|tpr|t&p/, "IV.C"],
  ],
  hvac: [
    [/duct|plenum|register|return|chase|vent/, "III.C"],
    [/cool|condens|evaporator|\ba\/?c\b|air condition|refrigerant|heat pump|compressor|drain pan|condensate/, "III.B"],
  ],
  water_heater: [[/gas\b|gas line|csst/, "IV.E"]],
  interior: [
    [/smoke (alarm|detector)|carbon monoxide|\bco (alarm|detector)/, "II.B"],
    [/receptacle|outlet|gfci|afci|switch|light|fixture|ceiling fan/, "II.B"],
    [/window|glazing/, "I.H"],
    [/\bdoors?\b/, "I.G"],
    [/\b(stair|steps?)\b|baluster|handrail|guardrail/, "I.I"],
    [/fireplace|chimney|damper|hearth/, "I.J"],
    [/ceiling|floor/, "I.F"],
    [/register|duct|return/, "III.C"],
  ],
  kitchen: [
    [/dishwasher/, "V.A"],
    [/dispos/, "V.B"],
    [/hood|exhaust/, "V.C"],
    [/microwave/, "V.E"],
    [/range|cooktop|oven|stove|burner/, "V.D"],
    [/refrigerator|ice maker|wine|trash compactor/, "VI.F"],
    [/receptacle|outlet|gfci|light/, "II.B"],
    [/sink|faucet|supply|leak|valve/, "IV.A"],
    [/\bdrain|trap/, "IV.B"],
  ],
  bathroom: [
    [/exhaust|vent fan|fan|heater/, "V.F"],
    [/whirlpool|jetted|hydro[- ]?massage|jacuzzi/, "IV.D"],
    [/\bdrain|trap|waste/, "IV.B"],
    [/receptacle|outlet|gfci|light/, "II.B"],
    [/window|glazing|safety glass/, "I.H"],
    [/\bdoors?\b/, "I.G"],
  ],
  laundry: [
    [/dryer|lint/, "V.H"],
    [/receptacle|outlet|gfci/, "II.B"],
    [/\bdrain|standpipe/, "IV.B"],
    [/\bgas\b/, "IV.E"],
    [/washer|supply|valve|hose|faucet/, "IV.A"],
  ],
  fireplace: [],
  pool: [],
  outbuilding: [],
};

const SECTION_DEFAULT: Record<SectionType, string> = {
  grounds: "I.B",
  roof: "I.C",
  exterior: "I.E",
  structure: "I.A",
  garage: "I.L",
  attic: "I.D",
  electrical: "II.A",
  plumbing: "IV.A",
  hvac: "III.A",
  water_heater: "IV.C",
  interior: "I.E",
  kitchen: "V.I",
  bathroom: "IV.A",
  laundry: "V.H",
  fireplace: "I.J",
  pool: "VI.B",
  outbuilding: "VI.C",
};

/** Best-guess REI 7-6 item for a finding in a Lookover section. */
export function suggestItemForFinding(
  sectionType: SectionType | null,
  finding: Pick<Finding, "title" | "description">,
): string {
  if (!sectionType) return "I.L";
  const text = `${finding.title} ${finding.description}`.toLowerCase();
  for (const [re, item] of KEYWORD_RULES[sectionType] ?? []) {
    if (re.test(text)) return item;
  }
  return SECTION_DEFAULT[sectionType] ?? "I.L";
}

/** The item a finding lands on: the inspector's choice, else the suggestion. */
export function itemForFinding(
  form: ReportForm,
  sectionType: SectionType | null,
  finding: Pick<Finding, "id" | "title" | "description">,
): string {
  const chosen = form.finding_items[finding.id];
  if (chosen && REI76_ITEM_IDS.has(chosen)) return chosen;
  return suggestItemForFinding(sectionType, finding);
}

// ---------------------------------------------------------------------------
// Checkbox drafting.
// An item with an approved deficiency-level finding is drafted I + D (TREC's
// instruction sheet: check both when an item is inspected and deficient).
// "Informational" findings only draft I — they are observations, not
// deficiencies. Every other item waits for the inspector.
// ---------------------------------------------------------------------------

export type FindingForForm = Pick<
  Finding,
  "id" | "title" | "description" | "severity" | "is_approved"
> & { sectionType: SectionType | null };

export interface ResolvedItem {
  item: TrecItem;
  boxes: Record<CheckBox, boolean>;
  /** "inspector" = set on the Review page; "draft" = derived from findings; "none" = needs a status. */
  source: "inspector" | "draft" | "none";
  entry: ItemEntry;
  findingIds: string[];
  removed: boolean;
}

export function hasAnyBox(e: Partial<Record<CheckBox, boolean | undefined>>): boolean {
  return CHECKBOXES.some((c) => !!e[c]);
}

export function canRemoveItem(item: TrecItem): boolean {
  return item.isOther || item.id.startsWith("VI.");
}

export function resolveItems(form: ReportForm, findings: FindingForForm[]): ResolvedItem[] {
  const byItem = new Map<string, FindingForForm[]>();
  for (const f of findings) {
    if (!f.is_approved) continue;
    const id = itemForFinding(form, f.sectionType, f);
    if (!byItem.has(id)) byItem.set(id, []);
    byItem.get(id)!.push(f);
  }

  return REI76_ITEMS.map((item) => {
    const entry = form.items[item.id] ?? {};
    const itemFindings = byItem.get(item.id) ?? [];
    const findingIds = itemFindings.map((f) => f.id);
    const removed = !!entry.removed && canRemoveItem(item) && findingIds.length === 0;

    if (hasAnyBox(entry)) {
      return {
        item,
        entry,
        findingIds,
        removed,
        source: "inspector" as const,
        boxes: { i: !!entry.i, ni: !!entry.ni, np: !!entry.np, d: !!entry.d },
      };
    }
    if (itemFindings.length) {
      const deficient = itemFindings.some((f) => f.severity !== "info");
      return {
        item,
        entry,
        findingIds,
        removed,
        source: "draft" as const,
        boxes: { i: true, ni: false, np: false, d: deficient },
      };
    }
    return {
      item,
      entry,
      findingIds,
      removed,
      source: "none" as const,
      boxes: { i: false, ni: false, np: false, d: false },
    };
  });
}

/**
 * Items that would print with no box checked. "Other" items with nothing in
 * them are simply left off (22 TAC §535.223 allows deleting them), so they
 * don't count.
 */
export function itemsMissingStatus(resolved: ResolvedItem[]): ResolvedItem[] {
  return resolved.filter((r) => !r.removed && r.source === "none" && !isEmptyOther(r));
}

export function isEmptyOther(r: ResolvedItem): boolean {
  return (
    r.item.isOther &&
    r.source === "none" &&
    r.findingIds.length === 0 &&
    !r.entry.comment?.trim() &&
    !Object.values(r.entry.fields ?? {}).some((v) => v?.trim())
  );
}

/** Items that print on the form (removed and empty "Other" items are dropped). */
export function printedItems(resolved: ResolvedItem[]): ResolvedItem[] {
  return resolved.filter((r) => !r.removed && !isEmptyOther(r));
}

/** Multiple boxes need an explanation in the item's comments (TREC instruction sheet). */
export function needsMultiBoxExplanation(r: ResolvedItem): boolean {
  const n = CHECKBOXES.filter((c) => r.boxes[c]).length;
  return n > 1 && r.source === "inspector" && !r.entry.comment?.trim() && r.findingIds.length === 0;
}

// ---------------------------------------------------------------------------
// No cost estimates in reports (Lookover rule). The TREC boilerplate mentions
// "cost estimates" from service professionals — that's fixed form text and is
// never run through this check; only inspector-entered text is.
// ---------------------------------------------------------------------------
const COST_RE =
  /\$\s?\d|\b\d[\d,.]*\s?(k\b|dollars?\b|usd\b|bucks\b)|\b(cost|price|estimate)[sd]?\s+(to|of|for|around|about|approximately|roughly)\s+(repair|replace|fix|\$|\d)|\b(repair|replacement)\s+(cost|estimate)s?\b/i;

export function containsCostEstimate(text: string | null | undefined): boolean {
  return !!text && COST_RE.test(text);
}
