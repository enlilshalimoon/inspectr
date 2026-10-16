// Report compliance text: the standard of practice, the universal
// limitations statement, and per-state add-ons. Source research and
// citations: docs/state-report-rules-2026-10-15.md.
//
// Statutory statements are quoted verbatim from the rule text (fetched
// 2026-10-15). Don't reword them. Where a rule requires a statement but not
// its wording (KY), the wording is ours and says so in a comment.

import type { Severity } from "@/lib/supabase/types";

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// Licensed states whose board sets the standard of practice by rule. In the
// rest (unlicensed states, PA, and KY, where the inspector picks ASHI or
// InterNACHI at licensure) the default is InterNACHI's SOP, which the
// inspector can change in Settings.
const STATE_SET_SOP = new Set([
  "AL", "AZ", "CT", "DE", "FL", "IL", "IN", "LA", "MD", "MA", "MS", "NV", "NH",
  "NJ", "NY", "NC", "OH", "OK", "OR", "RI", "TN", "VT", "VA", "WA", "WI",
]);

export function defaultSop(licenseState: string | null | undefined): string {
  const st = normState(licenseState);
  if (st && STATE_SET_SOP.has(st)) {
    return `the ${STATE_NAMES[st]} standards of practice for home inspectors`;
  }
  return "the InterNACHI Home Inspection Standards of Practice";
}

// Universal limitations statement (research doc, "What Lookover's PDF must
// add", item 7). Shown on every report, before any inspector disclaimer.
export const STANDARD_LIMITATIONS: readonly string[] = [
  "This inspection is a visual, non-invasive examination of the readily accessible systems and components of the property, as they appeared at the date and time of the inspection. It is not technically exhaustive.",
  "Conditions that were concealed, latent, or not readily accessible (behind finished surfaces, under floor coverings, inside walls, or blocked by stored items) are outside the scope of this inspection.",
  "This report is not a warranty, guarantee, or insurance policy, is not an appraisal, and is not a building code compliance inspection.",
  "Environmental hazards (such as radon, mold, asbestos, and lead-based paint) are excluded unless separately contracted.",
  "This report does not include estimates of repair costs. Obtain estimates from qualified contractors.",
];

export interface StatePack {
  state: string;
  title: string;
  // Fixed statements. `conspicuous` = render bold in a bordered box (PA).
  statements: { text: string; conspicuous?: boolean }[];
  // Which summary page this state needs, if any.
  summary?: "nc" | "wi";
  // PA §7508(a)(2): unreasonable-risk material defects must be conspicuously identified.
  flagUnreasonableRisk?: boolean;
  // KY KRS 198B.706(1)(b): exclusions must be listed with specificity.
  listExclusions?: boolean;
}

// G.S. 143-151.58(a1), verbatim.
export const NC_SUMMARY_STATEMENT =
  "This summary page is not the entire report. The complete report may include additional information of interest or concern to you. It is strongly recommended that you promptly read the complete report. For information regarding the negotiability of any item in this report under the real estate purchase contract, contact your North Carolina real estate agent or an attorney.";

// Wis. Stat. 440.975(3)(cr)3., verbatim (both statements).
export const WI_SUMMARY_STATEMENTS = [
  "NOTE: This summary page is provided for convenience and is not a substitute for reading the entire report and should not be relied upon as the complete list for the client’s reference.",
  "For the purposes of the report, “defect,” as defined in section 440.97 (2m), Wis. Stats., means a condition of any component of an improvement that a home inspector determines, on the basis of the home inspector’s judgment on the day of an inspection, would significantly impair the health or safety of occupants of a property or that, if not repaired, removed, or replaced, would significantly shorten or adversely affect the expected normal life of the component of the improvement. The contract of sale may define “defect” to also include a condition that would have a significant adverse effect on the value of the property, but such a condition may not be labeled a defect in the report unless it meets the definition in section 440.97 (2m), Wis. Stats.",
];

// 18VAC15-40-130(F)(3), verbatim (the rule requires "the substance of" it).
export const VA_SMOKE_ALARM_STATEMENT =
  "It is recommended that a home have smoke alarms on each level of the dwelling and in every bedroom or sleeping area. Clients should replace any existing smoke alarms that are not in good working order with new ones and install smoke alarms where they may be missing or not properly located. Any test of a smoke alarm during a home inspection only reflects its condition at the time of inspection and is not a guarantee, warranty, or any form of insurance. A test performed during the home inspection does not supersede the smoke alarm manufacturer's testing recommendations. Clients should follow the manufacturer's instructions for proper placement, installation, and maintenance.";

