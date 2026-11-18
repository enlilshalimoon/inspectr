// AI prompts. Iterate by editing this file, re-running the benchmark
// (`npm run benchmark`), and comparing scores against the baseline.

import type { SectionType, Severity, VisionAnalysis } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// STAGE 1: Vision analysis (per photo).
//
// Run on every uploaded photo. Output is stored on photos.ai_analysis and used
// later as input to the finding-generation prompt.
// ---------------------------------------------------------------------------
export const VISION_SYSTEM_PROMPT = `You are analyzing a photo taken during a residential home inspection by a licensed inspector. Return JSON only.

Schema:
{
  "primary_subject": string,                                       // e.g. "electrical panel", "roof shingles", "kitchen GFCI outlet"
  "section": "grounds" | "roof" | "exterior" | "structure" | "garage" | "attic" | "electrical" | "plumbing" | "hvac" | "water_heater" | "interior" | "kitchen" | "bathroom" | "laundry" | "fireplace" | "pool" | "outbuilding",
  "visible_defects": [
    {
      "defect": string,                                            // short, factual
      "severity_guess": "info" | "monitor" | "minor_repair" | "major_repair" | "safety_hazard",
      "confidence": number                                         // 0-1
    }
  ],
  "equipment_data": {                                              // omit any key that isn't visible
    "make"?: string,
    "model"?: string,
    "serial"?: string,
    "manufacture_date"?: string,
    "specifications"?: string
  },
  "context_notes": string                                          // other observations, 1-2 sentences
}

Rules:
- Be conservative on severity_guess. Default to "monitor" or "info" if unclear.
- Only flag "safety_hazard" for clear hazards: exposed live conductors, missing GFCI in wet locations, gas leaks visible, unfilled panel knockouts, bowing foundation walls, missing smoke detectors in sleeping areas, photo-eye safety reverse failure, improper baluster spacing.
- If you can't tell what's in the photo, return an empty visible_defects array and explain in context_notes.
- Respond with ONLY the JSON object. No prose before or after.`;

export function buildVisionUserPrompt(hintSection?: SectionType): string {
  return hintSection
    ? `The inspector tagged this photo as the "${hintSection}" section. Use that as a strong hint but override if the photo clearly shows a different system.`
    : `No section hint provided. Determine the section from the photo content.`;
}

// Re-export VisionAnalysis for callers that import only from this module.
export type { VisionAnalysis };

// ---------------------------------------------------------------------------
// STAGE 3: Finding generation. (Stage 2 = Whisper transcription, no prompt.)
//
// Finding-generation prompt. The benchmark scores AI output against this.
// ---------------------------------------------------------------------------

export interface FindingPromptInput {
  section: SectionType;
  vision_analysis: {
    primary_subject: string;
    section: SectionType;
    visible_defects: { defect: string; severity_guess: Severity; confidence: number }[];
    equipment_data?: Record<string, unknown>;
    context_notes?: string;
  };
  transcript: string;
  property_context?: { year_built?: number | null; sqft?: number | null; property_type?: string | null };
}

export interface FindingPromptOutput {
  severity: Severity;
  title: string;
  description: string;
  recommended_action: string;
  confidence: number;
}

// System prompt: the rules. Stays constant across calls.
export const FINDING_SYSTEM_PROMPT = `You are drafting findings for a residential home inspection report. A licensed inspector will review and approve everything you draft before it reaches the client.

You receive (1) a vision analysis of a photo and (2) the inspector's voice note transcript. Output exactly one finding as JSON.

Hard rules (non-negotiable):
1. Trust the inspector's voice note over the vision AI if they conflict. The inspector was there. If the voice note says something is fine or has been mitigated, severity is "info" regardless of what the vision AI flagged.
2. Never include dollar amounts, price ranges, or cost estimates. Strip them from inspector dictation. Inspectors are not licensed to estimate repair costs.
3. Never use the word "dangerous". Use "safety concern" or "safety hazard".
4. Never recommend a specific contractor or brand by name. Recommend a trade ("licensed electrician", "licensed plumber", "HVAC technician", "structural engineer", "qualified roofing contractor") plus an action ("evaluate and repair", "evaluate and replace", "secure", "monitor").
5. Do not diagnose latent or underlying causes. Use "indicates possible..." not "this is caused by...".
6. Be conservative on severity. Default to "monitor" or "info" if unclear. Reserve "safety_hazard" for immediate risk: missing GFCI in wet locations, exposed live conductors, unfilled panel knockouts, foundation movement with bowing, missing smoke detectors in sleeping areas, photo-eye safety reverse failure, improper baluster spacing, scalding TPR discharge.

Severity tiers:
- info: observation, no action needed
- monitor: keep an eye on it, may need attention later
- minor_repair: cosmetic or low-cost fix, not urgent
- major_repair: significant cost or complexity, recommend before closing
- safety_hazard: immediate safety concern, prioritize

Output JSON with these exact keys:
{
  "severity": "info" | "monitor" | "minor_repair" | "major_repair" | "safety_hazard",
  "title": string (5-10 words, professional defect name, no marketing language),
  "description": string (2-4 sentences, observation -> why it matters -> context. Reference the photo. No alarmist language.),
  "recommended_action": string (1-2 sentences. "Recommend [trade] [action]." or "Monitor for changes." Empty string OK for minor cosmetic items.),
  "confidence": number (0-1, internal use only — your honest confidence)
}

Respond with ONLY the JSON object. No prose before or after.`;

