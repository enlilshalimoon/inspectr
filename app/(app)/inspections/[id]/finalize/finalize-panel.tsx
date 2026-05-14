"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants, Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Check, Download, Link as LinkIcon, Loader2, FileText } from "lucide-react";
import { finalizeInspection } from "../review/actions";

type Props = {
  inspectionId: string;
  status: string;
  finalizedAt: string | null;
  shareSlug: string | null;
  pdfSignedUrl: string | null;
  totalFindings: number;
  unapprovedCount: number;
};

export function FinalizePanel({
  inspectionId,
  status,
  finalizedAt,
  shareSlug,
  pdfSignedUrl,
  totalFindings,
  unapprovedCount,
}: Props) {
  const isFinalized = status === "finalized" || status === "delivered";
  const allApproved = totalFindings > 0 && unapprovedCount === 0;

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function onFinalize() {
    startTransition(async () => {
      setError(null);
      const res = await finalizeInspection({ inspection_id: inspectionId });
      if (!res.ok) setError(res.error);
      // Server action revalidates; page reloads with the new state.
    });
  }

  function copyShareLink() {
    if (!shareSlug) return;
    const url = `${window.location.origin}/report/${shareSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (isFinalized) {
    const shareUrl = shareSlug
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/report/${shareSlug}`
      : null;
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Check className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Report finalized</h2>
            </div>
            <p className="text-sm text-slate-600">
              Finalized {finalizedAt ? new Date(finalizedAt).toLocaleString() : ""}. The report is
              now locked. {totalFindings} finding{totalFindings === 1 ? "" : "s"} approved.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">
              Deliver to client
            </h3>
            {shareUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs sm:text-sm bg-slate-100 rounded px-3 py-2 overflow-x-auto whitespace-nowrap">
                  {shareUrl}
                </code>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-slate-200 hover:bg-slate-50"
                >
                  <LinkIcon className="h-4 w-4" />
                  {copied ? "Copied" : "Copy"}
                </button>
                <Link
                  href={`/report/${shareSlug}`}
                  target="_blank"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Preview
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No share link generated.</p>
            )}
            {pdfSignedUrl && (
              <div className="pt-2">
                <a
                  href={pdfSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "default" }) + " w-full sm:w-auto"}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </div>
            )}
            <p className="text-xs text-slate-500 pt-2">
              The share link is public to anyone who has the URL. Email delivery coming in a
              future build.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not finalized yet
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Finalize report</h2>
        </div>

        <div className="space-y-2 text-sm">
          <Row
            ok={totalFindings > 0}
            label="At least one finding drafted"
            value={`${totalFindings} finding${totalFindings === 1 ? "" : "s"}`}
          />
          <Row
            ok={allApproved}
            label="All findings approved"
            value={
              allApproved
                ? "All approved"
                : `${unapprovedCount} still need approval`
            }
          />
        </div>

        {!allApproved && totalFindings > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
            Approve the remaining {unapprovedCount} finding{unapprovedCount === 1 ? "" : "s"} on
            the{" "}
            <Link
              href={`/inspections/${inspectionId}/review`}
              className="font-medium underline underline-offset-4"
            >
              Review tab
            </Link>{" "}
            before finalizing.
          </div>
        )}

        <FormMessage message={error} kind="error" />

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="lg"
            onClick={onFinalize}
            disabled={pending || !allApproved}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {pending ? "Generating PDF…" : "Finalize and generate PDF"}
          </Button>
          <p className="text-xs text-slate-500">This locks the report from further edits.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-700">
        <span
          className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        {label}
      </span>
      <span className="text-slate-500">{value}</span>
    </div>
  );
}
