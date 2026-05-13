// POST /api/ai/transcribe
// Body: { voice_note_id: string }
//
// Pulls audio from Supabase Storage, sends to OpenAI Whisper, saves the
// transcript onto voice_notes. Idempotent — won't re-transcribe if already
// completed.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const body = z.object({ voice_note_id: z.string().uuid() });

function client() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  return new OpenAI({ apiKey: key });
}

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: vn, error } = await supabase
    .from("voice_notes")
    .select("id, storage_path, transcript, transcript_status")
    .eq("id", parsed.data.voice_note_id)
    .maybeSingle();
  if (error || !vn) return NextResponse.json({ error: "voice note not found" }, { status: 404 });

  if (vn.transcript_status === "completed" && vn.transcript) {
    return NextResponse.json({ transcript: vn.transcript, reused: true });
  }

  // Pull the file. Signed URL is fine for a short-lived fetch.
  const { data: signed, error: signErr } = await supabase.storage
    .from("inspection-media")
    .createSignedUrl(vn.storage_path as string, 60 * 5);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "could not sign storage url" }, { status: 500 });
  }
  const res = await fetch(signed.signedUrl);
  if (!res.ok) return NextResponse.json({ error: "fetch audio failed" }, { status: 502 });
  const blob = new Blob([await res.arrayBuffer()], {
    type: res.headers.get("content-type") ?? "audio/webm",
  });
  const file = new File([blob], filenameFromPath(vn.storage_path as string), { type: blob.type });

  let transcript: string;
  try {
    const r = await client().audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
      response_format: "text",
    });
    // OpenAI SDK returns a string when response_format=text
    transcript = typeof r === "string" ? r : (r as { text: string }).text;
  } catch (err) {
    console.error("[whisper] failed:", err);
    await supabase
      .from("voice_notes")
      .update({ transcript_status: "failed" })
      .eq("id", vn.id);
    return NextResponse.json(
      { error: "transcription failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  await supabase
    .from("voice_notes")
    .update({ transcript, transcript_status: "completed" })
    .eq("id", vn.id);

  return NextResponse.json({ transcript, reused: false });
}

function filenameFromPath(p: string): string {
  const tail = p.split("/").pop() ?? "audio";
  return tail.includes(".") ? tail : `${tail}.webm`;
}
