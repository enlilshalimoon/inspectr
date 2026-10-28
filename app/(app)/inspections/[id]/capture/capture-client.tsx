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
import { listPending, removePending, savePending } from "@/lib/inspection/pending-uploads";
import { labelForSection } from "@/lib/supabase/sections";
import type { SectionType, Severity } from "@/lib/supabase/types";
import { prepareImage } from "@/lib/inspection/prepare-image";

// "dismissed": the inspector deleted this photo's finding. It stays out of the
// report and is not re-drafted unless they tap "Draft again".
type AIStatus = "idle" | "processing" | "drafted" | "failed" | "dismissed";

// Section select value meaning "let the AI file it".
const AUTO_SECTION = "";

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
  // The photo is also stored on the device until it uploads.
  savedLocally?: boolean;
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
  const [photos, setPhotos] = useState<CapturePhoto[]>(initialPhotos);
  // Default is Auto: the AI files each photo into the section it shows. The
  // old default (the first section, Grounds) filed every photo there unless
  // the inspector changed the dropdown before each shot.
  const [currentSectionId, setCurrentSectionId] = useState<string>(AUTO_SECTION);
  const [sectionList, setSectionList] = useState<SectionOption[]>(sections);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Latest photos for event handlers registered once (online, beforeunload).
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // On open: backfill AI drafts for photos that don't have one yet (but never
  // for ones whose finding the inspector deleted), and resend any photo still
  // waiting on this device from an earlier visit.
  useEffect(() => {
    for (const p of initialPhotos) {
      if (p.status === "uploaded" && !p.finding && p.ai_status !== "dismissed") {
        void processPhotoAI(p.id);
      }
    }
    void (async () => {
      const known = new Set(initialPhotos.map((p) => p.id));
      for (const item of await listPending(inspectionId)) {
        if (known.has(item.photoId)) {
          // Uploaded last time; only the local cleanup didn't happen.
          await removePending(item.photoId);
          continue;
        }
        const file = new File([item.file], item.fileName, { type: item.file.type });
        setPhotos((prev) =>
          prev.some((p) => p.id === item.photoId)
            ? prev
            : [
                {
                  id: item.photoId,
                  section_id: item.sectionId || null,
                  storage_path: item.storagePath,
                  url: null,
                  localUrl: URL.createObjectURL(file),
                  rawFile: file,
                  savedLocally: true,
                  status: "uploading",
                  ai_status: "idle",
                  voice: { state: "idle" },
                },
                ...prev,
              ],
        );
        await sendPhoto(item.photoId, file, item.sectionId, item.storagePath);
      }
    })();

    // Back in service: resend everything that failed.
    function onOnline() {
      for (const p of photosRef.current) {
        if (p.status === "failed" && p.rawFile) void retryUpload(p);
      }
    }
    // Warn before leaving while something would be lost or interrupted.
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const busy = photosRef.current.some(
        (p) =>
          p.status === "uploading" ||
          (p.status === "failed" && !p.savedLocally) ||
          ["recording", "uploading"].includes(p.voice?.state ?? "idle"),
      );
      if (busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patchPhoto(id: string, patch: Partial<CapturePhoto>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // At most a few drafts at once. Picking 20 photos (or reopening an
  // inspection with many undrafted ones) used to fire every AI call at once
  // and trip the AI provider's rate limits.
  const aiQueue = useRef<{ running: number; waiting: (() => void)[] }>({ running: 0, waiting: [] });
  async function withAISlot<T>(fn: () => Promise<T>): Promise<T> {
    const q = aiQueue.current;
    if (q.running >= 3) await new Promise<void>((resolve) => q.waiting.push(resolve));
    q.running += 1;
    try {
      return await fn();
    } finally {
      q.running -= 1;
      q.waiting.shift()?.();
    }
  }

  async function processPhotoAI(photoId: string, regenerate = false) {
    patchPhoto(photoId, { ai_status: "processing", aiErrorMessage: undefined });
    await withAISlot(() => runPhotoAI(photoId, regenerate));
  }

  async function runPhotoAI(photoId: string, regenerate: boolean) {
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
      if (json.section_id) {
        patchPhoto(photoId, { section_id: json.section_id });
        await addSectionIfNew(json.section_id);
      }
      patchPhoto(photoId, {
        ai_status: json.dismissed ? "dismissed" : "drafted",
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

  // The AI may file a photo into a section the inspection didn't have yet
  // (pool, fireplace…). Add it to the picker so counts and labels line up.
  async function addSectionIfNew(sectionId: string) {
    if (sectionList.some((s) => s.id === sectionId)) return;
    const { data } = await supabase
      .from("inspection_sections")
      .select("id, section_type")
      .eq("id", sectionId)
      .maybeSingle();
    if (!data) return;
    const type = data.section_type as SectionType;
    setSectionList((prev) =>
      prev.some((s) => s.id === sectionId)
        ? prev
        : [...prev, { id: sectionId, type, label: labelForSection(type) }],
    );
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
    const photoId = crypto.randomUUID();
    const localUrl = URL.createObjectURL(rawFile);

    setPhotos((prev) => [
      {
        id: photoId,
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
    await sendPhoto(photoId, rawFile, sectionId);
  }

  // The card id doubles as the photos row id, and the storage path is pinned on
  // the card once chosen, so a retry overwrites the same object and row instead
  // of orphaning a storage object or creating a duplicate photo and AI draft.
  async function sendPhoto(photoId: string, rawFile: File, sectionId: string, pinnedPath?: string) {
    let file: File = rawFile;
    try {
      // Normalize before upload: fixes iPhone HEIC (Safari can decode it even
      // though Claude can't read it), corrects EXIF rotation, and shrinks a
      // 4 MB camera original to a few hundred KB — which is most of the wait
      // on both the upload and the vision call.
      file = await prepareImage(rawFile);
      const storagePath =
        pinnedPath || `${userId}/${inspectionId}/${photoId}.${guessExtension(file)}`;
      // Keep a copy on the device until the server has it, so a dropped
      // signal or a closed tab doesn't lose a photo that only ever existed here.
      const savedLocally = await savePending({
        photoId,
        inspectionId,
        sectionId,
        storagePath,
        file,
        fileName: file.name,
        createdAt: Date.now(),
      });
      patchPhoto(photoId, { storage_path: storagePath, rawFile: file, savedLocally });

      // A couple of quiet retries before bothering the inspector.
      await withRetries(async () => {
        const { error: uploadErr } = await supabase.storage
          .from("inspection-media")
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: file.type || "image/jpeg",
            upsert: true,
          });
        if (uploadErr) throw uploadErr;

        const { data: row, error: insErr } = await supabase
          .from("photos")
          .upsert({
            id: photoId,
            inspection_id: inspectionId,
            section_id: sectionId || null,
            storage_path: storagePath,
            taken_at: new Date().toISOString(),
            upload_status: "uploaded",
          })
          .select("id")
          .single();
        if (insErr || !row) throw insErr ?? new Error("insert failed");
      });
      await removePending(photoId);

      const { data: signed } = await supabase.storage
        .from("inspection-media")
        .createSignedUrl(storagePath, 60 * 60);

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? {
                ...p,
                storage_path: storagePath,
                url: signed?.signedUrl ?? null,
                status: "uploaded",
                rawFile: undefined,
                savedLocally: false,
              }
            : p,
        ),
      );

      // Fire AI processing in the background.
      void processPhotoAI(photoId);
    } catch (err) {
      console.error("upload failed:", err);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? {
                ...p,
                rawFile: file,
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
    await removePending(photo.id);
    if (photo.storage_path) {
      await supabase.storage.from("inspection-media").remove([photo.storage_path]);
    }
    // A failed card may still have a row from a partial upload; the id is the
    // row id either way, so a no-op delete is harmless.
    await supabase.from("photos").delete().eq("id", photo.id);
  }

  async function retryUpload(photo: CapturePhoto) {
    // Re-send the same photo. Used to reopen the camera, which forced a
    // re-shoot after a signal drop and was a dead end for library photos.
    if (photo.rawFile) {
      patchPhoto(photo.id, { status: "uploading", errorMessage: undefined });
      await sendPhoto(photo.id, photo.rawFile, photo.section_id ?? "", photo.storage_path);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
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
      await withRetries(async () => {
        const { error: upErr } = await supabase.storage
          .from("inspection-media")
          .upload(storagePath, blob, { contentType: blob.type, upsert: true });
        if (upErr) throw upErr;
      });

      const { data: vn, error: insErr } = await supabase
        .from("voice_notes")
        .insert({
          id: voiceId,
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
    } catch (err) {
      console.error("voice upload failed:", err);
      patchPhoto(photo.id, {
        voice: {
          state: "failed",
          error: "Voice note didn't upload. Check your signal and tap Voice note to record it again.",
        },
      });
      return;
    }
    await transcribeAndDraft(photo.id, voiceId, storagePath, duration);
  }

  // Separate from the upload so a failed transcription can be retried from the
  // saved recording instead of asking the inspector to say it all again.
  async function transcribeAndDraft(
    photoId: string,
    voiceNoteId: string,
    storagePath: string,
    duration?: number,
  ) {
    const base = { voice_note_id: voiceNoteId, storage_path: storagePath, duration_seconds: duration };
    patchPhoto(photoId, { voice: { state: "transcribing", ...base } });
    try {
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice_note_id: voiceNoteId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "transcribe failed");

      // "Re-record" replaces: drop this photo's older voice notes so a
      // corrected note isn't drafted together with the one it corrects.
      const { data: older } = await supabase
        .from("voice_notes")
        .select("id, storage_path")
        .eq("photo_id", photoId)
        .neq("id", voiceNoteId);
      if (older?.length) {
        await supabase.from("voice_notes").delete().in("id", older.map((o) => o.id as string));
        await supabase.storage
          .from("inspection-media")
          .remove(older.map((o) => o.storage_path as string));
      }

      patchPhoto(photoId, {
        voice: { state: "done", transcript: json.transcript ?? "", ...base },
      });

      // Re-run finding generation now that we have a transcript
      void processPhotoAI(photoId, true);
    } catch (err) {
      console.error("transcription failed:", err);
      patchPhoto(photoId, {
        voice: {
          state: "failed",
          error: "Couldn't transcribe the voice note. Your recording is saved.",
          ...base,
        },
      });
    }
  }

  function retryTranscription(photo: CapturePhoto) {
    const v = photo.voice;
    if (!v?.voice_note_id || !v.storage_path) return;
    void transcribeAndDraft(photo.id, v.voice_note_id, v.storage_path, v.duration_seconds);
  }

  const recordersRef = useRef<Map<string, MediaRecorder>>(new Map());

  const currentSection = sectionList.find((s) => s.id === currentSectionId);
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
              Section · tap to change
            </label>
            <select
              id="capture-section"
              value={currentSectionId}
              onChange={(e) => setCurrentSectionId(e.target.value)}
              className="max-w-full text-base font-medium text-slate-900 bg-white border border-slate-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-200 rounded-md"
            >
              <option value={AUTO_SECTION}>Auto: AI picks the section</option>
              {sectionList.map((s) => {
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
          {currentSection ? `Take photo for ${currentSection.label}` : "Take photo"}
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
              sectionLabel={
                sectionList.find((s) => s.id === p.section_id)?.label ??
                (p.status === "uploaded" && p.ai_status !== "processing" ? "Unassigned" : "Auto")
              }
              onDelete={() => deletePhoto(p)}
              onRetry={() => retryUpload(p)}
              onRetryAI={() => processPhotoAI(p.id, true)}
              onRetryVoice={() => retryTranscription(p)}
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
  onRetryVoice,
  onStartRecord,
  onStopRecord,
}: {
  photo: CapturePhoto;
  sectionLabel: string;
  onDelete: () => void;
  onRetry: () => void;
  onRetryAI: () => void;
  onRetryVoice: () => void;
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
              {photo.savedLocally
                ? "Not uploaded yet. Saved on this phone; it sends when you're back in service."
                : "Upload failed. Check your signal."}
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
            <AIStatusBadge status={photo.ai_status} finding={photo.finding} onDraftAgain={onRetryAI} />
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
          <div className="text-xs text-red-700 space-y-1">
            <p>{photo.voice.error}</p>
            {photo.voice.voice_note_id && (
              <button
                type="button"
                onClick={onRetryVoice}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 bg-white text-red-800 hover:bg-red-100"
              >
                <RotateCcw className="h-3 w-3" /> Retry transcription
              </button>
            )}
          </div>
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
  onDraftAgain,
}: {
  status: AIStatus;
  finding?: CapturePhoto["finding"];
  onDraftAgain: () => void;
}) {
  if (status === "dismissed")
    return (
      <span className="inline-flex items-center gap-2 text-slate-500">
        Not in report
        <button
          type="button"
          onClick={onDraftAgain}
          className="underline underline-offset-2 hover:text-slate-800"
        >
          Draft again
        </button>
      </span>
    );
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

// Run fn, retrying twice with a short backoff. Most upload failures on a
// phone are a momentary signal drop.
async function withRetries(fn: () => Promise<void>, attempts = 3): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, i * 2000));
    }
  }
}

function countByKey<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
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
