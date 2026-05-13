// Anthropic helpers used by the AI API routes.
//
// Vision model: claude-haiku-4-5 (cheap, fast, good enough for per-photo triage)
// Drafting model: claude-sonnet-4-6 (better prose + severity judgment)

import Anthropic from "@anthropic-ai/sdk";
import {
  FINDING_SYSTEM_PROMPT,
  VISION_SYSTEM_PROMPT,
  buildFindingUserPrompt,
  buildVisionUserPrompt,
  type FindingPromptInput,
  type FindingPromptOutput,
  type VisionAnalysis,
} from "./prompts";

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  return new Anthropic({ apiKey: key });
}

const VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL ?? "claude-haiku-4-5-20251001";
const DRAFTING_MODEL = process.env.ANTHROPIC_DRAFTING_MODEL ?? "claude-sonnet-4-6";

function stripJsonFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Vision analysis from a Supabase Storage signed URL.
// ---------------------------------------------------------------------------
export async function analyzePhoto(
  imageUrl: string,
  hintSection?: FindingPromptInput["section"],
): Promise<VisionAnalysis> {
  // Fetch the image and re-send as base64. Anthropic's URL-source fetcher
  // can't follow Supabase's signed-URL redirects reliably, so we proxy.
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const b64 = buf.toString("base64");
  const mediaType = (res.headers.get("content-type") ?? "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif";

  const reply = await client().messages.create({
    model: VISION_MODEL,
    max_tokens: 600,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
          { type: "text", text: buildVisionUserPrompt(hintSection) },
        ],
      },
    ],
  });

  const text = reply.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return JSON.parse(stripJsonFence(text)) as VisionAnalysis;
}

// ---------------------------------------------------------------------------
// Finding generation from vision + transcript.
// ---------------------------------------------------------------------------
export async function draftFinding(input: FindingPromptInput): Promise<FindingPromptOutput> {
  const reply = await client().messages.create({
    model: DRAFTING_MODEL,
    max_tokens: 800,
    system: FINDING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildFindingUserPrompt(input) }],
  });

  const text = reply.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return JSON.parse(stripJsonFence(text)) as FindingPromptOutput;
}
