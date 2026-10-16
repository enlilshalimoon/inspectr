import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { isLockedStatus } from "@/lib/inspection/lock";
import { createClient } from "@/lib/supabase/server";
import { labelForSection } from "@/lib/supabase/sections";
import type { SectionType } from "@/lib/supabase/types";
import type { Severity } from "@/lib/supabase/types";
import { isFindingDismissed } from "@/lib/inspection/photos";
import { CaptureClient, type CapturePhoto, type SectionOption } from "./capture-client";

type Props = { params: Promise<{ id: string }> };

export default async function CapturePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // These three are independent, and RLS scopes every one of them to the
  // signed-in inspector — so run them together rather than paying three
  // sequential round-trips on the first screen of a new inspection.
  const [{ data: inspection }, { data: sectionRows }, { data: photoRows }] = await Promise.all([
    supabase.from("inspections").select("id, status").eq("id", id).maybeSingle(),
    supabase
      .from("inspection_sections")
      .select("id, section_type, section_order")
      .eq("inspection_id", id)
      .order("section_order"),
    supabase
      .from("photos")
      .select(
        "id, section_id, storage_path, created_at, ai_analysis, findings(id, severity, title)",
      )
      .eq("inspection_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (!inspection) notFound();

  // Photos are uploaded straight from the browser, so the locked notice here
  // is what stops a finalized report from gaining photos (drafting is also
  // refused by the AI route).
  if (isLockedStatus(inspection.status as string)) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <p className="text-sm text-slate-700">
            <span className="font-medium">This report is finalized and locked.</span> To add
            photos, re-open it on the Finalize tab. You&apos;ll finalize again afterwards, which
            makes a new PDF.
          </p>
          <Link
            href={`/inspections/${id}/finalize`}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Go to Finalize →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const sections: SectionOption[] = (sectionRows ?? []).map((s) => ({
    id: s.id as string,
    type: s.section_type as SectionType,
    label: labelForSection(s.section_type as SectionType),
  }));

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

  type RowWithFindings = {
    id: string;
    section_id: string | null;
    storage_path: string;
    ai_analysis: unknown;
    findings?: { id: string; severity: Severity; title: string }[] | null;
  };
  const photos: CapturePhoto[] = ((photoRows ?? []) as unknown as RowWithFindings[]).map((p) => {
    const finding = p.findings?.[0] ?? null;
    return {
      id: p.id,
      section_id: p.section_id ?? null,
      storage_path: p.storage_path,
      url: signed[p.storage_path] ?? null,
      status: "uploaded" as const,
      ai_status: finding
        ? ("drafted" as const)
        : isFindingDismissed(p.ai_analysis)
          ? ("dismissed" as const)
          : ("idle" as const),
      finding: finding ? { id: finding.id, severity: finding.severity, title: finding.title } : null,
      voice: { state: "idle" as const },
    };
  });

  return (
    <CaptureClient
      inspectionId={id}
      userId={user.id}
      sections={sections}
      initialPhotos={photos}
    />
  );
}
