// Admin dashboard — gated by ADMIN_EMAILS env-var allowlist (see lib/auth/is-admin.ts).
//
// Surfaces signup activity for the team. Uses the service-role Supabase client so it
// can see all users + all inspections, not just the admin's own rows. That's safe
// because the access gate runs server-side BEFORE any service-role query, and the
// page never accepts user input that becomes a query (read-only dashboard).

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/is-admin";

export const metadata = {
  title: "Admin",
  // Don't index the admin route — robots and OG already covered by root layout,
  // but explicitly mark this one noindex as defense-in-depth.
  robots: { index: false, follow: false },
};

// Force this page to fetch fresh on every request — admins need real-time signup data,
// not a 5-minute-stale render.
export const dynamic = "force-dynamic";

type Signup = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  license_state: string | null;
  subscription_status: "trial" | "active" | "past_due" | "canceled" | null;
  created_at: string;
  onboarding_completed_at: string | null;
  trial_ends_at: string | null;
};

export default async function AdminPage() {
  // Standard auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/inspections");

  // Use service role for cross-user reads (bypasses RLS)
  const admin = createServiceClient();

  // Date.now() is hoisted into a helper so the component body stays pure
  // (React 19's purity lint flags impure calls in components).
  const { dayAgo, weekAgo, monthAgo } = getTimeWindows();

  // Headline metrics — parallel count queries
  const [
    totalSignups,
    signups24h,
    signups7d,
    signups30d,
    trialActive,
    paidActive,
    onboardedTotal,
    inspectionsTotal,
    inspectionsFinalized,
    recentSignupsRaw,
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }).gte("created_at", dayAgo),
    admin.from("users").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("users").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
    admin.from("users").select("*", { count: "exact", head: true }).eq("subscription_status", "trial"),
    admin.from("users").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
    admin.from("users").select("*", { count: "exact", head: true }).not("onboarding_completed_at", "is", null),
    admin.from("inspections").select("*", { count: "exact", head: true }),
    admin.from("inspections").select("*", { count: "exact", head: true }).not("finalized_at", "is", null),
    admin
      .from("users")
      .select(
        "id, email, full_name, company_name, license_state, subscription_status, created_at, onboarding_completed_at, trial_ends_at",
      )
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const signups: Signup[] = (recentSignupsRaw.data ?? []) as Signup[];

  // One round-trip for per-user inspection counts (so the table shows engagement)
  const userIds = signups.map((s) => s.id);
  const countsByUser: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: insp } = await admin
      .from("inspections")
      .select("inspector_id")
      .in("inspector_id", userIds);
    insp?.forEach((row) => {
      const id = row.inspector_id as string;
      countsByUser[id] = (countsByUser[id] ?? 0) + 1;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-500">
          Real-time signup activity. Refresh the page for fresh data.
        </p>
      </header>

      {/* Headline metrics — 2 rows of 4 cards */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500 font-medium">
          Totals
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total signups" value={totalSignups.count ?? 0} />
          <MetricCard label="Last 24 hours" value={signups24h.count ?? 0} />
          <MetricCard label="Last 7 days" value={signups7d.count ?? 0} />
          <MetricCard label="Last 30 days" value={signups30d.count ?? 0} />
          <MetricCard label="On trial" value={trialActive.count ?? 0} accent="blue" />
          <MetricCard label="Paid (active)" value={paidActive.count ?? 0} accent="green" />
          <MetricCard label="Onboarded" value={onboardedTotal.count ?? 0} />
          <MetricCard
            label="Reports finalized"
            value={inspectionsFinalized.count ?? 0}
            sub={`of ${inspectionsTotal.count ?? 0} total`}
          />
        </div>
      </section>

      {/* Recent signups table */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-slate-500 font-medium">
          Recent signups (last 25)
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Company</Th>
                <Th>State</Th>
                <Th>Status</Th>
                <Th>Onboarded</Th>
                <Th align="right">Inspections</Th>
                <Th>Trial ends</Th>
                <Th>Signed up</Th>
              </tr>
            </thead>
            <tbody>
              {signups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    No signups yet. They&apos;ll appear here in real time.
                  </td>
                </tr>
              ) : (
                signups.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <Td>{s.full_name ?? <Muted>—</Muted>}</Td>
                    <Td>
                      <span className="font-mono text-xs">{s.email}</span>
                    </Td>
                    <Td>{s.company_name ?? <Muted>—</Muted>}</Td>
                    <Td>{s.license_state ?? <Muted>—</Muted>}</Td>
                    <Td>
                      <StatusPill status={s.subscription_status} />
                    </Td>
                    <Td>
                      {s.onboarding_completed_at ? (
                        <span className="text-green-700">✓</span>
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </Td>
                    <Td align="right">{countsByUser[s.id] ?? 0}</Td>
                    <Td>{formatTrialEnds(s.trial_ends_at)}</Td>
                    <Td>
                      <span className="text-slate-500">{formatRelative(s.created_at)}</span>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-xs text-slate-400 pt-4 border-t border-slate-200">
        Admin access controlled via the <code className="font-mono">ADMIN_EMAILS</code>{" "}
        env var (Vercel → Settings → Environment Variables). Add a comma-separated
        email to grant a teammate access.
      </footer>
    </div>
  );
}

function getTimeWindows() {
  const now = Date.now();
  return {
    dayAgo: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    weekAgo: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    monthAgo: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: "blue" | "green";
}) {
  const accentColor =
    accent === "blue"
      ? "text-blue-700"
      : accent === "green"
        ? "text-green-700"
        : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accentColor}`}>
        {value.toLocaleString()}
      </div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: Signup["subscription_status"] }) {
  const styles: Record<string, string> = {
    trial: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-green-50 text-green-700 border-green-200",
    past_due: "bg-amber-50 text-amber-700 border-amber-200",
    canceled: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const cls = styles[status ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${cls}`}>
      {status ?? "—"}
    </span>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-400">{children}</span>;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatTrialEnds(iso: string | null): React.ReactNode {
  if (!iso) return <Muted>—</Muted>;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return <span className="text-amber-700">expired</span>;
  if (days === 0) return <span className="text-amber-700">today</span>;
  if (days <= 2) return <span className="text-amber-700">{days}d</span>;
  return <span className="text-slate-600">{days}d</span>;
}
