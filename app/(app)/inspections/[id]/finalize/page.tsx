import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { FinalizePanel } from "./finalize-panel";
import { loadTrecStatus } from "@/lib/trec/load";
import { sectionsNeedingStatus } from "@/lib/inspection/system-status";
import { labelForSection } from "@/lib/supabase/sections";

type Props = { params: Promise<{ id: string }> };

export default async function FinalizePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: inspection } = await supabase
    .from("inspections")
    .select(
      "id, status, finalized_at, delivered_at, share_url_slug, pdf_url, property_address, client_email, client_name",
    )
    .eq("id", id)
    .maybeSingle();
  if (!inspection) notFound();

  const { count: totalFindings } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", id);
  const { count: unapproved } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", id)
    .eq("is_approved", false);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const trec = user
    ? await loadTrecStatus(supabase, id, user.id)
    : { applies: false, missing: [] };
  // Systems inventory: warn (don't block) when a section has no status.
  const { data: sectionRows } = await supabase
    .from("inspection_sections")
    .select("*")
    .eq("inspection_id", id);
  const missingStatus = sectionsNeedingStatus(sectionRows ?? []).map(labelForSection);

  // Pre-sign the PDF if it exists so we can offer a download
  let pdfSignedUrl: string | null = null;
  if (inspection.pdf_url) {
    const { data: signed } = await supabase.storage
      .from("report-assets")
      .createSignedUrl(inspection.pdf_url, 60 * 60);
    pdfSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <FinalizePanel
      inspectionId={id}
      status={inspection.status}
      finalizedAt={inspection.finalized_at}
      deliveredAt={inspection.delivered_at}
      shareSlug={inspection.share_url_slug}
      pdfSignedUrl={pdfSignedUrl}
      totalFindings={totalFindings ?? 0}
      unapprovedCount={unapproved ?? 0}
      missingStatus={missingStatus}
      defaultClientEmail={inspection.client_email}
      clientName={inspection.client_name}
      trec={trec}
    />
  );
}

// re-export for compatibility if needed
export const dynamic = "force-dynamic";
