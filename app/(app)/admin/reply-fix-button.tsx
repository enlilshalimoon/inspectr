"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendReplyFixFollowup, type ReplyFixResult } from "./actions";

export function ReplyFixButton({ count }: { count: number }) {
  const [result, action, pending] = useActionState<ReplyFixResult>(
    sendReplyFixFollowup,
    null,
  );

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Send the follow-up email to ${count} people now?`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <Button type="submit" disabled={pending || count === 0}>
        {pending ? "Sending…" : `Send to ${count} ${count === 1 ? "person" : "people"}`}
      </Button>
      {result && "error" in result && <p className="text-sm text-red-600">{result.error}</p>}
      {result && "sent" in result && (
        <p className="text-sm text-slate-600">
          Sent {result.sent}.
          {result.failed.length > 0 && ` Failed: ${result.failed.join(", ")}`}
        </p>
      )}
    </form>
  );
}
