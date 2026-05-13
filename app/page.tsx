import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // If already signed in, route by onboarding state.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: row } = await supabase
      .from("users")
      .select("onboarding_completed_at")
      .single();
    redirect(row?.onboarding_completed_at ? "/inspections" : "/onboarding");
  }

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Inspectr
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Start free trial
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 pt-10 pb-20">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900">
            Talk through the inspection.
            <br />
            Get the report drafted before you&apos;re back to your truck.
          </h1>
          <p className="text-lg text-slate-600">
            AI-assisted home inspection reports for residential inspectors. Walk the
            property, take photos, talk. We draft. You approve. Client gets a clean,
            branded report — same day.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center px-6 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800"
            >
              Start 14-day free trial
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center px-6 rounded-md border border-slate-200 bg-white text-slate-900 font-medium hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>
          <p className="text-xs text-slate-500 pt-1">
            No credit card. Up to 3 inspections during trial.
          </p>
        </div>
      </main>
    </div>
  );
}
