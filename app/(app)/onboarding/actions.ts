"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string } | null;

// Only the name is required. Everything else is report branding a new
// inspector can fill in later from Settings. Requiring a license number and
// phone before they'd seen a single drafted finding was a wall: trainees and
// people just trying it out don't have (or won't hand over) a license number.
const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v === "" ? null : v));

const schema = z.object({
  fullName: z.string().trim().min(1, "Your name is required.").max(120),
  companyName: optionalText(160),
  licenseNumber: optionalText(60),
  licenseState: optionalText(2, "Use the 2-letter state code, e.g. TX.").refine(
    (v) => v === null || /^[A-Z]{2}$/.test(v),
    "Use the 2-letter state code, e.g. TX.",
  ),
  phone: optionalText(30),
  defaultDisclaimer: optionalText(8000),
});

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName") ?? "",
    companyName: formData.get("companyName") ?? "",
    licenseNumber: formData.get("licenseNumber") ?? "",
    licenseState: ((formData.get("licenseState") as string | null) ?? "").toUpperCase(),
    phone: formData.get("phone") ?? "",
    defaultDisclaimer: formData.get("defaultDisclaimer") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("users")
    .update({
      full_name: parsed.data.fullName,
      company_name: parsed.data.companyName,
      license_number: parsed.data.licenseNumber,
      license_state: parsed.data.licenseState,
      phone: parsed.data.phone,
      default_disclaimer: parsed.data.defaultDisclaimer,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  // Straight into the first inspection. The empty inspections list was one
  // more screen between signup and the first photo.
  redirect("/inspections/new");
}
