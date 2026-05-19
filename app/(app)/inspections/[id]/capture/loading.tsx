// Skeleton shown the instant the Capture tab is clicked.

import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
            <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-3 w-14 rounded bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
      <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="aspect-square rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="aspect-square rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
