// Skeleton shown the instant the Finalize tab is clicked.

import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
          <div className="h-10 w-full rounded bg-slate-100 animate-pulse" />
          <div className="h-10 w-1/3 rounded bg-slate-200 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
