// Streamed instantly when navigating to the Review tab, before the server
// finishes the DB roundtrip. Keeps the interaction feeling immediate.

import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-1/3 bg-slate-300 animate-pulse" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 flex flex-wrap gap-6">
          <Stat />
          <Stat />
          <Stat />
        </CardContent>
      </Card>
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );
}

function Stat() {
  return (
    <div className="space-y-1">
      <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
      <div className="h-4 w-10 rounded bg-slate-200 animate-pulse" />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="h-4 w-24 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
