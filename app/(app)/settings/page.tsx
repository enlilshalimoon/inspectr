import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    // "*" so the page still loads before migration 0004 adds
    // license_expires / sop_standard; their fields only show once it has.
    .select("*")
    .eq("id", user.id)
    .single();
  const hasComplianceColumns = !!profile && "sop_standard" in profile;

  // Pre-sign the logo URL if it's set
  let logoSignedUrl: string | null = null;
  if (profile?.company_logo_url) {
    const { data: signed } = await supabase.storage
      .from("report-assets")
      .createSignedUrl(profile.company_logo_url, 60 * 60);
    logoSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Your name, company info, license, and default disclaimer. These appear on every report.
        </p>
      </div>
      <SettingsForm
        userId={user.id}
        complianceFields={hasComplianceColumns}
        defaults={{
          full_name: profile?.full_name ?? "",
          company_name: profile?.company_name ?? "",
          license_number: profile?.license_number ?? "",
          license_state: profile?.license_state ?? "",
          phone: profile?.phone ?? "",
          default_disclaimer: profile?.default_disclaimer ?? "",
          license_expires: (profile?.license_expires as string | null | undefined) ?? "",
          sop_standard: (profile?.sop_standard as string | null | undefined) ?? "",
          company_logo_url: profile?.company_logo_url ?? null,
          logo_signed_url: logoSignedUrl,
        }}
      />
    </div>
  );
}
