"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Trash2,
  Pencil,
  X,
  Loader2,
  Mic,
  Square,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/utils/severity";
import { createClient } from "@/lib/supabase/client";
import type { Finding, Severity } from "@/lib/supabase/types";
import {
  deleteFinding,
  setFindingApproved,
  updateFinding,
  type ActionResult,
} from "./actions";

const SEVERITIES: Severity[] = [
  "info",
  "monitor",
  "minor_repair",
  "major_repair",
  "safety_hazard",
];

type VoiceState =
  | "idle"
  | "recording"
  | "uploading"
  | "transcribing"
  | "regenerating"
  | "done"
  | "failed";

type Props = {
  finding: Finding;
  inspectionId: string;
  userId: string;
};

export function EditableFindingCard({ finding, inspectionId, userId }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Local optimistic state while editing
  const [title, setTitle] = useState(finding.title);
  const [description, setDescription] = useState(finding.description);
  const [action, setAction] = useState(finding.recommended_action ?? "");
  const [severity, setSeverity] = useState<Severity>(finding.severity);

  // Voice-regenerate state
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const supabase = useMemo(() => createClient(), []);

  function reset() {
    setTitle(finding.title);
    setDescription(finding.description);
    setAction(finding.recommended_action ?? "");
    setSeverity(finding.severity);
    setError(null);
  }

  function handle(promise: Promise<ActionResult>) {
    startTransition(async () => {
      setError(null);
      const res = await promise;
      if (!res.ok) setError(res.error);
    });
  }

  function save() {
    handle(
      updateFinding({
        finding_id: finding.id,
        inspection_id: inspectionId,
        title,
        description,
        recommended_action: action,
        severity,
      }).then((r) => {
        if (r.ok) setEditing(false);
        return r;
      }),
    );
  }

  function toggleApproved() {
    const wasApproved = finding.is_approved;
    handle(
      setFindingApproved({
        finding_id: finding.id,
        inspection_id: inspectionId,
        approved: !wasApproved,
      }).then((r) => {
        // After approval (not un-approval), scroll to next unapproved card.
        if (r.ok && !wasApproved) {
          // Wait a tick for revalidation/DOM update.
          setTimeout(() => scrollToNextUnapproved(finding.id), 80);
        }
        return r;
      }),
    );
  }

  function remove() {
    if (!confirm("Delete this finding? The photo stays.")) return;
    handle(deleteFinding({ finding_id: finding.id, inspection_id: inspectionId }));
  }

  // -------------------------------------------------------------------------
  // Voice comment + regenerate
  // -------------------------------------------------------------------------
  async function startRecording() {
    if (!finding.photo_id) {
      setVoiceError("This finding has no source photo to regenerate from.");
      setVoiceState("failed");
      return;
    }
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: pickAudioMime() });
      const chunks: BlobPart[] = [];
      const startedAt = nowMs();
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const duration = Math.round((nowMs() - startedAt) / 1000);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        await uploadAndRegenerate(blob, duration);
      };
      recorder.start();
      recorderRef.current = recorder;
      setVoiceState("recording");
    } catch (err) {
      console.error("mic permission failed:", err);
      setVoiceError("Microphone permission denied or unavailable.");
      setVoiceState("failed");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function uploadAndRegenerate(blob: Blob, duration: number) {
    if (!finding.photo_id) return;
    const voiceId = crypto.randomUUID();
    const ext = mimeToExt(blob.type);
    const storagePath = `${userId}/${inspectionId}/voice/${voiceId}.${ext}`;
    setVoiceState("uploading");
    try {
      const { error: upErr } = await supabase.storage
        .from("inspection-media")
        .upload(storagePath, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;

      const { data: vn, error: insErr } = await supabase
        .from("voice_notes")
        .insert({
          inspection_id: inspectionId,
          photo_id: finding.photo_id,
          section_id: finding.section_id,
          storage_path: storagePath,
          duration_seconds: duration,
          transcript_status: "pending",
        })
        .select("id")
        .single();
      if (insErr || !vn) throw insErr ?? new Error("voice insert failed");

      setVoiceState("transcribing");
      const tRes = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice_note_id: vn.id }),
      });
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error ?? "transcribe failed");
      setVoiceTranscript(tJson.transcript ?? "");

      setVoiceState("regenerating");
      const rRes = await fetch("/api/ai/process-photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo_id: finding.photo_id, regenerate: true }),
      });
      const rJson = await rRes.json();
      if (!rRes.ok) throw new Error(rJson.error ?? "regenerate failed");

      if (rJson.regenerate_skipped) {
        // The route refused because the finding was already approved or edited.
        // Surface that so the inspector knows their voice was captured but
        // didn't overwrite their work.
        setVoiceError(
          "Voice note saved, but the finding was already edited/approved. Unapprove or revert to regenerate.",
        );
        setVoiceState("done");
        router.refresh();
        return;
      }

      setVoiceState("done");
      // Server rendered the page — pull the new finding text in.
      router.refresh();
    } catch (err) {
      console.error("voice regenerate failed:", err);
      setVoiceError(err instanceof Error ? err.message : String(err));
      setVoiceState("failed");
    }
  }

  const c = SEVERITY_COLOR[severity];
  const voiceBusy =
    voiceState === "uploading" ||
    voiceState === "transcribing" ||
    voiceState === "regenerating";

  return (
    <Card
      data-finding-card
      data-finding-id={finding.id}
      data-approved={finding.is_approved ? "true" : "false"}
    >
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Header: severity + approval state + actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {editing ? (
              <SeverityPicker value={severity} onChange={setSeverity} disabled={pending} />
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${c.pill}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
                {SEVERITY_LABEL[severity]}
              </span>
            )}
            {finding.is_approved && !editing && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <Check className="h-3 w-3" /> Approved
              </span>
            )}
            {finding.inspector_edited && !editing && (
              <span className="text-[10px] uppercase tracking-wide text-slate-400">edited</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setEditing(false);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                  disabled={pending}
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="p-1.5 text-slate-500 hover:text-red-700 rounded"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleApproved}
                  disabled={pending}
                  className={`ml-1 inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${
                    finding.is_approved
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  {finding.is_approved ? "Approved" : "Approve"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full font-medium text-slate-900 bg-transparent border-b border-slate-200 focus:border-slate-900 focus:outline-none py-1"
          />
        ) : (
          <h3 className="font-medium text-slate-900">{title}</h3>
        )}

        {/* Description */}
        {editing ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full text-sm text-slate-700 leading-relaxed bg-transparent border border-slate-200 focus:border-slate-900 focus:outline-none rounded p-2"
          />
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{description}</p>
        )}

        {/* Recommended action */}
        {(editing || action) && (
          <div className="border-l-2 border-slate-200 pl-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Recommended action
            </div>
            {editing ? (
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                rows={2}
                className="w-full text-sm text-slate-600 bg-transparent border border-slate-200 focus:border-slate-900 focus:outline-none rounded p-2"
              />
            ) : (
              <p className="text-sm text-slate-600">{action}</p>
            )}
          </div>
        )}

        {error && <div className="text-xs text-red-700">{error}</div>}

        {/* Voice comment / regenerate */}
        {!editing && finding.photo_id && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                {voiceState === "idle" && "Add a voice comment to regenerate this finding"}
                {voiceState === "recording" && (
                  <span className="inline-flex items-center gap-1.5 text-red-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Recording… speak any context you want the AI to use
                  </span>
                )}
                {voiceState === "uploading" && "Uploading voice…"}
                {voiceState === "transcribing" && "Transcribing…"}
                {voiceState === "regenerating" && (
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <Sparkles className="h-3 w-3" /> Re-drafting with your comment…
                  </span>
                )}
                {voiceState === "done" && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <Check className="h-3 w-3" /> Updated
                  </span>
                )}
                {voiceState === "failed" && (
                  <span className="text-red-700">{voiceError ?? "Voice failed"}</span>
                )}
              </div>
              {voiceState === "recording" ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  <Square className="h-3 w-3" /> Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={voiceBusy || pending}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {voiceBusy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Mic className="h-3 w-3" />
                  )}
                  {voiceState === "done" || voiceState === "failed"
                    ? "Re-record"
                    : "Voice comment"}
                </button>
              )}
            </div>
            {voiceTranscript && voiceState !== "recording" && (
              <p className="mt-2 text-xs text-slate-600 italic border-l-2 border-slate-200 pl-2">
                “{voiceTranscript}”
              </p>
            )}
            {voiceState === "failed" && voiceError && (
              <p className="mt-1 text-xs text-red-700">{voiceError}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeverityPicker({
  value,
  onChange,
  disabled,
}: {
  value: Severity;
  onChange: (s: Severity) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {SEVERITIES.map((s) => {
        const c = SEVERITY_COLOR[s];
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border transition-all ${
              active ? `${c.pill} ring-2 ring-offset-1 ${c.ring}` : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${active ? c.dot : "bg-slate-300"}`} />
            {SEVERITY_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Wrapped so the React purity linter doesn't flag Date.now in the recorder
// closure — at call time we're inside an event handler, not a render.
function nowMs(): number {
  return Date.now();
}

function pickAudioMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "audio/webm";
}

function mimeToExt(m: string): string {
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4")) return "m4a";
  if (m.includes("mpeg")) return "mp3";
  return "webm";
}

/**
 * Walks the DOM looking for the next finding card after the one identified by
 * `currentId` that is still unapproved, and scrolls it into view. If none is
 * found, scrolls the approval-progress banner to the top instead.
 */
function scrollToNextUnapproved(currentId: string) {
  if (typeof document === "undefined") return;
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-finding-card]"),
  );
  const idx = cards.findIndex((c) => c.dataset.findingId === currentId);
  if (idx === -1) return;
  // Look at cards AFTER the current one first.
  let target: HTMLElement | null = null;
  for (let i = idx + 1; i < cards.length; i++) {
    if (cards[i].dataset.approved !== "true") {
      target = cards[i];
      break;
    }
  }
  // Wrap to the top if nothing found after.
  if (!target) {
    for (let i = 0; i < idx; i++) {
      if (cards[i].dataset.approved !== "true") {
        target = cards[i];
        break;
      }
    }
  }
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  // All approved — scroll the progress banner into view.
  const banner = document.querySelector("[data-approval-banner]");
  if (banner instanceof HTMLElement) {
    banner.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
