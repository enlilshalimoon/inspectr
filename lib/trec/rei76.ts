// TREC Property Inspection Report Form REI 7-6 (8/9/21): sections and items,
// text copied verbatim from the promulgated form (trec.texas.gov). 22 TAC
// §535.223 requires the form text to be reproduced exactly, so do not edit
// labels here except to follow a new TREC revision.

export const REI_FORM_ID = "REI 7-6 (8/9/21)";

export interface TrecItem {
  /** Stable id, e.g. "I.A". Stored in inspections.report_form. */
  id: string;
  letter: string;
  label: string;
  /** Italic data-entry labels printed above "Comments:" (verbatim, incl. colon). */
  fields: string[];
  /** "Other" subsections may be left off the report (22 TAC §535.223). */
  isOther: boolean;
}

export interface TrecSection {
  roman: string;
  title: string;
  /** Section VI (Optional Systems): unused items may be deleted and the rest re-lettered. */
  optional: boolean;
  items: TrecItem[];
}

function items(
  roman: string,
  defs: [letter: string, label: string, fields?: string[]][],
): TrecItem[] {
  return defs.map(([letter, label, fields = []]) => ({
    id: `${roman}.${letter}`,
    letter,
    label,
    fields,
    isOther: label === "Other",
  }));
}

export const REI76_SECTIONS: TrecSection[] = [
  {
    roman: "I",
    title: "STRUCTURAL SYSTEMS",
    optional: false,
    items: items("I", [
      ["A", "Foundations", ["Type of Foundation(s):"]],
      ["B", "Grading and Drainage"],
      ["C", "Roof Covering Materials", ["Types of Roof Covering:", "Viewed From:"]],
      ["D", "Roof Structures and Attics", ["Viewed From:", "Approximate Average Depth of Insulation:"]],
      ["E", "Walls (Interior and Exterior)"],
      ["F", "Ceilings and Floors"],
      ["G", "Doors (Interior and Exterior)"],
      ["H", "Windows"],
      ["I", "Stairways (Interior and Exterior)"],
      ["J", "Fireplaces and Chimneys"],
      ["K", "Porches, Balconies, Decks, and Carports"],
      ["L", "Other"],
    ]),
  },
  {
    roman: "II",
    title: "ELECTRICAL SYSTEMS",
    optional: false,
    items: items("II", [
      ["A", "Service Entrance and Panels"],
      ["B", "Branch Circuits, Connected Devices, and Fixtures", ["Type of Wiring:"]],
      ["C", "Other"],
    ]),
  },
  {
    roman: "III",
    title: "HEATING, VENTILATION AND AIR CONDITIONING SYSTEMS",
    optional: false,
    items: items("III", [
      ["A", "Heating Equipment", ["Type of Systems:", "Energy Sources:"]],
      ["B", "Cooling Equipment", ["Type of Systems:"]],
      ["C", "Duct Systems, Chases, and Vents"],
      ["D", "Other"],
    ]),
  },
  {
    roman: "IV",
    title: "PLUMBING SYSTEMS",
    optional: false,
    items: items("IV", [
      [
        "A",
        "Plumbing Supply, Distribution Systems and Fixtures",
        [
          "Location of water meter:",
          "Location of main water supply valve:",
          "Static water pressure reading:",
          "Type of supply piping material:",
        ],
      ],
      ["B", "Drains, Wastes, and Vents", ["Type of drain piping material:"]],
      ["C", "Water Heating Equipment", ["Energy Sources:", "Capacity:"]],
      ["D", "Hydro-Massage Therapy Equipment"],
      [
        "E",
        "Gas Distribution Systems and Gas Appliances",
        ["Location of gas meter:", "Type of gas distribution piping material:"],
      ],
      ["F", "Other"],
    ]),
  },
  {
    roman: "V",
    title: "APPLIANCES",
    optional: false,
    items: items("V", [
      ["A", "Dishwashers"],
      ["B", "Food Waste Disposers"],
      ["C", "Range Hood and Exhaust Systems"],
      ["D", "Ranges, Cooktops, and Ovens"],
      ["E", "Microwave Ovens"],
      ["F", "Mechanical Exhaust Vents and Bathroom Heaters"],
      ["G", "Garage Door Operators"],
      ["H", "Dryer Exhaust Systems"],
      ["I", "Other"],
    ]),
  },
  {
    roman: "VI",
    title: "OPTIONAL SYSTEMS",
    optional: true,
    items: items("VI", [
      ["A", "Landscape Irrigation (Sprinkler) Systems"],
      ["B", "Swimming Pools, Spas, Hot Tubs, and Equipment", ["Type of Construction:"]],
      ["C", "Outbuildings"],
      ["D", "Private Water Wells (A coliform analysis is recommended.)", ["Type of Pump:", "Type of Storage Equipment:"]],
      ["E", "Private Sewage Disposal Systems", ["Type of System:", "Location of Drain Field:"]],
      ["F", "Other Built-in Appliances"],
      ["G", "Other"],
    ]),
  },
];

export const REI76_ITEMS: TrecItem[] = REI76_SECTIONS.flatMap((s) => s.items);
export const REI76_ITEM_IDS = new Set(REI76_ITEMS.map((i) => i.id));

export function trecItem(id: string): TrecItem | undefined {
  return REI76_ITEMS.find((i) => i.id === id);
}

export function sectionOfItem(id: string): TrecSection | undefined {
  return REI76_SECTIONS.find((s) => s.items.some((i) => i.id === id));
}
