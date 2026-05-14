"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/utils/severity";
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

type Props = {
  finding: Finding;
  inspectionId: string;
};

export function EditableFindingCard({ finding, inspectionId }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Local optimistic state while editing
  const [title, setTitle] = useState(finding.title);
  const [description, setDescription] = useState(finding.description);
  const [action, setAction] = useState(finding.recommended_action ?? "");
  const [severity, setSeverity] = useState<Severity>(finding.severity);

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
    handle(
      setFindingApproved({
        finding_id: finding.id,
        inspection_id: inspectionId,
        approved: !finding.is_approved,
      }),
    );
  }

  function remove() {
    if (!confirm("Delete this finding? The photo stays.")) return;
    handle(deleteFinding({ finding_id: finding.id, inspection_id: inspectionId }));
  }

  const c = SEVERITY_COLOR[severity];

  return (
    <Card>
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
