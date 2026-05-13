import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { labelForSection } from "@/lib/supabase/sections";
import type { SectionType } from "@/lib/supabase/types";
import { CaptureClient, type CapturePhoto, type SectionOption } from "./capture-client";

type Props = { params: Promise<{ id: string }> };

export default async function CapturePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: inspection } = await supabase
    .from("inspections")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!inspection) notFound();

  const { data: sectionRows } = await supabase
    .from("inspection_sections")
    .select("id, section_type, section_order")
    .eq("inspection_id", id)
    .order("section_order");

  const sections: SectionOption[] = (sectionRows ?? []).map((s) => ({
    id: s.id as string,
    type: s.section_type as SectionType,
    label: labelForSection(s.section_type as SectionType),
  }));

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, section_id, storage_path, created_at")
    .eq("inspection_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Sign URLs for existing photos (1h validity is fine for a capture session).
  const paths = (photoRows ?? []).map((p) => p.storage_path as string);
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data: urls } = await supabase.storage
      .from("inspection-media")
      .createSignedUrls(paths, 60 * 60);
    for (const u of urls ?? []) {
      if (u.signedUrl && u.path) signed[u.path] = u.signedUrl;
    }
  }

  const photos: CapturePhoto[] = (photoRows ?? []).map((p) => ({
    id: p.id as string,
    section_id: (p.section_id as string | null) ?? null,
    storage_path: p.storage_path as string,
    url: signed[p.storage_path as string] ?? null,
    status: "uploaded" as const,
  }));

  return (
    <CaptureClient
      inspectionId={id}
      userId={user.id}
      sections={sections}
      initialPhotos={photos}
    />
  );
}
