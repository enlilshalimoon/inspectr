import type { SectionType } from "./types";

// Standard residential inspection sections (InterNACHI SOP).
// Every new inspection gets all required sections by default.
// Optional sections can be added later by the inspector.

export interface SectionDef {
  type: SectionType;
  label: string;
  required: boolean;
  order: number;
}

export const STANDARD_SECTIONS: readonly SectionDef[] = [
  { type: "grounds", label: "Grounds & Site", required: true, order: 10 },
  { type: "roof", label: "Roof", required: true, order: 20 },
  { type: "exterior", label: "Exterior", required: true, order: 30 },
  { type: "structure", label: "Structure & Foundation", required: true, order: 40 },
  { type: "garage", label: "Garage", required: true, order: 50 },
  { type: "attic", label: "Attic, Insulation & Ventilation", required: true, order: 60 },
  { type: "electrical", label: "Electrical", required: true, order: 70 },
  { type: "plumbing", label: "Plumbing", required: true, order: 80 },
  { type: "hvac", label: "HVAC", required: true, order: 90 },
  { type: "water_heater", label: "Water Heater", required: true, order: 100 },
  { type: "interior", label: "Interior", required: true, order: 110 },
  { type: "kitchen", label: "Kitchen Appliances", required: true, order: 120 },
  { type: "bathroom", label: "Bathrooms", required: true, order: 130 },
  { type: "laundry", label: "Laundry", required: true, order: 140 },
  { type: "fireplace", label: "Fireplace & Chimney", required: false, order: 150 },
  { type: "pool", label: "Pool & Spa", required: false, order: 160 },
  { type: "outbuilding", label: "Outbuildings", required: false, order: 170 },
] as const;

export const REQUIRED_SECTIONS = STANDARD_SECTIONS.filter((s) => s.required);

export function labelForSection(type: SectionType): string {
  return STANDARD_SECTIONS.find((s) => s.type === type)?.label ?? type;
}
