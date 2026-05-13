import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default function NewInspectionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">New inspection</h1>
        <p className="text-sm text-slate-500">
          Property and client info. We&apos;ll wire this up to address autocomplete next.
        </p>
      </div>
      <Card>
        <CardContent className="p-10 text-center space-y-3">
          <p className="text-sm text-slate-500">
            Coming in week 2 of the build — property form, client info, and the
            handoff to mobile capture.
          </p>
          <Link href="/inspections" className={buttonVariants({ variant: "outline" })}>
            Back to inspections
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
