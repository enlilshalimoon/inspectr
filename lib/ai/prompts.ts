// AI prompts. Iterate by editing this file, re-running the benchmark
// (`npm run benchmark`), and comparing scores against the baseline.

import { MAX_FINDINGS_PER_PHOTO, sameDefect, severityRank } from "@/lib/ai/multi-defect";
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
  // Section this finding belongs in. Each defect in a multi-defect photo can
  // land in a different section (a water heater photo showing a gas-line issue).
  section?: SectionType;
  severity: Severity;
  title: string;
  description: string;
  recommended_action: string;
  confidence: number;
}

// System prompt: the rules. Stays constant across calls.
export const FINDING_SYSTEM_PROMPT = `You are drafting findings for a residential home inspection report. A licensed inspector will review and approve everything you draft before it reaches the client.

You receive (1) a vision analysis of a photo and (2) the inspector's voice note transcript. Output one finding per distinct defect as JSON.

One photo can show more than one defect (e.g. a water heater with a missing TPR discharge pipe AND a corroded gas connector). When it does:
- Write a separate finding for each distinct defect, each with its own section, severity, title, description and recommended action. A separate defect is one that needs a different repair, trade, or component.
- Do NOT split one defect into several findings. The same problem seen in more than one spot in the photo is one finding. Symptoms of one problem (stain + soft drywall below a leak) are one finding.
- Put each finding in the section where that defect belongs, even if it differs from the photo's section.
- At most 4 findings. If nothing is wrong, output a single "info" finding describing what the photo shows.
- The voice note wins here too: if the inspector names issues, draft those; if they say something is fine, drop it or make it "info"; if they say it's one issue, write one finding.

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

Output JSON with this exact shape:
{
  "findings": [
    {
      "section": "grounds" | "roof" | "exterior" | "structure" | "garage" | "attic" | "electrical" | "plumbing" | "hvac" | "water_heater" | "interior" | "kitchen" | "bathroom" | "laundry" | "fireplace" | "pool" | "outbuilding",
      "severity": "info" | "monitor" | "minor_repair" | "major_repair" | "safety_hazard",
      "title": string (5-10 words, professional defect name, no marketing language),
      "description": string (2-4 sentences, observation -> why it matters -> context. Reference the photo. No alarmist language.),
      "recommended_action": string (1-2 sentences. "Recommend [trade] [action]." or "Monitor for changes." Empty string OK for minor cosmetic items.),
      "confidence": number (0-1, internal use only — your honest confidence)
    }
  ]
}
Order findings most severe first.

Respond with ONLY the JSON object. No prose before or after.`;

// ---------------------------------------------------------------------------
// ONE-STEP: photo -> findings, for the public /try demo (/go redirects here).
//
// The two-stage pipeline above lets a small model look at the photo and a
// bigger model write the finding from a short JSON summary it never checks
// against the image. On inspectors' own photos that produced confident,
// specific findings about things the photo doesn't show. Here the model that
// writes the finding sees the photo, may say "no defect" or "unclear", may
// return one finding per distinct defect, and has to name the visible evidence
// first. Every finding is still a draft for the inspector to approve.
// ---------------------------------------------------------------------------
export type PhotoFindingResult = "defect" | "no_defect" | "unclear";

export interface PhotoFindingOutput extends Omit<FindingPromptOutput, "section"> {
  result: PhotoFindingResult;
  section: string;
  primary_subject: string;
  evidence: string;
  equipment_data?: Record<string, unknown>;
}

export interface PhotoFindingsOutput {
  result: PhotoFindingResult;
  primary_subject: string;
  evidence: string;
  equipment_data?: Record<string, unknown>;
  findings: PhotoFindingOutput[];
}

