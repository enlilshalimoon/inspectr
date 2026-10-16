"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { renderInspectionPdf } from "@/lib/pdf/render";
import { sendFounderEmail, firstInspectionFeedbackEmail } from "@/lib/email/send";
import { withDismissed } from "@/lib/inspection/photos";
import { finalizedStatus, isFirstFinalize, isLockedStatus, lockError, LOCKED_MESSAGE } from "@/lib/inspection/lock";
import { loadTrecStatus } from "@/lib/trec/load";
import { STANDARD_SECTIONS } from "@/lib/supabase/sections";
import type { SectionType } from "@/lib/supabase/types";
import {
  SYSTEM_STATUSES,
  encodeNotesFallback,
  isMissingColumnError,
  type SectionStatus,
} from "@/lib/inspection/system-status";

// All actions enforce RLS via the user's session client (no service role).
// Each one revalidates the review page so server-rendered state stays in sync.

const SEVERITY = z.enum(["info", "monitor", "minor_repair", "major_repair", "safety_hazard"]);

const updateSchema = z.object({
  finding_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().min(1).max(4000).optional(),
  recommended_action: z.string().max(2000).optional().nullable(),
  severity: SEVERITY.optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateFinding(input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const locked = await lockError(supabase, { findingId: parsed.data.finding_id });
  if (locked) return { ok: false, error: locked };
  const patch: Record<string, unknown> = { inspector_edited: true };
  for (const k of ["title", "description", "recommended_action", "severity"] as const) {
    if (parsed.data[k] !== undefined) patch[k] = parsed.data[k];
  }

  const { error } = await supabase
    .from("findings")
    .update(patch)
    .eq("id", parsed.data.finding_id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/inspections/${parsed.data.inspection_id}/review`);
  return { ok: true };
}

const approveSchema = z.object({
  finding_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
  approved: z.boolean(),
});

export async function setFindingApproved(input: z.infer<typeof approveSchema>): Promise<ActionResult> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const locked = await lockError(supabase, { findingId: parsed.data.finding_id });
  if (locked) return { ok: false, error: locked };
  const { error } = await supabase
    .from("findings")
    .update({ is_approved: parsed.data.approved })
    .eq("id", parsed.data.finding_id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/inspections/${parsed.data.inspection_id}/review`);
  return { ok: true };
}

const bulkApproveSchema = z.object({
  inspection_id: z.string().uuid(),
  section_id: z.string().uuid().nullable(),
});

export async function approveAllInSection(
  input: z.infer<typeof bulkApproveSchema>,
): Promise<ActionResult> {
  const parsed = bulkApproveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const locked = await lockError(supabase, { inspectionId: parsed.data.inspection_id });
  if (locked) return { ok: false, error: locked };
  let q = supabase
    .from("findings")
    .update({ is_approved: true })
    .eq("inspection_id", parsed.data.inspection_id);
  q = parsed.data.section_id ? q.eq("section_id", parsed.data.section_id) : q.is("section_id", null);
  const { error } = await q;

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/inspections/${parsed.data.inspection_id}/review`);
  return { ok: true };
}

const sectionStatusSchema = z
  .object({
    inspection_id: z.string().uuid(),
    section_type: z.enum(STANDARD_SECTIONS.map((s) => s.type) as [SectionType, ...SectionType[]]),
    status: z.enum(SYSTEM_STATUSES),
    reason: z.string().max(500).optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
  })
  .refine((v) => v.status !== "not_inspected" || !!v.reason?.trim(), {
    message: "Say why it wasn't inspected (state rules require a reason).",
    path: ["reason"],
  });

// Saves the systems-inventory status for one section, creating the section
// row if it's an optional one (fireplace, pool...) the inspection never used.
export async function setSectionStatus(
  input: z.infer<typeof sectionStatusSchema>,
): Promise<ActionResult> {
  const parsed = sectionStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { inspection_id, section_type } = parsed.data;

  const supabase = await createClient();
  const { data: insp } = await supabase
    .from("inspections")
    .select("id, status")
    .eq("id", inspection_id)
    .maybeSingle();
  if (!insp) return { ok: false, error: "Inspection not found." };
  if (isLockedStatus(insp.status)) return { ok: false, error: LOCKED_MESSAGE };

  const { data: existing } = await supabase
    .from("inspection_sections")
    .select("id")
    .eq("inspection_id", inspection_id)
    .eq("section_type", section_type)
    .maybeSingle();
  let sectionId = existing?.id as string | undefined;
  if (!sectionId) {
    const order = STANDARD_SECTIONS.find((s) => s.type === section_type)?.order ?? 999;
    const { data: created, error } = await supabase
      .from("inspection_sections")
      .insert({ inspection_id, section_type, section_order: order })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: error?.message ?? "Could not add section." };
    sectionId = created.id as string;
  }

  const value: SectionStatus = {
    status: parsed.data.status,
    reason: parsed.data.reason?.trim() || null,
    description: parsed.data.description?.trim() || null,
  };
  let { error } = await supabase
    .from("inspection_sections")
    .update({ system_status: value })
    .eq("id", sectionId);
  if (isMissingColumnError(error, "system_status")) {
    // Migration 0004 not run yet: park it in inspector_notes (unused elsewhere).
    ({ error } = await supabase
      .from("inspection_sections")
      .update({ inspector_notes: encodeNotesFallback(value) })
      .eq("id", sectionId));
  }
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/inspections/${inspection_id}/review`);
  revalidatePath(`/inspections/${inspection_id}/finalize`);
  return { ok: true };
}

const sendEmailSchema = z.object({
  inspection_id: z.string().uuid(),
  recipient_email: z.string().email("Invalid email."),
  custom_message: z.string().max(2000).optional().nullable(),
});

export type SendEmailResult =
  | { ok: true; delivered_to: string }
  | { ok: false; error: string };

export async function sendReportEmail(
  input: z.infer<typeof sendEmailSchema>,
): Promise<SendEmailResult> {
  const parsed = sendEmailSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: inspection } = await supabase
    .from("inspections")
    .select(
      "id, status, share_url_slug, property_address, property_city, property_state",
    )
    .eq("id", parsed.data.inspection_id)
    .maybeSingle();
  if (!inspection) return { ok: false, error: "Inspection not found." };

  if (inspection.status !== "finalized" && inspection.status !== "delivered") {
    return { ok: false, error: "Finalize the report before sending." };
  }
  if (!inspection.share_url_slug) {
    return { ok: false, error: "No share link generated for this inspection." };
  }

  const { data: inspector } = await supabase
    .from("users")
    .select("full_name, company_name")
    .eq("id", user.id)
    .maybeSingle();

  // Lazy-load resend so the route still builds without the key set
  const apiKey = process.env.RESEND_API_KEY;
  // Production should set RESEND_FROM_EMAIL via Vercel env (e.g. reports@uselookover.com)
  // once the Resend domain verification completes. Fallback is here only so the route
  // builds cleanly in dev / on first deploy.
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "reports@uselookover.com";
  if (!apiKey) return { ok: false, error: "Email service not configured (RESEND_API_KEY missing)." };
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = `${appUrl}/report/${inspection.share_url_slug}`;
  const propertyLine = [
    inspection.property_address,
    [inspection.property_city, inspection.property_state].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  const inspectorName = inspector?.full_name ?? "Your inspector";
  const company = inspector?.company_name ?? "";
  const fromName = company || inspectorName;
  const subject = `Your inspection report — ${inspection.property_address}`;

  const customBlock = parsed.data.custom_message?.trim()
    ? `<p style="white-space:pre-wrap;color:#334155;font-size:14px;line-height:1.6;margin:0 0 24px">${escapeHtml(parsed.data.custom_message)}</p>`
    : "";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">Inspection Report</p>
  <h1 style="font-size:22px;font-weight:600;margin:0 0 8px;color:#0f172a">${escapeHtml(inspection.property_address)}</h1>
  <p style="font-size:14px;color:#64748b;margin:0 0 24px">${escapeHtml(propertyLine)}</p>
  ${customBlock}
  <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 24px">
    Your inspection report for the above property is ready to view. Click below to open the report. The report is mobile-friendly and you can also download a PDF.
  </p>
  <p style="margin:0 0 32px">
    <a href="${shareUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:500">View report</a>
  </p>
  <p style="font-size:12px;color:#64748b;margin:0 0 4px">${escapeHtml(inspectorName)}${company ? ` &middot; ${escapeHtml(company)}` : ""}</p>
  <p style="font-size:11px;color:#94a3b8;margin:24px 0 0">If the button doesn't work, copy and paste this link:</p>
  <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;word-break:break-all">${shareUrl}</p>
</div>
`.trim();

  const text = `Inspection Report — ${inspection.property_address}\n${propertyLine}\n\n${parsed.data.custom_message?.trim() ?? ""}\n\nView the report: ${shareUrl}\n\n${inspectorName}${company ? ` · ${company}` : ""}\n`;

  try {
    const res = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: parsed.data.recipient_email,
      subject,
      html,
      text,
      replyTo: user.email ?? undefined,
    });
    if (res.error) {
      console.error("[resend] error:", res.error);
      return { ok: false, error: res.error.message };
    }
  } catch (err) {
    console.error("[email] send failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  await supabase
    .from("inspections")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", inspection.id);

  await supabase.from("inspection_activity").insert({
    inspection_id: inspection.id,
    user_id: user.id,
    action_type: "report_emailed",
    metadata: { to: parsed.data.recipient_email },
  });

  revalidatePath(`/inspections/${inspection.id}/finalize`);
  return { ok: true, delivered_to: parsed.data.recipient_email };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const finalizeSchema = z.object({ inspection_id: z.string().uuid() });

export type FinalizeResult =
  | { ok: true; share_slug: string; pdf_path: string }
  | { ok: false; error: string };

export async function finalizeInspection(
  input: z.infer<typeof finalizeSchema>,
): Promise<FinalizeResult> {
  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const inspectionId = parsed.data.inspection_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Verify we own this inspection + check unapproved count
  const { data: insp, error: inspErr } = await supabase
    .from("inspections")
    .select("id, share_url_slug, status, finalized_at, delivered_at")
    .eq("id", inspectionId)
    .maybeSingle();
  if (inspErr || !insp) return { ok: false, error: "Inspection not found." };
  if (isLockedStatus(insp.status)) return { ok: false, error: "This report is already finalized." };

  const { count: unapproved, error: countErr } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("inspection_id", inspectionId)
    .eq("is_approved", false);
  if (countErr) return { ok: false, error: countErr.message };
  if ((unapproved ?? 0) > 0) {
    return {
      ok: false,
      error: `${unapproved} finding${unapproved === 1 ? "" : "s"} still need approval before finalizing.`,
    };
  }

  // Texas: the TREC form needs a checkbox on every item before it can go out.
  const trec = await loadTrecStatus(supabase, inspectionId, user.id);
  if (trec.missing.length) {
    return {
      ok: false,
      error: `${trec.missing.length} TREC form item${trec.missing.length === 1 ? "" : "s"} still need a checkbox (I, NI, NP or D) on the Review tab, e.g. ${trec.missing[0]}.`,
    };
  }

  // Render and save the PDF before marking the report finalized, so a failure
  // leaves it editable and Finalize can simply be pressed again.
  const finalizedAt = new Date().toISOString();
  let pdfBuf: Buffer;
  try {
    pdfBuf = await renderInspectionPdf(inspectionId, "session", finalizedAt);
  } catch (err) {
    console.error("[finalize] pdf render failed:", err);
    return { ok: false, error: "PDF rendering failed. Nothing was finalized; try again." };
  }

  // Upload to private report-assets bucket. Path is scoped per RLS policy.
  const pdfPath = `${user.id}/${inspectionId}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("report-assets")
    .upload(pdfPath, pdfBuf, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });
  if (upErr) {
    return { ok: false, error: `PDF upload failed (${upErr.message}). Nothing was finalized; try again.` };
  }

  const { error: updErr } = await supabase
    .from("inspections")
    .update({
      status: finalizedStatus(insp.delivered_at as string | null),
      finalized_at: finalizedAt,
      pdf_url: pdfPath,
    })
    .eq("id", inspectionId);
  if (updErr) return { ok: false, error: updErr.message };

  // First-finalized-report feedback. If this is the inspector's first ever finalized
  // inspection, send a personal founder-voice feedback ask. Best-effort and fully
  // isolated — a failure here must never affect the finalize result.
  try {
    const { count: finalizedCount } = await supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("inspector_id", user.id)
      .not("finalized_at", "is", null);
    if (isFirstFinalize(insp.finalized_at as string | null, finalizedCount ?? 0)) {
      const [{ data: profile }, { data: inspRow }] = await Promise.all([
        supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("inspections")
          .select("property_address, property_city")
          .eq("id", inspectionId)
          .maybeSingle(),
      ]);
      const propertyLabel = [inspRow?.property_address, inspRow?.property_city]
        .filter(Boolean)
        .join(", ");
      const fb = firstInspectionFeedbackEmail({
        firstName: profile?.full_name ?? null,
        propertyLabel: propertyLabel || null,
      });
      if (user.email) {
        await sendFounderEmail({
          to: user.email,
          subject: fb.subject,
          html: fb.html,
          text: fb.text,
        });
      }
    }
  } catch (err) {
    console.error("[finalize] first-inspection feedback email failed (non-fatal):", err);
  }

  revalidatePath(`/inspections/${inspectionId}/review`);
  revalidatePath(`/inspections/${inspectionId}/finalize`);
  return { ok: true, share_slug: insp.share_url_slug as string, pdf_path: pdfPath };
}