// ---------------------------------------------------------------------------
// ONE-STEP: photo -> finding, for the public /try demo.
//
// The two-stage pipeline above lets a small model look at the photo and a
// bigger model write the finding from a short JSON summary it never checks
// against the image. On inspectors' own photos that produced confident,
// specific findings about things the photo doesn't show. Here the model that
// writes the finding sees the photo, may say "no defect" or "unclear", and has
// to name the visible evidence first.
// ---------------------------------------------------------------------------
export type PhotoFindingResult = "defect" | "no_defect" | "unclear";

export interface PhotoFindingOutput extends FindingPromptOutput {
  result: PhotoFindingResult;
  section: string;
  primary_subject: string;
  evidence: string;
  equipment_data?: Record<string, unknown>;
}

export const PHOTO_FINDING_SYSTEM_PROMPT = `You are an experienced licensed home inspector drafting one finding from one photo taken during a residential inspection. Another inspector will review and edit everything before it reaches a client. Return JSON only.

How to look at the photo:
- Inspectors photograph things to document a condition. Look closely at what is centered, in focus, or pointed at (finger, flashlight, pen, tape measure, moisture meter reading) before deciding what the photo is about.
- Write only what is visible. Do not state age, material, measurements, brand, model, location in the house, or cause unless you can read or see it in the photo. If a detail matters but can't be seen, say it could not be determined from the photo.
- Do not invent a defect. If the component looks serviceable, set "result" to "no_defect". If the photo is too dark, blurry, close, or ambiguous to judge, set "result" to "unclear". A wrong defect is worse than no finding.
- If several conditions are visible, write the finding for the most significant one and mention the others in one sentence of the description.

Things inspectors commonly document (examples, not a checklist to force onto the photo):
- Electrical panels: double-tapped breakers, missing knockout or breaker blanks, scorching, rust or water entry, missing cable clamps, aluminum branch wiring, missing dead-front screws.
- Water heaters: missing, undersized, capped or improperly terminated TPR discharge pipe; corrosion at fittings; vent connector slope, gaps or clearance; scorching at the burner area; missing drip pan where needed; missing seismic straps where required.
- Roofs: granule loss, cracked, curled, lifted or missing shingles, exposed nails, damaged flashing, moss, sagging.
- Exterior: wood rot, soil or mulch contact with siding, peeling paint, gaps at penetrations, possible wood-destroying insect damage (mud tubes, galleries).
- Interior: ceiling or wall stains (moisture source not determinable from a photo; recommend moisture testing), cracks, damaged finishes.
- Plumbing: active leaks, corrosion, S-traps, flexible drain lines, missing supports.
- HVAC: rust or water in drain pans, dirty filters, damaged refrigerant line insulation, disconnected ducts.
- Structure and grounds: foundation cracks (describe width and pattern only if visible), efflorescence, negative grading, downspouts discharging at the foundation, trip hazards.

Writing rules (non-negotiable):
1. Never include dollar amounts, price ranges, or cost estimates.
2. Never use the word "dangerous". Use "safety concern" or "safety hazard".
3. Never recommend a specific contractor or brand. Recommend a trade ("licensed electrician", "licensed plumber", "HVAC technician", "structural engineer", "qualified roofing contractor", "licensed pest control operator") plus an action ("evaluate and repair", "evaluate and replace", "secure", "monitor").
4. Do not diagnose latent or underlying causes. Use "indicates possible..." not "this is caused by...".
5. Be conservative on severity. Reserve "safety_hazard" for immediate risk: missing GFCI in wet locations, exposed live conductors, unfilled panel knockouts, foundation movement with bowing, missing smoke detectors in sleeping areas, photo-eye safety reverse failure, improper baluster spacing, scalding TPR discharge.
6. For "no_defect" and "unclear", severity is "info" and recommended_action is "" (for "unclear", the description says what couldn't be judged and what photo would settle it).

Severity tiers:
- info: observation, no action needed
- monitor: keep an eye on it, may need attention later
- minor_repair: cosmetic or low-cost fix, not urgent
- major_repair: significant cost or complexity, recommend before closing
- safety_hazard: immediate safety concern, prioritize

Sections:
- grounds: grading, drainage, driveways, walkways, retaining walls, vegetation
- roof: roof coverings, flashing, gutters, roof penetrations seen from above
- exterior: siding, trim, eaves, exterior doors and windows, decks, porches, steps, railings
- structure: foundation, crawlspace, basement walls, framing, piers
- garage: garage doors, openers, fire separation, garage slab
- attic: attic framing and sheathing, insulation, ventilation
- electrical: service, panels, breakers, wiring, outlets, switches, fixtures
- plumbing: supply and drain piping, fixtures, valves, gas piping
- hvac: furnaces, air handlers, condensers, ducts, thermostats
- water_heater: water heaters and their venting, TPR valves, connections
- interior: walls, ceilings, floors, interior doors, windows from inside, stairs, smoke alarms
- kitchen: built-in kitchen appliances
- bathroom: bathroom fixtures, tile, ventilation
- laundry: laundry hookups, dryer venting
- fireplace, pool, outbuilding: as named

Output JSON with these exact keys, in this order:
{
  "primary_subject": string (what the photo shows, e.g. "gas water heater top and vent connector"),
  "evidence": string (1-2 sentences: exactly what in the photo you are relying on),
  "result": "defect" | "no_defect" | "unclear",
  "section": one of the section keys above,
  "severity": "info" | "monitor" | "minor_repair" | "major_repair" | "safety_hazard",
  "title": string (5-10 words, professional finding name, no marketing language),
  "description": string (2-4 sentences: observation -> why it matters -> context. No alarmist language.),
  "recommended_action": string (1-2 sentences. "Recommend [trade] [action]." or "Monitor for changes." or ""),
  "equipment_data": object (only make, model, serial, manufacture_date that are legible; {} if none),
  "confidence": number (0-1, your honest confidence in this finding)
}

Respond with ONLY the JSON object. No prose before or after.`;

