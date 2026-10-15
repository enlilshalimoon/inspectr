"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendFollowup, type FollowupResult } from "./actions";

export function FollowupButton({ count, lifetime }: { count: number; lifetime: number }) {
  const [result, action, pending] = useActionState<FollowupResult>(sendFollowup, null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = `Email ${count} people now? ${lifetime} of them get switched to free for life.`;
        if (!confirm(msg)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <Button type="submit" disabled={pending || count === 0}>
        {pending ? "Sending…" : `Send to ${count} ${count === 1 ? "person" : "people"}`}
      </Button>
      {result && "error" in result && <p className="text-sm text-red-600">{result.error}</p>}
      {result && "sent" in result && (
        <p className="text-sm text-slate-600">
          Sent {result.sent}, {result.comped} switched to lifetime.
          {result.failed.length > 0 && ` Failed: ${result.failed.join(", ")}`}
        </p>
      )}
    </form>
  );
}
