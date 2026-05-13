"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STANDARD_SECTIONS } from "@/lib/supabase/sections";

export type NewInspectionState = { error?: string } | null;

const schema = z.object({
  property_address: z.string().min(1, "Property address is required.").max(300),
  property_city: z.string().max(120).optional().nullable(),
  property_state: z.string().max(2).optional().nullable(),
  property_zip: z.string().max(15).optional().nullable(),
  property_year_built: z
    .union([z.string().regex(/^\d{4}$/), z.literal("")])
    .transform((v) => (v ? Number(v) : null))
    .optional()
    .nullable(),
  property_sqft: z
    .union([z.string().regex(/^\d+$/), z.literal("")])
    .transform((v) => (v ? Number(v) : null))
    .optional()
    .nullable(),
  property_type: z
    .enum(["single_family", "condo", "townhouse", "multi_family", ""])
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
  client_name: z.string().max(160).optional().nullable(),
  client_email: z.string().email("Invalid email.").optional().or(z.literal("")).nullable(),
  client_phone: z.string().max(40).optional().nullable(),
  inspection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.").optional().nullable(),
});

export async function createInspection(
  _prev: NewInspectionState,
  formData: FormData,
): Promise<NewInspectionState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  // normalize empty strings to undefined for optional fields
  for (const k of Object.keys(raw)) if (raw[k] === "") raw[k] = "";

  const parsed = schema.safeParse({
    property_address: raw.property_address,
    property_city: raw.property_city || null,
    property_state: raw.property_state ? raw.property_state.toUpperCase() : null,
    property_zip: raw.property_zip || null,
    property_year_built: raw.property_year_built ?? "",
    property_sqft: raw.property_sqft ?? "",
    property_type: raw.property_type as "single_family" | "condo" | "townhouse" | "multi_family" | "",
    client_name: raw.client_name || null,
    client_email: raw.client_email || "",
    client_phone: raw.client_phone || null,
    inspection_date: raw.inspection_date || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const payload = {
    inspector_id: user.id,
    status: "in_progress" as const,
    property_address: parsed.data.property_address,
    property_city: parsed.data.property_city,
    property_state: parsed.data.property_state,
    property_zip: parsed.data.property_zip,
    property_year_built: parsed.data.property_year_built,
    property_sqft: parsed.data.property_sqft,
    property_type: parsed.data.property_type,
    client_name: parsed.data.client_name,
    client_email: parsed.data.client_email || null,
    client_phone: parsed.data.client_phone,
    inspection_date:
      parsed.data.inspection_date ?? new Date().toISOString().slice(0, 10),
    share_url_slug: cryptoSlug(),
  };

  const { data: created, error } = await supabase
    .from("inspections")
    .insert(payload)
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Could not create inspection." };

  // Pre-create the required sections so capture can assign photos to them.
  const sectionRows = STANDARD_SECTIONS.filter((s) => s.required).map((s) => ({
    inspection_id: created.id,
    section_type: s.type,
    section_order: s.order,
  }));
  await supabase.from("inspection_sections").insert(sectionRows);

  redirect(`/inspections/${created.id}/capture`);
}

function cryptoSlug() {
  // 8-char URL-safe slug for client share URLs. Not cryptographically perfect
  // but plenty for share links scoped under RLS / signed access.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  for (const b of buf) out += alphabet[b % alphabet.length];
  return out;
}