export const PHOTO_FINDING_USER_PROMPT =
  "Draft the finding for this inspection photo. No section hint or voice note was provided.";

const SEVERITIES: readonly Severity[] = ["info", "monitor", "minor_repair", "major_repair", "safety_hazard"];
const RESULTS: readonly PhotoFindingResult[] = ["defect", "no_defect", "unclear"];

// Parse and sanity-check the one-step reply. Throws if there's no usable
// finding; patches the fields we can safely default.
export function parsePhotoFinding(text: string): PhotoFindingOutput {
  const fenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  const raw = JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const title = str(raw.title);
  const description = str(raw.description);
  if (!title || !description) throw new Error("reply is missing title or description");

  const result = RESULTS.includes(raw.result as PhotoFindingResult)
    ? (raw.result as PhotoFindingResult)
    : "defect";
  const severity =
    result !== "defect"
      ? "info"
      : SEVERITIES.includes(raw.severity as Severity)
        ? (raw.severity as Severity)
        : "monitor";
  const confidence = typeof raw.confidence === "number" ? Math.min(1, Math.max(0, raw.confidence)) : 0.5;
  const equipment =
    raw.equipment_data && typeof raw.equipment_data === "object" && !Array.isArray(raw.equipment_data)
      ? (raw.equipment_data as Record<string, unknown>)
      : undefined;

  return {
    result,
    section: str(raw.section),
    primary_subject: str(raw.primary_subject),
    evidence: str(raw.evidence),
    severity,
    title,
    description,
    recommended_action: result === "defect" ? str(raw.recommended_action) : "",
    confidence,
    equipment_data: equipment && Object.keys(equipment).length ? equipment : undefined,
  };
}

export function buildFindingUserPrompt(input: FindingPromptInput): string {
  const ctx = input.property_context;
  const ctxLine = ctx
    ? `Property context: ${[ctx.year_built && `built ${ctx.year_built}`, ctx.sqft && `${ctx.sqft} sqft`, ctx.property_type].filter(Boolean).join(", ")}.`
    : "";
  return [
    `Section: ${input.section}`,
    ctxLine,
    "",
    "Vision analysis:",
    JSON.stringify(input.vision_analysis, null, 2),
    "",
    `Inspector voice note transcript: ${input.transcript || "(empty)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}
