import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./update-password-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Set a new password" };

export default async function PasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-10 space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-900">Set a new password</h1>
        <p className="text-sm text-slate-500">Choose a new password for your account.</p>
      </div>
      <UpdatePasswordForm />
    </div>
  );
}