// Unlocks a finalized report for edits. The client link stops showing it until
// the inspector finalizes again, which renders a fresh PDF, so the link and the
// PDF never disagree.
export async function reopenInspection(
  input: z.infer<typeof finalizeSchema>,
): Promise<ActionResult> {
  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const inspectionId = parsed.data.inspection_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: insp } = await supabase
    .from("inspections")
    .select("id, status")
    .eq("id", inspectionId)
    .maybeSingle();
  if (!insp) return { ok: false, error: "Inspection not found." };
  if (!isLockedStatus(insp.status)) return { ok: true };

  const { error } = await supabase
    .from("inspections")
    .update({ status: "review" })
    .eq("id", inspectionId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("inspection_activity").insert({
    inspection_id: inspectionId,
    user_id: user.id,
    action_type: "report_reopened",
    metadata: { from_status: insp.status },
  });

  revalidatePath(`/inspections/${inspectionId}`, "layout");
  return { ok: true };
}

const deleteSchema = z.object({
  finding_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
});

export async function deleteFinding(input: z.infer<typeof deleteSchema>): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const locked = await lockError(supabase, { findingId: parsed.data.finding_id });
  if (locked) return { ok: false, error: locked };
  const { data: finding } = await supabase
    .from("findings")
    .select("photo_id")
    .eq("id", parsed.data.finding_id)
    .maybeSingle();
  const { error } = await supabase.from("findings").delete().eq("id", parsed.data.finding_id);

  if (error) return { ok: false, error: error.message };

  // Mark the photo so Capture doesn't quietly draft it again next time it opens.
  if (finding?.photo_id) {
    const { data: photo } = await supabase
      .from("photos")
      .select("ai_analysis")
      .eq("id", finding.photo_id)
      .maybeSingle();
    if (photo) {
      await supabase
        .from("photos")
        .update({ ai_analysis: withDismissed(photo.ai_analysis, true) })
        .eq("id", finding.photo_id);
    }
  }
  revalidatePath(`/inspections/${parsed.data.inspection_id}/review`);
  return { ok: true };
}
