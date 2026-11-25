// Anthropic helpers used by the AI API routes.
//
// Vision model: claude-haiku-4-5 (cheap, fast, good enough for per-photo triage)
// Drafting model: claude-sonnet-4-6 (better prose + severity judgment)
// Photo-finding model (/try demo, one step, sees the photo): drafting model by default

import Anthropic from "@anthropic-ai/sdk";
import {
  FINDING_SYSTEM_PROMPT,
  PHOTO_FINDING_SYSTEM_PROMPT,
  PHOTO_FINDING_USER_PROMPT,
  VISION_SYSTEM_PROMPT,
  buildFindingUserPrompt,
  buildVisionUserPrompt,
  parsePhotoFindings,
  type FindingPromptInput,
  type PhotoFindingsOutput,
  type VisionAnalysis,
} from "./prompts";
import { normalizeDrafts, type DraftedFinding } from "./multi-defect";

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  return new Anthropic({ apiKey: key });
}

const VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL ?? "claude-haiku-4-5-20251001";
const DRAFTING_MODEL = process.env.ANTHROPIC_DRAFTING_MODEL ?? "claude-sonnet-4-6";
const PHOTO_FINDING_MODEL = process.env.ANTHROPIC_PHOTO_FINDING_MODEL ?? DRAFTING_MODEL;

function stripJsonFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Vision analysis from a Supabase Storage signed URL.
// ---------------------------------------------------------------------------
export type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

// Identify the image from its actual bytes. We deliberately do NOT trust the
// stored content-type: that value comes from the browser's File.type at upload
// time, and phones lie about it often enough to matter (an iPhone HEIC labelled
// image/jpeg, a .png saved with a .jpg name). Claude rejects the whole request
// when the declared media type disagrees with the bytes, so a mislabelled photo
// used to fail with an opaque 502.
export function sniffMediaType(buf: Buffer): SupportedMediaType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("latin1", 0, 4) === "RIFF" &&
    buf.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.length >= 6 && buf.toString("latin1", 0, 4) === "GIF8") {
    return "image/gif";
  }
  return null;
}

// ISO base-media container (HEIC/HEIF/AVIF) — "ftyp" at offset 4, brand at 8.
function isoBrand(buf: Buffer): string | null {
  if (buf.length < 12 || buf.toString("latin1", 4, 8) !== "ftyp") return null;
  return buf.toString("latin1", 8, 12).trim().toLowerCase();
}

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"]);

// Thrown when the bytes aren't something Claude can read. Carries a message
// that is safe (and useful) to show the inspector verbatim — unlike a raw
// Anthropic 400, which is why the route checks for this type specifically.
export class UnsupportedImageError extends Error {
  readonly userFacing = true;
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedImageError";
  }
}

// A human-readable reason we can put in front of the inspector, instead of
// bubbling up Anthropic's raw 400.
function unsupportedImageMessage(buf: Buffer): string {
  const brand = isoBrand(buf);
  if (brand && HEIF_BRANDS.has(brand)) {
    return "This photo is in Apple's HEIC format, which can't be analyzed. Turn on Settings → Camera → Formats → Most Compatible on the iPhone, or re-take the photo, and it'll work.";
  }
  if (brand === "avif") {
    return "This photo is in AVIF format, which can't be analyzed. Re-take or re-save it as a JPEG.";
  }
  return "This file isn't a readable JPEG, PNG, WebP or GIF image, so it couldn't be analyzed.";
}

export async function analyzePhoto(
  imageUrl: string,
  hintSection?: FindingPromptInput["section"],
): Promise<VisionAnalysis> {
  // Fetch the image and re-send as base64. Anthropic's URL-source fetcher
  // can't follow Supabase's signed-URL redirects reliably, so we proxy.
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  return analyzeImageBytes(Buffer.from(await res.arrayBuffer()), hintSection);
}

// Same analysis from bytes already in memory (the public /try demo never stores
// the photo, so there's no URL to fetch).
export async function analyzeImageBytes(
  buf: Buffer,
  hintSection?: FindingPromptInput["section"],
): Promise<VisionAnalysis> {
  const b64 = buf.toString("base64");
  const mediaType = sniffMediaType(buf);
  if (!mediaType) throw new UnsupportedImageError(unsupportedImageMessage(buf));

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
// One step: the model that writes the findings looks at the photo itself
// (public /try demo). See PHOTO_FINDING_SYSTEM_PROMPT. Returns one draft per
// distinct defect, or a single no_defect / unclear draft.
//
// `create` is the Anthropic messages call. Tests pass a fake so they can prove
// the photo bytes are in the request without a live key.
// ---------------------------------------------------------------------------
export type PhotoModelReply = {
  stop_reason: string | null;
  content: { type: string; text?: string }[];
};

export type PhotoModelCreate = (
  params: Anthropic.MessageCreateParamsNonStreaming,
) => Promise<PhotoModelReply>;

export async function draftFindingsFromImage(
  buf: Buffer,
  create: PhotoModelCreate = (params) => client().messages.create(params),
): Promise<PhotoFindingsOutput> {
  const mediaType = sniffMediaType(buf);
  if (!mediaType) throw new UnsupportedImageError(unsupportedImageMessage(buf));

  const reply = await create({
    model: PHOTO_FINDING_MODEL,
    max_tokens: 2400,
    // Low temperature: inspection drafts should not embellish an intact surface.
    temperature: 0,
    system: PHOTO_FINDING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: buf.toString("base64") } },
          { type: "text", text: PHOTO_FINDING_USER_PROMPT },
        ],
      },
    ],
  });
  if (reply.stop_reason === "max_tokens") throw new Error("photo finding reply was cut off at max_tokens");

  const text = reply.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text ?? "")
    .join("");

  return parsePhotoFindings(text);
}

// ---------------------------------------------------------------------------
// Finding generation from vision + transcript. Capture still uses this: the
// drafting model does not see the photo. One photo can show several distinct
// defects, so this returns a list (see lib/ai/multi-defect.ts).
// ---------------------------------------------------------------------------
export async function draftFindings(input: FindingPromptInput): Promise<DraftedFinding[]> {
  const reply = await client().messages.create({
    model: DRAFTING_MODEL,
    max_tokens: 2000,
    system: FINDING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildFindingUserPrompt(input) }],
  });

  const text = reply.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const drafts = normalizeDrafts(JSON.parse(stripJsonFence(text)), input.section);
  if (!drafts.length) throw new Error("draft returned no usable findings");
  return drafts;
}
