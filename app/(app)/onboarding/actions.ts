"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string } | null;

const schema = z.object({
  fullName: z.string().min(1, "Your name is required.").max(120),
  companyName: z.string().min(1, "Company name is required.").max(160),
  licenseNumber: z.string().min(1, "License number is required.").max(60),
  licenseState: z.string().min(2, "State is required.").max(2),
  phone: z.string().min(7, "Phone is required.").max(30),
  defaultDisclaimer: z.string().min(1, "Disclaimer is required."),
});

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    companyName: formData.get("companyName"),
    licenseNumber: formData.get("licenseNumber"),
    licenseState: (formData.get("licenseState") as string | null)?.toUpperCase(),
    phone: formData.get("phone"),
    defaultDisclaimer: formData.get("defaultDisclaimer"),
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
  redirect("/inspections");
}
