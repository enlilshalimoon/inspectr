"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SectionType, Severity } from "@/lib/supabase/types";
import { addManualFinding } from "./actions";
import { SeverityPicker } from "./finding-card";

// For findings with nothing to photograph ("no smoke alarm in bedroom 2",
// "attic hatch not accessible"). Collapsed to one link until tapped.
export function AddFindingForm({
  inspectionId,
  sectionType,
}: {
  inspectionId: string;
  sectionType: SectionType;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("");
  const [severity, setSeverity] = useState<Severity>("minor_repair");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setAction("");
    setSeverity("minor_repair");
    setError(null);
  }

  function save() {
    startTransition(async () => {
      setError(null);
      const res = await addManualFinding({
        inspection_id: inspectionId,
        section_type: sectionType,
        title,
        description,
        recommended_action: action,
        severity,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Add a finding without a photo
      </button>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <SeverityPicker value={severity} onChange={setSeverity} disabled={pending} />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title, e.g. No smoke alarm in bedroom 2"
          className="w-full font-medium text-slate-900 bg-transparent border-b border-slate-200 focus:border-slate-900 focus:outline-none py-1"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What you found"
          className="w-full text-sm text-slate-700 bg-transparent border border-slate-200 focus:border-slate-900 focus:outline-none rounded p-2"
        />
        <textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          rows={2}
          placeholder="Recommended action (optional)"
          className="w-full text-sm text-slate-600 bg-transparent border border-slate-200 focus:border-slate-900 focus:outline-none rounded p-2"
        />
        {error && <div className="text-xs text-red-700">{error}</div>}
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={save} disabled={pending || !title.trim() || !description.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add finding
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <span className="text-xs text-slate-500">You wrote it, so it&apos;s added as approved.</span>
        </div>
      </CardContent>
    </Card>
  );
}
