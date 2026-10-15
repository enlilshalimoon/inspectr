"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  Mic,
  Square,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/utils/severity";
import type { SectionType, Severity } from "@/lib/supabase/types";

type AIStatus = "idle" | "processing" | "drafted" | "failed";

export type SectionOption = { id: string; type: SectionType; label: string };
export type CapturePhoto = {
  id: string;
  section_id: string | null;
  storage_path: string;
  url: string | null;
  status: "uploading" | "uploaded" | "failed";
  ai_status: AIStatus;
  finding?: {
    id: string;
    severity: Severity;
    title: string;
  } | null;
  voice?: {
    state: "idle" | "recording" | "uploading" | "transcribing" | "done" | "failed";
    transcript?: string;
    storage_path?: string;
    voice_note_id?: string;
    duration_seconds?: number;
    error?: string;
  };
  // For optimistic display
  localUrl?: string;
  // Kept so "Retry" can re-send the same photo instead of forcing a re-shoot.
  rawFile?: File;
  errorMessage?: string;
  aiErrorMessage?: string;
};

type Props = {
  inspectionId: string;
  userId: string;
  sections: SectionOption[];
  initialPhotos: CapturePhoto[];
};

export function CaptureClient({ inspectionId, userId, sections, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<CapturePhoto[]>(
    initialPhotos.map((p) => ({ ...p, ai_status: "idle", voice: { state: "idle" } })),
  );
  const [currentSectionId, setCurrentSectionId] = useState<string>(
    sections[0]?.id ?? "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Backfill: kick AI processing for any existing photo that hasn't been drafted yet.
  useEffect(() => {
    for (const p of initialPhotos) {
      if (p.status === "uploaded" && !p.finding) {
        void processPhotoAI(p.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patchPhoto(id: string, patch: Partial<CapturePhoto>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function processPhotoAI(photoId: string, regenerate = false) {
    patchPhoto(photoId, { ai_status: "processing", aiErrorMessage: undefined });
    try {
      const res = await fetch("/api/ai/process-photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo_id: photoId, regenerate }),
      });
      // A platform timeout or crash returns an HTML error page, not JSON.
      // Without the catch, the inspector saw a raw "Unexpected token '<'".
      const json = await res.json().catch(() => ({}));
      // The route sends `message` written for the inspector; `error` is the
      // internal label. Prefer the former so failures are actionable.
      if (!res.ok) {
        throw new Error(
          json.message ??
            (res.status >= 500
              ? "Drafting took too long or the server hiccuped. Tap Try again."
              : (json.error ?? "AI failed")),
        );
      }
      patchPhoto(photoId, {
        ai_status: "drafted",
        finding: json.finding ?? null,
        aiErrorMessage: undefined,
      });
    } catch (err) {
      console.error("[ai] failed for photo", photoId, err);
      patchPhoto(photoId, {
        ai_status: "failed",
        aiErrorMessage: err instanceof Error ? err.message : "Analysis failed.",
      });
    }
  }

  // ----- Photo upload -----------------------------------------------------
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      // Clear the input that actually fired (camera or library) so picking the
      // same file twice in a row still triggers a change event.
      e.target.value = "";
      for (const file of list) await uploadOne(file, currentSectionId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSectionId],
  );

  async function uploadOne(rawFile: File, sectionId: string) {
    const tempId = crypto.randomUUID();
    const localUrl = URL.createObjectURL(rawFile);

    setPhotos((prev) => [
      {
        id: tempId,
        section_id: sectionId || null,
        storage_path: "",
        url: null,
        localUrl,
        rawFile,
        status: "uploading",
        ai_status: "idle",
        voice: { state: "idle" },
      },
      ...prev,
    ]);

    try {
      // Normalize before upload: fixes iPhone HEIC (Safari can decode it even
      // though Claude can't read it), corrects EXIF rotation, and shrinks a
      // 4 MB camera original to a few hundred KB — which is most of the wait
      // on both the upload and the vision call.
      const file = await prepareImage(rawFile);
      const extension = guessExtension(file);
      const storagePath = `${userId}/${inspectionId}/${tempId}.${extension}`;

      const { error: uploadErr } = await supabase.storage
        .from("inspection-media")
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (uploadErr) throw uploadErr;

      const { data: row, error: insErr } = await supabase
        .from("photos")
        .insert({
          inspection_id: inspectionId,
          section_id: sectionId || null,
          storage_path: storagePath,
          taken_at: new Date().toISOString(),
          upload_status: "uploaded",
        })
        .select("id")
        .single();
      if (insErr || !row) throw insErr ?? new Error("insert failed");

      const { data: signed } = await supabase.storage
        .from("inspection-media")
        .createSignedUrl(storagePath, 60 * 60);

      const realId = row.id as string;
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
                ...p,
                id: realId,
                storage_path: storagePath,
                url: signed?.signedUrl ?? null,
                status: "uploaded",
                rawFile: undefined,
              }
            : p,
        ),
      );

      // Fire AI processing in the background.
      void processPhotoAI(realId);
    } catch (err) {
      console.error("upload failed:", err);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
                ...p,
                status: "failed",
                errorMessage: err instanceof Error ? err.message : String(err),
              }
            : p,
        ),
      );
    }
  }

  async function deletePhoto(photo: CapturePhoto) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    if (photo.storage_path) {
      await supabase.storage.from("inspection-media").remove([photo.storage_path]);
    }
    if (photo.status === "uploaded") {
      await supabase.from("photos").delete().eq("id", photo.id);
    }
  }

  async function retryUpload(photo: CapturePhoto) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    // Re-send the same photo. Used to reopen the camera, which forced a
    // re-shoot after a signal drop and was a dead end for library photos.
    if (photo.rawFile) {
      if (photo.localUrl) URL.revokeObjectURL(photo.localUrl);
      await uploadOne(photo.rawFile, photo.section_id ?? "");
      return;
    }
    fileInputRef.current?.click();
  }

  // ----- Voice recording --------------------------------------------------
  async function startRecording(photo: CapturePhoto) {
    if (photo.voice?.state === "recording") return;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        patchPhoto(photo.id, {
          voice: {
            state: "failed",
            error: "Voice notes aren't supported in this browser. Try Safari or Chrome.",
          },
        });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Only pass a mimeType the browser says it supports. Forcing an
      // unsupported one throws on older iOS Safari; letting the browser pick
      // its default (audio/mp4 on iPhone) works and Whisper accepts it.
      const mimeType = pickAudioMime();
      let recorder: MediaRecorder;
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (err) {
        stream.getTracks().forEach((t) => t.stop());
        throw err;
      }
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const startedAt = Date.now();
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const duration = Math.round((Date.now() - startedAt) / 1000);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        await uploadVoiceNote(photo, blob, duration);
      };
      recorder.start();
      recordersRef.current.set(photo.id, recorder);
      patchPhoto(photo.id, { voice: { state: "recording" } });
    } catch (err) {
      console.error("mic permission failed:", err);
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError");
      patchPhoto(photo.id, {
        voice: {
          state: "failed",
          error: denied
            ? "Microphone access is blocked for this site. Allow it in the browser's website settings (Safari: the page menu next to the address → Website Settings → Microphone), then try again."
            : "Couldn't start recording. Try again.",
        },
      });
    }
  }

  function stopRecording(photo: CapturePhoto) {
    const rec = recordersRef.current.get(photo.id);
    if (!rec) return;
    rec.stop();
    recordersRef.current.delete(photo.id);
  }

  async function uploadVoiceNote(photo: CapturePhoto, blob: Blob, duration: number) {
    const voiceId = crypto.randomUUID();
    const ext = mimeToExt(blob.type);
    const storagePath = `${userId}/${inspectionId}/voice/${voiceId}.${ext}`;
    patchPhoto(photo.id, {
      voice: { state: "uploading", duration_seconds: duration },
    });
    try {
      const { error: upErr } = await supabase.storage
        .from("inspection-media")
        .upload(storagePath, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;

      const { data: vn, error: insErr } = await supabase
        .from("voice_notes")
        .insert({
          inspection_id: inspectionId,
          photo_id: photo.id,
          section_id: photo.section_id,
          storage_path: storagePath,
          duration_seconds: duration,
          transcript_status: "pending",
        })
        .select("id")
        .single();
      if (insErr || !vn) throw insErr ?? new Error("voice insert failed");

      patchPhoto(photo.id, {
        voice: {
          state: "transcribing",
          duration_seconds: duration,
          voice_note_id: vn.id as string,
          storage_path: storagePath,
        },
      });

      // Hit the transcription route
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice_note_id: vn.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "transcribe failed");

      patchPhoto(photo.id, {
        voice: {
          state: "done",
          duration_seconds: duration,
          voice_note_id: vn.id as string,
          storage_path: storagePath,
          transcript: json.transcript ?? "",
        },
      });

      // Re-run finding generation now that we have a transcript
      void processPhotoAI(photo.id, true);
    } catch (err) {
      console.error("voice upload failed:", err);
      patchPhoto(photo.id, {
        voice: {
          state: "failed",
          error: "Voice note didn't go through. Tap Voice note to record it again.",
        },
      });
    }
  }

  const recordersRef = useRef<Map<string, MediaRecorder>>(new Map());

  const currentSection = sections.find((s) => s.id === currentSectionId);
  const countsBySection = countByKey(photos, (p) => p.section_id ?? "_unassigned");
  const draftedCount = photos.filter((p) => p.finding).length;
  const processingCount = photos.filter(
    (p) => p.status === "uploading" || p.ai_status === "processing",
  ).length;

  return (
    <div className="space-y-4">
      {/* What to do next. Drafts appeared on the cards with no hint that the
          Review tab is where they get edited, approved and turned into a
          report. */}
      {draftedCount > 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-emerald-900">
              <span className="font-medium">
                {draftedCount} finding{draftedCount === 1 ? "" : "s"} drafted.
              </span>{" "}
              {processingCount > 0
                ? `${processingCount} more on the way. Keep shooting, or review what's ready.`
                : "Review, edit and approve them, then finalize the report."}
            </div>
            <Link
              href={`/inspections/${inspectionId}/review`}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md bg-emerald-700 text-white hover:bg-emerald-800 shrink-0"
            >
              Review drafts →
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <label
              htmlFor="capture-section"
              className="block text-xs uppercase tracking-wide text-slate-500"
            >
              Current section · tap to change
            </label>
            <select
              id="capture-section"
              value={currentSectionId}
              onChange={(e) => setCurrentSectionId(e.target.value)}
              className="max-w-full text-base font-medium text-slate-900 bg-white border border-slate-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-200 rounded-md"
            >
              {sections.map((s) => {
                const n = countsBySection.get(s.id) ?? 0;
                return (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {n > 0 ? ` (${n})` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="text-xs text-slate-400">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </div>
        </CardContent>
      </Card>

      {/* Two inputs on purpose. `capture` opens the camera directly, which is
          what you want standing on a roof — but it BYPASSES the photo library
          entirely, so anyone trying the product away from a job site has
          nothing to give it. The library input below is the escape hatch. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 h-20 rounded-xl bg-slate-900 text-white font-medium text-lg hover:bg-slate-800 active:bg-slate-700 transition-colors shadow-sm"
        >
          <Camera className="h-6 w-6" />
          Take photo for {currentSection?.label ?? "section"}
        </button>
        <button
          type="button"
          onClick={() => libraryInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <ImageIcon className="h-4 w-4" />
          Choose existing photos
        </button>
      </div>

      {photos.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-900">No photos yet</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              On site, tap <span className="font-medium text-slate-700">Take photo</span>.
              Not on a job right now? Tap{" "}
              <span className="font-medium text-slate-700">Choose existing photos</span>{" "}
              and pick a few defect photos from your camera roll. Each one gets a
              drafted finding in under a minute. Add a voice note to any photo to
              steer the draft.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              sectionLabel={sections.find((s) => s.id === p.section_id)?.label ?? "Unassigned"}
              onDelete={() => deletePhoto(p)}
              onRetry={() => retryUpload(p)}
              onRetryAI={() => processPhotoAI(p.id, true)}
              onStartRecord={() => startRecording(p)}
              onStopRecord={() => stopRecording(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Photo card
// ---------------------------------------------------------------------------
function PhotoCard({
  photo,
  sectionLabel,
  onDelete,
  onRetry,
  onRetryAI,
  onStartRecord,
  onStopRecord,
}: {
  photo: CapturePhoto;
  sectionLabel: string;
  onDelete: () => void;
  onRetry: () => void;
  onRetryAI: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
}) {
  const src = photo.url ?? photo.localUrl ?? "";
  const sev = photo.finding?.severity;
  const sevColor = sev ? SEVERITY_COLOR[sev] : null;

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="relative aspect-video sm:aspect-square overflow-hidden rounded-lg bg-slate-100">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={sectionLabel} className="h-full w-full object-cover" />
          )}
          {photo.status === "uploading" && (
            <Overlay tone="dark">Uploading…</Overlay>
          )}
          {photo.status === "failed" && (
            <Overlay tone="error">
              Upload failed. Check your signal.
              <button
                type="button"
                onClick={onRetry}
                className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30"
              >
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            </Overlay>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete photo"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-black/60 text-white">
            {sectionLabel}
          </div>
        </div>

        {/* AI status row */}
        {photo.status === "uploaded" && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <AIStatusBadge status={photo.ai_status} finding={photo.finding} />
            <VoiceButton
              state={photo.voice?.state ?? "idle"}
              onStart={onStartRecord}
              onStop={onStopRecord}
            />
          </div>
        )}

        {/* Why the analysis failed, and a way out. A bare "AI failed" with no
            reason is what a mislabelled iPhone photo used to produce. */}
        {photo.ai_status === "failed" && photo.aiErrorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 space-y-1.5">
            <p className="text-xs text-red-800">{photo.aiErrorMessage}</p>
            <button
              type="button"
              onClick={onRetryAI}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 bg-white text-red-800 text-xs hover:bg-red-100"
            >
              <RotateCcw className="h-3 w-3" /> Try again
            </button>
          </div>
        )}

        {/* Voice transcript */}
        {photo.voice?.state === "done" && photo.voice.transcript && (
          <p className="text-xs text-slate-600 italic border-l-2 border-slate-200 pl-2">
            “{photo.voice.transcript}”
          </p>
        )}
        {photo.voice?.state === "transcribing" && (
          <p className="text-xs text-slate-400 italic">Transcribing voice note…</p>
        )}
        {photo.voice?.state === "uploading" && (
          <p className="text-xs text-slate-400 italic">Uploading voice note…</p>
        )}
        {photo.voice?.state === "failed" && photo.voice.error && (
          <p className="text-xs text-red-700">{photo.voice.error}</p>
        )}

        {/* AI finding preview */}
        {photo.finding && sevColor && (
          <div className="space-y-1">
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded-full border ${sevColor.pill}`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${sevColor.dot}`} />
              {SEVERITY_LABEL[photo.finding.severity]}
            </span>
            <p className="text-sm font-medium text-slate-900">{photo.finding.title}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIStatusBadge({
  status,
  finding,
}: {
  status: AIStatus;
  finding?: CapturePhoto["finding"];
}) {
  if (status === "idle")
    return <span className="inline-flex items-center gap-1 text-slate-400">— waiting</span>;
  if (status === "processing")
    return (
      <span className="inline-flex items-center gap-1 text-slate-600">
        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing photo…
      </span>
    );
  if (status === "drafted")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <Sparkles className="h-3 w-3" /> {finding ? "Draft ready" : "Analyzed"}
      </span>
    );
  return <span className="text-red-700">AI failed</span>;
}

function VoiceButton({
  state,
  onStart,
  onStop,
}: {
  state: NonNullable<CapturePhoto["voice"]>["state"];
  onStart: () => void;
  onStop: () => void;
}) {
  if (state === "recording") {
    return (
      <button
        type="button"
        onClick={onStop}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
      >
        <Square className="h-3 w-3" /> Stop
      </button>
    );
  }
  if (state === "uploading" || state === "transcribing") {
    return (
      <span className="inline-flex items-center gap-1 text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-slate-700 text-xs hover:bg-slate-50"
    >
      <Mic className="h-3 w-3" />
      {state === "done" ? "Re-record" : "Voice note"}
    </button>
  );
}

function Overlay({ tone, children }: { tone: "dark" | "error"; children: React.ReactNode }) {
  const cls = tone === "error" ? "bg-red-600/85" : "bg-black/40";
  return (
    <div className={`absolute inset-0 flex items-center justify-center text-white text-xs ${cls}`}>
      {children}
    </div>
  );
}

function countByKey<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

// Media types Claude's vision API accepts. Anything else has to be transcoded
// before upload or the analysis will fail server-side.
const CLAUDE_READABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Longest edge we keep. Inspection defects are legible well below camera
// resolution, and a 4032px iPhone original costs upload time and vision
// latency for no diagnostic gain.
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;

// Re-encode a camera file into something Claude can read, at a sane size.
//
// The important case is HEIC: it's the iPhone default, Claude rejects it, and
// the old code passed it straight through — the inspector got a bare "AI
// failed". Safari decodes HEIC natively, so canvas transcoding fixes it on the
// devices that actually produce it. Browsers that can't decode the file throw
// here; we fall back to the original bytes and let the server return its
// specific "this is a HEIC" message rather than guessing in the dark.
async function prepareImage(file: File): Promise<File> {
  const needsTranscode = !CLAUDE_READABLE.has(file.type.toLowerCase());

  const decoded = await decodeImage(file);
  if (!decoded) return file;
  const { source, width: srcW, height: srcH, release } = decoded;

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
  if (!needsTranscode && scale === 1) {
    release();
    return file;
  }

  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    release();
    return file;
  }
  ctx.drawImage(source, 0, 0, width, height);
  release();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

// Decode a photo for canvas re-encoding. createImageBitmap with
// imageOrientation "from-image" is the preferred path, but older Safari
// versions reject that option value (or lack createImageBitmap for some
// files) and throw. Before, any throw meant the photo went up un-resized and,
// if it was HEIC, un-converted. An <img> element is the most widely supported
// decoder (Safari decodes HEIC with it, and applies EXIF orientation when
// drawing), so fall back to that before giving up.
async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.(),
      };
    } catch {
      // fall through to <img>
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) {
      URL.revokeObjectURL(url);
      return null;
    }
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function guessExtension(file: File): string {
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("heic")) return "heic";
  return "jpg";
}

function pickAudioMime(): string | undefined {
  // Prefer formats Whisper understands well + browser supports widely.
  // Returns undefined when none is confirmed, so the browser uses its default.
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

function mimeToExt(m: string): string {
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4")) return "m4a";
  if (m.includes("mpeg")) return "mp3";
  return "webm";
}
