"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import type { SectionType } from "@/lib/supabase/types";
import {
  SYSTEM_STATUSES,
  SYSTEM_STATUS_LABEL,
  type SectionStatus,
  type SystemStatus,
} from "@/lib/inspection/system-status";
import { setSectionStatus } from "./actions";

const REASON_HINT: Record<SystemStatus, string> = {
  inspected: "",
  not_inspected: "Why not? e.g. blocked by stored items, utilities off, unsafe to access",
  not_present: "Optional note, e.g. home has no fireplace",
};

// Systems inventory row for one section: Inspected / Not inspected / Not
// present, a reason, and a short description. Saves on status tap and on
// blur of the text fields.
export function SectionStatusControl({
  inspectionId,
  sectionType,
  initial,
  locked,
  optional = false,
}: {
  inspectionId: string;
  sectionType: SectionType;
  initial: SectionStatus | null;
  locked: boolean;
  // Unused optional section: not set is fine, so no amber warning.
  optional?: boolean;
}) {
  const [status, setStatus] = useState<SystemStatus | null>(initial?.status ?? null);
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saved, setSaved] = useState<SectionStatus | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: { status: SystemStatus | null; reason: string; description: string }) {
    if (!next.status) return;
    const same =
      saved &&
      saved.status === next.status &&
      (saved.reason ?? "") === next.reason.trim() &&
      (saved.description ?? "") === next.description.trim();
    if (same) return;
    // Wait for the reason before saving a "Not inspected" (the server rejects it).
    if (next.status === "not_inspected" && !next.reason.trim()) return;
    const status = next.status;
    startTransition(async () => {
      setError(null);
      const res = await setSectionStatus({
        inspection_id: inspectionId,
        section_type: sectionType,
        status,
        reason: next.reason,
        description: next.description,
      });
      if (!res.ok) setError(res.error);
      else
        setSaved({
          status,
          reason: next.reason.trim() || null,
          description: next.description.trim() || null,
        });
    });
  }

  const needsReason = status === "not_inspected";
  const showReason = status === "not_inspected" || status === "not_present";

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        (!saved && !optional) || (needsReason && !reason.trim())
          ? "border-amber-300 bg-amber-50/60"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-600 mr-1">System status</span>
        <div role="radiogroup" aria-label="System status" className="inline-flex rounded-md border border-slate-200 bg-white overflow-hidden">
          {SYSTEM_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              disabled={locked || pending}
              onClick={() => {
                setStatus(s);
                save({ status: s, reason, description });
              }}
              className={`px-2.5 py-1 text-xs border-r last:border-r-0 border-slate-200 ${
                status === s
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {SYSTEM_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
          {pending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving
            </>
          ) : needsReason && !reason.trim() ? (
            "Add the reason to save"
          ) : saved && !error ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" /> Saved
            </>
          ) : !status && !optional ? (
            "Not set: required for the report"
          ) : null}
        </span>
      </div>

      {showReason && (
        <input
          type="text"
          value={reason}
          disabled={locked}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => save({ status, reason, description })}
          placeholder={REASON_HINT[status!]}
          aria-label={needsReason ? "Reason not inspected (required)" : "Note"}
          maxLength={500}
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
        />
      )}
      {status !== "not_present" && (
        <input
          type="text"
          value={description}
          disabled={locked || !status}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => save({ status, reason, description })}
          placeholder="Description (optional): materials, type, how it was viewed. e.g. Asphalt shingle, walked"
          aria-label="Description"
          maxLength={1000}
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:opacity-50"
        />
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
