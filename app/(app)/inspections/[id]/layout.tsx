import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function InspectionLayout({ children, params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS will scope this to the inspector's own row; nothing for someone else.
  const { data: inspection } = await supabase
    .from("inspections")
    .select(
      "id, status, property_address, property_city, property_state, client_name, inspection_date",
    )
    .eq("id", id)
    .maybeSingle();

  if (!inspection) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/inspections" className="hover:text-slate-900">
            ← All inspections
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {inspection.property_address}
            {inspection.property_city ? `, ${inspection.property_city}` : ""}
            {inspection.property_state ? `, ${inspection.property_state}` : ""}
          </h1>
          <p className="text-sm text-slate-500">
            {inspection.client_name ? `Client: ${inspection.client_name} · ` : ""}
            {inspection.inspection_date ?? ""}
          </p>
        </div>
        <nav className="flex gap-1 text-sm border-b border-slate-200">
          <TabLink href={`/inspections/${id}/capture`}>Capture</TabLink>
          <TabLink href={`/inspections/${id}/review`}>Review</TabLink>
          <TabLink href={`/inspections/${id}/finalize`}>Finalize</TabLink>
        </nav>
      </header>
      {children}
    </div>
  );
}

function TabLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300 -mb-px"
    >
      {children}
    </Link>
  );
}
