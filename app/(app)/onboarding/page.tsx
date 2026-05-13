import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "full_name, company_name, company_logo_url, license_number, license_state, phone, default_disclaimer, onboarding_completed_at",
    )
    .single();

  if (profile?.onboarding_completed_at) redirect("/inspections");

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <div className="space-y-2 mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Set up your profile</h1>
        <p className="text-sm text-slate-500">
          This info goes on every report. You can change it later in Settings.
        </p>
      </div>
      <OnboardingForm
        defaults={{
          fullName: profile?.full_name ?? "",
          companyName: profile?.company_name ?? "",
          licenseNumber: profile?.license_number ?? "",
          licenseState: profile?.license_state ?? "",
          phone: profile?.phone ?? "",
          defaultDisclaimer: profile?.default_disclaimer ?? DEFAULT_DISCLAIMER,
        }}
      />
    </div>
  );
}

const DEFAULT_DISCLAIMER = `This report reflects the inspector's observations on the date of inspection. It is a visual, non-invasive assessment of accessible systems and components and is not a guarantee, warranty, or insurance policy regarding the property's condition. Findings represent the inspector's professional opinion. Some defects may not be visible at the time of inspection. The client is encouraged to obtain further evaluation from licensed specialists for any items flagged for further review.`;
