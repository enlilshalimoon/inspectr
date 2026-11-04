"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { prepareImage } from "@/lib/inspection/prepare-image";
import { sectionOrder } from "@/lib/inspection/photos";
import { SEVERITY_COLOR, SEVERITY_LABEL, SEVERITY_ORDER } from "@/lib/utils/severity";
import { trackEvent } from "@/components/MetaPixel";
import type { SectionType, Severity } from "@/lib/supabase/types";

const MAX_PHOTOS = 15;
const CONCURRENCY = 3;

// For visitors without inspection photos handy (most cold-email clicks happen
// at a desk, with the photos on a phone or in report software). Openly
// licensed photos from Wikimedia Commons; credits render under the results.
const SAMPLE_PREFIX = "lookover-sample-";
const SAMPLES = [
  { file: "roof-shingles.jpg", artist: "Samuel Bolton", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Asphalt_shingles_damage.jpg" },
  { file: "roof-worn.jpg", artist: "Dale Mahalko", license: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Failure_of_asphalt_shingles_allowing_roof_leakage.JPG" },
  { file: "water-heater.jpg", artist: "Infrogmation of New Orleans", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Rheem_home_gas_water_heater_tank_-_top_of_tank.jpg" },
  { file: "siding-rot.jpg", artist: "Alton", license: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Termite_damage.JPG" },
  { file: "ceiling-stain.jpg", artist: "Tomwsulcer", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Ceiling_sheetrock_damaged_by_water_so_paint_was_peeling.jpg" },
];

type Draft = {
  section: SectionType;
  section_label: string;
  finding: {
    severity: Severity;
    title: string;
    description: string;
    recommended_action: string;
  };
  sig: string | null;
};

type Item = {
  id: string;
  preview: string;
  status: "working" | "done" | "error";
  draft?: Draft;
  error?: string;
};

export function TryClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [limitHit, setLimitHit] = useState<string | null>(null);
  const [usedSamples, setUsedSamples] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tracked = useRef(false);

  const update = useCallback((id: string, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const run = useCallback(
    async (id: string, file: File) => {
      try {
        const prepared = await prepareImage(file);
        const body = new FormData();
        body.append("photo", prepared);
        if (file.name.startsWith(SAMPLE_PREFIX)) body.append("sample", "1");
        const res = await fetch("/api/try/draft", { method: "POST", body });
        const data = await res.json().catch(() => null);
        if (res.status === 429) {
          setLimitHit(data?.message ?? "That's the demo limit for today.");
          update(id, { status: "error", error: "Demo limit reached" });
          return;
        }
        if (!res.ok || !data?.finding) {
          update(id, { status: "error", error: data?.message ?? "Couldn't draft this one." });
          return;
        }
        update(id, { status: "done", draft: data as Draft });
        if (!tracked.current) {
          tracked.current = true;
          trackEvent("TryDraft", {}, "trackCustom");
        }
      } catch {
        update(id, { status: "error", error: "Upload failed. Check your connection." });
      }
    },
    [update],
  );

  const onFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list?.length) return;
      const room = MAX_PHOTOS - items.length;
      const files = Array.from(list)
        .filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
        .slice(0, Math.max(0, room));
      if (!files.length) return;

      const queued = files.map((file) => ({
        file,
        item: {
          id: crypto.randomUUID(),
          preview: URL.createObjectURL(file),
          status: "working" as const,
        },
      }));
      setItems((prev) => [...prev, ...queued.map((q) => q.item)]);

      let next = 0;
      const worker = async () => {
        while (next < queued.length) {
          const q = queued[next++];
          await run(q.item.id, q.file);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queued.length) }, worker));
    },
    [items.length, run],
  );

  const onSamples = useCallback(async () => {
    setLoadingSamples(true);
    try {
      const files = await Promise.all(
        SAMPLES.map(async (s) => {
          const res = await fetch(`/try-samples/${s.file}`);
          return new File([await res.blob()], SAMPLE_PREFIX + s.file, { type: "image/jpeg" });
        }),
      );
      setUsedSamples(true);
      await onFiles(files);
    } finally {
      setLoadingSamples(false);
    }
  }, [onFiles]);

  const done = items.filter((i) => i.status === "done");
  const working = items.filter((i) => i.status === "working").length;

  const sections = useMemo(() => {
    const by = new Map<SectionType, { label: string; items: Item[] }>();
    for (const it of done) {
      const d = it.draft!;
      const g = by.get(d.section) ?? { label: d.section_label, items: [] };
      g.items.push(it);
      by.set(d.section, g);
    }
    const rank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
    return [...by.entries()]
      .sort(([a], [b]) => sectionOrder(a) - sectionOrder(b))
      .map(([type, g]) => ({
        type,
        label: g.label,
        items: g.items.sort((a, b) => rank(a.draft!.finding.severity) - rank(b.draft!.finding.severity)),
      }));
  }, [done]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
          See what Lookover writes from your own photos.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Pick 5 to 15 photos from a recent inspection — panel, water heater, roof, whatever
          you&apos;ve got. Each one comes back as a drafted finding, grouped by section the way
          the report reads. No signup, and the photos aren&apos;t saved.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length < MAX_PHOTOS && !limitHit && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFiles(e.dataTransfer.files);
          }}
          className="mt-8 w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-slate-400 hover:bg-slate-100"
        >
          <span className="block text-base font-medium text-slate-900">
            {items.length ? "Add more photos" : "Choose photos"}
          </span>
          <span className="mt-1 block text-sm text-slate-500">
            {items.length
              ? `${MAX_PHOTOS - items.length} more allowed`
              : "From your camera roll or computer · up to 15"}
          </span>
        </button>
      )}

      {items.length === 0 && !limitHit && (
        <p className="mt-4 text-center text-sm text-slate-600">
          Photos not on this device?{" "}
          <button
            type="button"
            onClick={() => void onSamples()}
            disabled={loadingSamples}
            className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700 disabled:opacity-50"
          >
            {loadingSamples ? "Loading samples…" : "Try it on 5 sample defect photos"}
          </button>
        </p>
      )}

      {limitHit && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          {limitHit}{" "}
          <Link href="/signup" className="font-medium underline">
            Start a free trial
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {items.map((it) => (
            <div key={it.id} className="relative h-16 w-16 overflow-hidden rounded-md ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.preview} alt="" className="h-full w-full object-cover" />
              {it.status !== "done" && (
                <div
                  className={`absolute inset-0 flex items-center justify-center text-[10px] font-medium ${
                    it.status === "error" ? "bg-red-600/70 text-white" : "bg-white/70 text-slate-700"
                  }`}
                  title={it.error}
                >
                  {it.status === "error" ? "Failed" : "Writing…"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {working > 0 && (
        <p className="mt-3 text-sm text-slate-500">
          Writing {working} finding{working === 1 ? "" : "s"}… about 15 seconds each.
        </p>
      )}
      {items.some((i) => i.status === "error" && i.error !== "Demo limit reached") && (
        <ul className="mt-2 text-sm text-red-700 space-y-1">
          {items
            .filter((i) => i.status === "error" && i.error !== "Demo limit reached")
            .map((i) => (
              <li key={i.id}>{i.error}</li>
            ))}
        </ul>
      )}

      {sections.length > 0 && (
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.type}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200 pb-2">
                {s.label}
              </h2>
              <div className="mt-4 space-y-4">
                {s.items.map((it) => {
                  const f = it.draft!.finding;
                  const c = SEVERITY_COLOR[f.severity];
                  return (
                    <article
                      key={it.id}
                      className="flex flex-col sm:flex-row gap-4 rounded-xl border border-slate-200 p-4"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.preview}
                        alt=""
                        className="w-full sm:w-40 h-48 sm:h-32 rounded-md object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${c.pill}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                          {SEVERITY_LABEL[f.severity]}
                        </span>
                        <h3 className="mt-2 font-semibold text-slate-900">{f.title}</h3>
                        <p className="mt-1 text-sm text-slate-700">{f.description}</p>
                        {f.recommended_action && (
                          <p className="mt-2 text-sm text-slate-900">
                            <span className="font-medium">Recommendation: </span>
                            {f.recommended_action}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {working === 0 && (
            <EmailFindings
              drafts={sections.flatMap((s) => s.items.map((it) => it.draft!))}
              sample={usedSamples}
            />
          )}

          <div className="rounded-xl bg-slate-900 p-6 sm:p-8 text-white">
            <h2 className="text-xl font-semibold">That&apos;s from photos alone.</h2>
            <p className="mt-2 text-slate-300">
              On a real inspection you say a few words per defect while you shoot, and the
              findings get sharper. You edit and approve every line, then it goes out as a
              branded PDF with your license — the TREC REI 7-6 form if you&apos;re in Texas.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center px-5 rounded-md bg-white text-slate-900 font-medium hover:bg-slate-100"
              >
                Run your next inspection on it
              </Link>
              <span className="text-sm text-slate-400">14-day free trial · no card</span>
            </div>
          </div>

          {usedSamples && (
            <p className="text-xs text-slate-400">
              Sample photos from Wikimedia Commons:{" "}
              {SAMPLES.map((s, i) => (
                <span key={s.file}>
                  {i > 0 && " · "}
                  <a href={s.source} target="_blank" rel="noopener noreferrer" className="underline">
                    {s.artist}
                  </a>{" "}
                  ({s.license})
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EmailFindings({ drafts, sample }: { drafts: Draft[]; sample: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const n = drafts.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/try/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sample, drafts }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "Couldn't send that. Try again.");
        setState("idle");
        return;
      }
      setState("sent");
      trackEvent("TryEmail", {}, "trackCustom");
    } catch {
      setError("Couldn't send that. Check your connection.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        Sent to {email}. Check your inbox in a minute. If it&apos;s not there, look in spam.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Email me {n === 1 ? "this finding" : `these ${n} findings`}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        So you can compare them with your own report later. They disappear when you leave this
        page. Enlil, who built Lookover, may write once to ask what you thought. No mailing list.
      </p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          aria-label="Email address"
          placeholder="you@yourcompany.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="h-11 rounded-md bg-slate-900 px-5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Send them"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </form>
  );
}
