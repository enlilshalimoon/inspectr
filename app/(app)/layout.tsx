import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/lib/auth/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, company_name, onboarding_completed_at")
    .single();

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/inspections" className="text-base font-semibold text-slate-900">
              Inspectr
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <NavLink href="/inspections">Inspections</NavLink>
              <NavLink href="/settings">Settings</NavLink>
              <NavLink href="/billing">Billing</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500">
              {profile?.company_name ?? profile?.full_name ?? user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