// 18VAC15-40-130(G) / Va. Code §54.1-517.2:1, verbatim quoted statement.
export const VA_CSST_STATEMENT =
  "Manufacturers believe that this product is safer if properly bonded and grounded as required by the manufacturer's installation instructions. Proper bonding and grounding of the product should be determined by a contractor licensed to perform the work in the Commonwealth of Virginia.";

// 68 Pa.C.S. §7508(a)(3), verbatim, "set forth conspicuously".
export const PA_STATEMENTS = [
  "A home inspection is intended to assist in evaluation of the overall condition of the dwelling. The inspection is based on observation of the visible and apparent condition of the structure and its components on the date of inspection.",
  "The results of this home inspection are not intended to make any representation regarding the presence or absence of latent or concealed defects that are not reasonably ascertainable in a competently performed home inspection. No warranty or guaranty is expressed or implied.",
  "If the person conducting your home inspection is not a licensed structural engineer or other professional whose license authorizes the rendering of an opinion as to the structural integrity of a building or its other component parts, you may be advised to seek a professional opinion as to any defects or concerns mentioned in the report.",
  "This home inspection report is not to be construed as an appraisal and may not be used as such for any purpose.",
];

// KRS 198B.706(1)(b) requires "a statement that the home inspection report
// does not address environmental hazards" but prescribes no wording. Ours.
export const KY_ENVIRONMENTAL_STATEMENT =
  "This home inspection report does not address environmental hazards, including but not limited to radon, mold, asbestos, lead-based paint, formaldehyde, pesticides, underground storage tanks, and contaminated soil or water.";

// Standard exclusions listed for KY ("list all other exclusions with
// specificity"), in addition to the systems marked Not inspected.
export const STANDARD_EXCLUSIONS: readonly string[] = [
  "Areas and components that were not readily accessible, visible, or safe to reach at the time of inspection",
  "Concealed or latent conditions, including those behind walls, ceilings, floor coverings, and stored items",
  "Building code, zoning, and permit compliance",
  "Repair cost estimates and remaining life expectancy of components",
  "Well, septic, water quality, irrigation, and private sewage systems",
  "Security, intercom, low-voltage, solar, and home-automation systems",
  "Detached structures, pools, and spas, unless listed as Inspected in the systems inventory",
  "Wood-destroying organisms",
];

export function statePacks(
  states: (string | null | undefined)[],
  opts: { yearBuilt: number | null },
): StatePack[] {
  const set = new Set(states.map(normState).filter(Boolean) as string[]);
  const packs: StatePack[] = [];
  if (set.has("NC")) {
    packs.push({
      state: "NC",
      title: "North Carolina",
      statements: [],
      summary: "nc",
    });
  }
  if (set.has("VA")) {
    const statements: StatePack["statements"] = [{ text: VA_SMOKE_ALARM_STATEMENT }];
    // Applies when yellow CSST is observed in a home built before May 1, 2008.
    // We can't tell whether it was observed, so include it for pre-2008 or
    // unknown-age homes, prefaced so it reads correctly when none was seen.
    if (opts.yearBuilt == null || opts.yearBuilt <= 2008) {
      statements.push({
        text: `Yellow corrugated stainless steel tubing (CSST), where noted in this report: ${VA_CSST_STATEMENT}`,
      });
    }
    packs.push({ state: "VA", title: "Virginia", statements });
  }
  if (set.has("PA")) {
    packs.push({
      state: "PA",
      title: "Pennsylvania",
      statements: PA_STATEMENTS.map((text) => ({ text, conspicuous: true })),
      flagUnreasonableRisk: true,
    });
  }
  if (set.has("WI")) {
    packs.push({ state: "WI", title: "Wisconsin", statements: [], summary: "wi" });
  }
  if (set.has("KY")) {
    packs.push({
      state: "KY",
      title: "Kentucky",
      statements: [{ text: KY_ENVIRONMENTAL_STATEMENT }],
      listExclusions: true,
    });
  }
  return packs;
}

// NC summary: items not functioning as intended or needing further
// investigation by a specialist. Monitor and informational items stay in the
// body of the report.
export const NC_SUMMARY_SEVERITIES: readonly Severity[] = [
  "safety_hazard",
  "major_repair",
  "minor_repair",
];

// WI summary labels. Major repairs and safety hazards are labeled "Defect";
// the rest fall under the statute's "other than defects" list.
export const WI_SUMMARY_LABEL: Record<Severity, string> = {
  safety_hazard: "Defect",
  major_repair: "Defect",
  minor_repair: "Repair needed",
  monitor: "Monitor",
  info: "Maintenance / informational",
};

export const PA_UNREASONABLE_RISK_LABEL =
  "Material defect that poses an unreasonable risk to people on the property";

export function normState(s: string | null | undefined): string | null {
  const t = (s ?? "").trim().toUpperCase();
  return t.length === 2 ? t : null;
}
