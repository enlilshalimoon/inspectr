"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Camera, Trash2, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { SectionType } from "@/lib/supabase/types";

export type SectionOption = { id: string; type: SectionType; label: string };
export type CapturePhoto = {
  id: string;
  section_id: string | null;
  storage_path: string;
  url: string | null;
  status: "uploading" | "uploaded" | "failed";
  // for optimistic display
  localUrl?: string;
  errorMessage?: string;
};

type Props = {
  inspectionId: string;
  userId: string;
  sections: SectionOption[];
  initialPhotos: CapturePhoto[];
};

export function CaptureClient({ inspectionId, userId, sections, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<CapturePhoto[]>(initialPhotos);
  const [currentSectionId, setCurrentSectionId] = useState<string>(
    sections[0]?.id ?? "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Allow multi-pick on desktop / iOS-photo-library mode.
      const list = Array.from(files);
      // Reset the input so the same file can be re-selected later if needed.
      if (fileInputRef.current) fileInputRef.current.value = "";

      for (const file of list) {
        await uploadOne(file, currentSectionId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSectionId],
  );

  async function uploadOne(file: File, sectionId: string) {
    const tempId = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);

    setPhotos((prev) => [
      {
        id: tempId,
        section_id: sectionId || null,
        storage_path: "",
        url: null,
        localUrl,
        status: "uploading",
      },
      ...prev,
    ]);

    try {
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
      if (insErr || !row) throw insErr ?? new Error("Insert failed");

      // Generate a signed URL so we can show it (storage is private).
      const { data: signed } = await supabase.storage
        .from("inspection-media")
        .createSignedUrl(storagePath, 60 * 60);

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
                ...p,
                id: row.id as string,
                storage_path: storagePath,
                url: signed?.signedUrl ?? null,
                status: "uploaded",
              }
            : p,
        ),
      );
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

  async function retryUpload(photo: CapturePhoto) {
    // Re-trigger upload by opening the file picker again.
    // Simpler than caching the File object across renders.
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    fileInputRef.current?.click();
  }

  async function deletePhoto(photo: CapturePhoto) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    // best-effort cleanup; if it fails we just leave orphans for now
    if (photo.storage_path) {
      await supabase.storage.from("inspection-media").remove([photo.storage_path]);
    }
    if (photo.status === "uploaded") {
      await supabase.from("photos").delete().eq("id", photo.id);
    }
  }

  const currentSection = sections.find((s) => s.id === currentSectionId);
  const countsBySection = countByKey(photos, (p) => p.section_id ?? "_unassigned");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-slate-500">Current section</div>
              <select
                value={currentSectionId}
                onChange={(e) => setCurrentSectionId(e.target.value)}
                className="text-base font-medium text-slate-900 bg-transparent border-0 -ml-1 px-1 py-0 focus:outline-none focus:ring-2 focus:ring-slate-200 rounded"
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
            <div className="text-xs text-slate-400">{photos.length} photo{photos.length === 1 ? "" : "s"}</div>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-3 h-20 rounded-xl bg-slate-900 text-white font-medium text-lg hover:bg-slate-800 active:bg-slate-700 transition-colors shadow-sm"
      >
        <Camera className="h-6 w-6" />
        Take photo for {currentSection?.label ?? "section"}
      </button>

      {photos.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-500">
            No photos yet. Tap the button above to take your first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <PhotoTile
              key={p.id}
              photo={p}
              sectionLabel={sections.find((s) => s.id === p.section_id)?.label ?? "Unassigned"}
              onDelete={() => deletePhoto(p)}
              onRetry={() => retryUpload(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoTile({
  photo,
  sectionLabel,
  onDelete,
  onRetry,
}: {
  photo: CapturePhoto;
  sectionLabel: string;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const src = photo.url ?? photo.localUrl ?? "";
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={sectionLabel} className="h-full w-full object-cover" />
      )}
      {photo.status === "uploading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs">
          Uploading…
        </div>
      )}
      {photo.status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-600/80 text-white text-xs p-2 text-center">
          <span>Upload failed</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30"
          >
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete photo"
        className="absolute top-1 right-1 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-black/50 text-white">
        {sectionLabel}
      </div>
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

function guessExtension(file: File): string {
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("heic")) return "heic";
  return "jpg";
}
