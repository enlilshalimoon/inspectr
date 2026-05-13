// Finding-generation prompt. The benchmark scores AI output against this.
// Iterate by editing this file, re-running the benchmark, and comparing scores.

import type { SectionType, Severity } from "@/lib/supabase/types";

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
