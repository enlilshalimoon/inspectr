"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  canRemoveItem,
  CHECKBOX_LABEL,
  CHECKBOXES,
  isEmptyOther,
  itemForFinding,
  needsMultiBoxExplanation,
  resolveItems,
  type CheckBox,
  type FindingForForm,
  type ItemEntry,
  type ReportForm,
  type ResolvedItem,
} from "@/lib/trec/form";
import { REI76_ITEMS, REI76_SECTIONS } from "@/lib/trec/rei76";
import { SEVERITY_LABEL } from "@/lib/utils/severity";
import { assignFindingToItem, saveTrecDetail, saveTrecItem } from "./trec-actions";

const BOX_HELP: Record<CheckBox, string> = {
  i: "Inspected",
  ni: "Not Inspected",
  np: "Not Present",
  d: "Deficient",
};

type Props = {
  inspectionId: string;
  initialForm: ReportForm;
  findings: FindingForForm[];
};

/**
 * Texas inspectors' report is TREC form REI 7-6. This panel sets each item's
 * I / NI / NP / D boxes, its data fields and comments, and which item each
 * finding prints under. Items with an approved finding are pre-checked
 * (I + D, or just I for informational findings); the inspector sets the rest.
 */
export function TrecPanel({ inspectionId, initialForm, findings }: Props) {
  const [form, setForm] = useState<ReportForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const resolved = useMemo(() => resolveItems(form, findings), [form, findings]);

  const counted = resolved.filter((r) => !r.removed && !isEmptyOther(r));
  const done = counted.filter((r) => r.source !== "none").length;
  const useTrec = form.use_trec !== false;

  function run(update: (f: ReportForm) => ReportForm, save: () => Promise<{ ok: boolean; error?: string }>) {
    const before = form;
    setForm(update);
    setError(null);
    startTransition(async () => {
      const res = await save();
      if (!res.ok) {
        setForm(before);
        setError(res.error ?? "Couldn't save.");
      }
    });
  }

  function saveItem(itemId: string, entry: ItemEntry) {
    run(
      (f) => ({ ...f, items: { ...f.items, [itemId]: entry } }),
      () => saveTrecItem({ inspection_id: inspectionId, item_id: itemId, entry }),
    );
  }

  function moveFinding(findingId: string, itemId: string) {
    run(
      (f) => ({ ...f, finding_items: { ...f.finding_items, [findingId]: itemId } }),
      () => assignFindingToItem({ inspection_id: inspectionId, finding_id: findingId, item_id: itemId }),
    );
  }

  function saveDetail(key: "additional_info" | "sponsor_name" | "sponsor_license", value: string) {
    if ((form[key] ?? "") === value) return;
    run(
      (f) => ({ ...f, [key]: value }),
      () => saveTrecDetail({ inspection_id: inspectionId, key, value }),
    );
  }

  function setUseTrec(value: boolean) {
    run(
      (f) => ({ ...f, use_trec: value }),
      () => saveTrecDetail({ inspection_id: inspectionId, key: "use_trec", value }),
    );
  }

  return (
    <Card id="trec-form" className="scroll-mt-4">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0">
            <h2 className="text-lg font-medium text-slate-900">Texas TREC form (REI 7-6)</h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Your PDF for this inspection is the TREC Property Inspection Report. Every item needs at
              least one box: I, NI, NP or D. Items with an approved finding are already checked I + D
              (I only for informational findings). Check the rest.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            {useTrec && (
              <span className={done === counted.length ? "text-emerald-700" : "text-amber-800"}>
                {done} of {counted.length} items set
              </span>
            )}
          </div>
        </div>

        {useTrec && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all ${done === counted.length ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${counted.length ? Math.round((done / counted.length) * 100) : 0}%` }}
            />
          </div>
        )}

        {error && (
          <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={useTrec}
            onChange={(e) => setUseTrec(e.target.checked)}
          />
          <span>
            Use the TREC form for this inspection.{" "}
            <span className="text-slate-500">
              Untick only if it&apos;s exempt (e.g. a reinspection for the same client, or an inspection for a
              lender or builder), and the standard Lookover report goes out instead.
            </span>
          </span>
        </label>

        {useTrec && (
          <>
            <details className="rounded-md border border-slate-200">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-800">
                Page 1–2 details (sponsor, additional information)
              </summary>
              <div className="space-y-3 px-3 pb-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Name of Sponsor (if applicable)"
                    initial={form.sponsor_name ?? ""}
                    onSave={(v) => saveDetail("sponsor_name", v)}
                  />
                  <TextField
                    label="Sponsor's TREC License #"
                    initial={form.sponsor_license ?? ""}
                    onSave={(v) => saveDetail("sponsor_license", v)}
                  />
                </div>
                <TextArea
                  label="Additional information provided by inspector (page 2)"
                  hint="Optional. Long text goes on a page attached after the form."
                  initial={form.additional_info ?? ""}
                  onSave={(v) => saveDetail("additional_info", v)}
                />
              </div>
            </details>

            <div className="space-y-2">
              {REI76_SECTIONS.map((sec) => {
                const rows = resolved.filter((r) => sec.items.includes(r.item));
                const open = rows.filter((r) => !r.removed && !isEmptyOther(r) && r.source === "none");
                return (
                  <details key={sec.roman} className="group rounded-md border border-slate-200">
                    <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-3 py-2">
                      <span className="text-sm font-medium text-slate-900">
                        {sec.roman}. {titleCase(sec.title)}
                      </span>
                      <span className="flex items-center gap-2 text-xs">
                        {open.length ? (
                          <span className="text-amber-800">{open.length} need a box</span>
                        ) : (
                          <span className="text-emerald-700">Done</span>
                        )}
                        <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                      </span>
                    </summary>
                    <div className="border-t border-slate-100 px-3 py-2 space-y-1">
                      {open.length > 1 && (
                        <div className="flex flex-wrap items-center gap-2 pb-1 text-xs text-slate-500">
                          Mark the {open.length} unset items:
                          {(["np", "ni"] as CheckBox[]).map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => open.forEach((r) => saveItem(r.item.id, { ...r.entry, [b]: true }))}
                              className="rounded border border-slate-200 px-2 py-0.5 text-slate-700 hover:bg-slate-50"
                            >
                              {BOX_HELP[b]}
                            </button>
                          ))}
                        </div>
                      )}
                      {rows.map((r) => (
                        <ItemRow
                          key={r.item.id}
                          r={r}
                          form={form}
                          findings={findings}
                          onSave={(entry) => saveItem(r.item.id, entry)}
                          onMoveFinding={moveFinding}
                        />
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ItemRow({
  r,
  form,
  findings,
  onSave,
  onMoveFinding,
}: {
  r: ResolvedItem;
  form: ReportForm;
  findings: FindingForForm[];
  onSave: (entry: ItemEntry) => void;
  onMoveFinding: (findingId: string, itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Every finding filed under this item, approved or not (only approved ones print).
  const mine = findings.filter((f) => itemForFinding(form, f.sectionType, f) === r.item.id);
  const optionalEmpty = isEmptyOther(r);

  if (r.removed) {
    return (
      <div className="flex items-center justify-between gap-2 py-1.5 text-sm text-slate-400">
        <span className="line-through">
          {r.item.letter}. {r.item.label}
        </span>
        <button
          type="button"
          className="text-xs underline underline-offset-2 hover:text-slate-700"
          onClick={() => onSave({ ...r.entry, removed: false })}
        >
          Put back on the form
        </button>
      </div>
    );
  }

  function toggle(b: CheckBox) {
    // Start from what's shown (a draft is the starting point) and flip one box.
    const next: ItemEntry = { ...r.entry, ...r.boxes, [b]: !r.boxes[b] };
    onSave(next);
  }

  return (
    <div className="py-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex gap-1">
          {CHECKBOXES.map((b) => (
            <button
              key={b}
              type="button"
              title={BOX_HELP[b]}
              aria-pressed={r.boxes[b]}
              onClick={() => toggle(b)}
              className={`h-7 min-w-9 rounded border px-1.5 text-xs font-semibold ${
                r.boxes[b]
                  ? b === "d"
                    ? "border-red-300 bg-red-600 text-white"
                    : "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {CHECKBOX_LABEL[b]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-slate-800"
        >
          <span className="truncate">
            {r.item.letter}. {r.item.label}
          </span>
          {r.source === "draft" && (
            <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-800">from findings</span>
          )}
          {r.source === "none" && !optionalEmpty && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">needs a box</span>
          )}
          {optionalEmpty && (
            <span className="shrink-0 text-[11px] text-slate-400">left off unless you add something</span>
          )}
          {mine.length > 0 && (
            <span className="shrink-0 text-[11px] text-slate-500">
              {mine.length} finding{mine.length === 1 ? "" : "s"}
            </span>
          )}
          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {needsMultiBoxExplanation(r) && (
        <p className="mt-1 text-xs text-amber-800">
          TREC asks you to explain why more than one box is checked. Add a comment.
        </p>
      )}

      {expanded && (
        <div className="mt-2 space-y-3 rounded-md bg-slate-50 p-3">
          {r.item.fields.map((label) => (
            <TextField
              key={label}
              label={label.replace(/:$/, "")}
              initial={r.entry.fields?.[label] ?? ""}
              onSave={(v) => onSave({ ...r.entry, fields: { ...r.entry.fields, [label]: v } })}
            />
          ))}
          <TextArea
            label="Comments"
            hint="Printed under this item, above any findings filed here."
            initial={r.entry.comment ?? ""}
            onSave={(v) => onSave({ ...r.entry, comment: v })}
          />
          {mine.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Findings filed here</p>
              {mine.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-800">
                    {f.title}
                    <span className="ml-2 text-xs text-slate-500">
                      {SEVERITY_LABEL[f.severity]}
                      {f.is_approved ? "" : " · not approved yet, won't print"}
                    </span>
                  </span>
                  <select
                    aria-label="Move to form item"
                    className="max-w-56 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                    value={r.item.id}
                    onChange={(e) => onMoveFinding(f.id, e.target.value)}
                  >
                    {REI76_ITEMS.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.id} {it.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-xs">
            {r.source === "inspector" && r.findingIds.length > 0 && (
              <button
                type="button"
                className="text-slate-600 underline underline-offset-2 hover:text-slate-900"
                onClick={() => onSave({ comment: r.entry.comment, fields: r.entry.fields })}
              >
                Reset boxes to the draft from findings
              </button>
            )}
            {canRemoveItem(r.item) && r.findingIds.length === 0 && (
              <button
                type="button"
                className="text-slate-600 underline underline-offset-2 hover:text-slate-900"
                onClick={() => onSave({ removed: true })}
              >
                Leave this item off the form
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({ label, initial, onSave }: { label: string; initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && onSave(value)}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
      />
    </label>
  );
}

function TextArea({
  label,
  hint,
  initial,
  onSave,
}: {
  label: string;
  hint?: string;
  initial: string;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-600">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && onSave(value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
      />
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(and)\b|\b\w/g, (m, and) => (and ? m : m.toUpperCase()));
}
