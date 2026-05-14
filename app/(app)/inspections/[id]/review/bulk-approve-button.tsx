"use client";

import { useTransition, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { approveAllInSection } from "./actions";

export function BulkApproveButton({
  inspectionId,
  sectionId,
  totalCount,
  approvedCount,
}: {
  inspectionId: string;
  sectionId: string | null;
  totalCount: number;
  approvedCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const allApproved = approvedCount === totalCount && totalCount > 0;

  function approveAll() {
    startTransition(async () => {
      setError(null);
      const res = await approveAllInSection({ inspection_id: inspectionId, section_id: sectionId });
      if (!res.ok) setError(res.error);
    });
  }

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-700">{error}</span>}
      <button
        type="button"
        disabled={pending || allApproved}
        onClick={approveAll}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${
          allApproved
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 cursor-default"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        }`}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        {allApproved ? "All approved" : `Approve all (${totalCount - approvedCount})`}
      </button>
    </div>
  );
}