export const PHOTO_FINDING_SYSTEM_PROMPT = `You are an experienced licensed home inspector drafting findings from one photo taken during a residential inspection. Another inspector will review, edit, and approve every draft before it reaches a client. These are drafts. Return JSON only.

How to look at the photo:
- Inspectors photograph things to document a condition. Look closely at what is centered, in focus, or pointed at (finger, flashlight, pen, tape measure, moisture meter reading) before deciding what the photo is about.
- Write only what is visible. Do not state age, material, measurements, brand, model, location in the house, or cause unless you can read or see it in the photo. If a detail matters but can't be seen, say it could not be determined from the photo.
- Do not invent a defect. If the component looks serviceable, set "result" to "no_defect". If the photo is too dark, blurry, close, or ambiguous to judge, set "result" to "unclear". A wrong defect is worse than no finding.
- One photo can show more than one defect (different repair, trade, or component). Write a separate finding for each distinct defect, each with its own section and severity. The same problem seen in more than one spot is one finding. Symptoms of one problem (a stain and soft drywall from the same moisture) are one finding. At most 4 findings. Order them most severe first.
- If at least one real defect is visible, "result" is "defect" and "findings" lists only those defects. Do not add a no-defect finding for the rest of the photo, and do not invent a second defect to fill the list.
- For "no_defect" or "unclear", return exactly one finding.

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

Output JSON with this exact shape:
{
  "primary_subject": string (what the photo shows, e.g. "gas water heater top and vent connector"),
  "evidence": string (1-2 sentences: exactly what in the photo you are relying on, for every finding),
  "result": "defect" | "no_defect" | "unclear",
  "equipment_data": object (only make, model, serial, manufacture_date that are legible; {} if none),
  "findings": [
    {
      "section": one of the section keys above,
      "severity": "info" | "monitor" | "minor_repair" | "major_repair" | "safety_hazard",
      "title": string (5-10 words, professional finding name, no marketing language. For no_defect, say what was visible and that no defect is visible. For unclear, say the photo could not be judged.),
      "description": string (2-4 sentences: observation -> why it matters -> context. No alarmist language.),
      "recommended_action": string (1-2 sentences. "Recommend [trade] [action]." or "Monitor for changes." or "" for no_defect and unclear),
      "confidence": number (0-1, your honest confidence in this finding)
    }
  ]
}

Respond with ONLY the JSON object. No prose before or after.`;

export const PHOTO_FINDING_USER_PROMPT =
  "Draft the findings for this inspection photo. No section hint or voice note was provided. Return one finding per distinct visible defect, or a single no_defect or unclear finding.";

const SEVERITIES: readonly Severity[] = ["info", "monitor", "minor_repair", "major_repair", "safety_hazard"];
const RESULTS: readonly PhotoFindingResult[] = ["defect", "no_defect", "unclear"];

function extractJsonObject(text: string): Record<string, unknown> {
  const fenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;
}

function asResult(value: unknown): PhotoFindingResult {
  return RESULTS.includes(value as PhotoFindingResult) ? (value as PhotoFindingResult) : "defect";
}

function equipmentOf(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const equipment = raw.equipment_data;
  if (!equipment || typeof equipment !== "object" || Array.isArray(equipment)) return undefined;
  return Object.keys(equipment).length ? (equipment as Record<string, unknown>) : undefined;
}

// Parse and sanity-check the one-step reply. Accepts the findings-array shape
// and the older single-object shape. Throws if there's no usable finding.
// no_defect and unclear collapse to one info finding with no recommendation.
// Defects are deduped by title, ordered most severe first, and capped.
export function parsePhotoFindings(text: string): PhotoFindingsOutput {
  const raw = extractJsonObject(text);
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const list = Array.isArray(raw.findings) && raw.findings.length > 0 ? raw.findings : [raw];
  const fromItem = list.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
  const result = asResult(raw.result ?? fromItem?.result);
  const primary_subject = str(raw.primary_subject) || str(fromItem?.primary_subject);
  const evidence = str(raw.evidence) || str(fromItem?.evidence);
  const equipment_data = equipmentOf(raw) ?? (fromItem ? equipmentOf(fromItem) : undefined);

  const cleaned: PhotoFindingOutput[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = str(row.title);
    const description = str(row.description);
    if (!title || !description) continue;
    const severity: Severity =
      result !== "defect"
        ? "info"
        : SEVERITIES.includes(row.severity as Severity)
          ? (row.severity as Severity)
          : "monitor";
    const confidence = typeof row.confidence === "number" ? Math.min(1, Math.max(0, row.confidence)) : 0.5;
    cleaned.push({
      result,
      section: str(row.section) || str(raw.section),
      primary_subject,
      evidence,
      severity,
      title,
      description,
      recommended_action: result === "defect" ? str(row.recommended_action) : "",
      confidence,
      equipment_data,
    });
  }
  if (!cleaned.length) throw new Error("reply is missing title or description");

  const findings = collapseFindings(result, cleaned);
  return { result, primary_subject, evidence, equipment_data, findings };
}

function collapseFindings(result: PhotoFindingResult, cleaned: PhotoFindingOutput[]): PhotoFindingOutput[] {
  switch (result) {
    case "no_defect":
    case "unclear":
      return [{ ...cleaned[0], result, severity: "info", recommended_action: "" }];
    case "defect": {
      const ordered = [...cleaned].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
      const kept: PhotoFindingOutput[] = [];
      for (const finding of ordered) {
        if (kept.some((existing) => sameDefect(existing.title, finding.title))) continue;
        kept.push(finding);
      }
      return kept.slice(0, MAX_FINDINGS_PER_PHOTO);
    }
    default: {
      const exhaustive: never = result;
      throw new Error(`unexpected photo finding result: ${String(exhaustive)}`);
    }
  }
}

// Lead finding. Callers that only need one finding (and the older tests) use this.
export function parsePhotoFinding(text: string): PhotoFindingOutput {
  return parsePhotoFindings(text).findings[0];
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
