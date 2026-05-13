import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Inspection } from "@/lib/supabase/types";

const STATUS_LABEL: Record<Inspection["status"], string> = {
  in_progress: "In progress",
  review: "In review",
  finalized: "Finalized",
  delivered: "Delivered",
};

const STATUS_STYLE: Record<Inspection["status"], string> = {
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  review: "bg-sky-50 text-sky-800 border-sky-200",
  finalized: "bg-slate-100 text-slate-700 border-slate-200",
  delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export default async function InspectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed_at")
    .single();
  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  const { data: inspections } = await supabase
    .from("inspections")
    .select(
      "id, status, property_address, property_city, property_state, client_name, inspection_date, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inspections</h1>
          <p className="text-sm text-slate-500">
            All your inspections, newest first.
          </p>
        </div>
        <Link href="/inspections/new" className={buttonVariants()}>
          New inspection
        </Link>
      </div>

      {!inspections || inspections.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {inspections.map((i) => (
            <Card key={i.id}>
              <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <Link
                  href={routeFor(i)}
                  className="flex-1 min-w-0 group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[i.status as Inspection["status"]]}`}
                    >
                      {STATUS_LABEL[i.status as Inspection["status"]]}
                    </span>
                    <span className="text-xs text-slate-400">
                      {i.inspection_date
                        ? format(new Date(i.inspection_date), "MMM d, yyyy")
                        : format(new Date(i.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="mt-1 font-medium text-slate-900 truncate group-hover:underline underline-offset-4">
                    {i.property_address}
                    {i.property_city ? `, ${i.property_city}` : ""}
                    {i.property_state ? `, ${i.property_state}` : ""}
                  </div>
                  {i.client_name && (
                    <div className="text-sm text-slate-500 truncate">
                      Client: {i.client_name}
                    </div>
                  )}
                </Link>
                <Link
                  href={routeFor(i)}
                  className="text-sm text-slate-600 hover:text-slate-900 shrink-0"
                >
                  Open →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function routeFor(i: { id: string; status: string }) {
  if (i.status === "in_progress") return `/inspections/${i.id}/capture`;
  if (i.status === "review") return `/inspections/${i.id}/review`;
  return `/inspections/${i.id}/finalize`;
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="p-10 text-center space-y-3">
        <h2 className="text-lg font-medium text-slate-900">No inspections yet</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Start your first inspection. On the property, take photos and talk
          through what you see. We&apos;ll draft the report.
        </p>
        <div className="pt-2">
          <Link href="/inspections/new" className={buttonVariants()}>
            Start new inspection
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
