"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().min(1, "Your name is required.").max(120),
  company_name: z.string().min(1, "Company name is required.").max(160),
  license_number: z.string().max(60).optional().nullable(),
  license_state: z.string().max(2).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  default_disclaimer: z.string().max(8000).optional().nullable(),
});

export type SettingsResult = { ok: true } | { ok: false; error: string };

export async function updateSettings(
  input: z.infer<typeof schema>,
): Promise<SettingsResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const patch = {
    full_name: parsed.data.full_name,
    company_name: parsed.data.company_name,
    license_number: parsed.data.license_number ?? null,
    license_state: parsed.data.license_state ? parsed.data.license_state.toUpperCase() : null,
    phone: parsed.data.phone ?? null,
    default_disclaimer: parsed.data.default_disclaimer ?? null,
  };
  const { error } = await supabase.from("users").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

const logoSchema = z.object({ storage_path: z.string().min(1).nullable() });

export async function updateLogo(input: z.infer<typeof logoSchema>): Promise<SettingsResult> {
  const parsed = logoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid logo path." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("users")
    .update({ company_logo_url: parsed.data.storage_path })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
