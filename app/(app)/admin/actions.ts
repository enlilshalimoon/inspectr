"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { getReplyFixRecipients } from "@/lib/admin/reply-fix";
import { replyFixFollowupEmail, sendFounderEmail } from "@/lib/email/send";

export type ReplyFixResult = { sent: number; failed: string[] } | { error: string } | null;

export async function sendReplyFixFollowup(): Promise<ReplyFixResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return { error: "Not authorized." };

  const admin = createServiceClient();
  const { pending } = await getReplyFixRecipients(admin);

  let sent = 0;
  const failed: string[] = [];
  for (const r of pending) {
    const mail = replyFixFollowupEmail({ firstName: r.fullName });
    const res = await sendFounderEmail({ to: r.email, ...mail });
    if (!res.ok) {
      failed.push(`${r.email} (${res.error ?? "unknown"})`);
      continue;
    }
    // Stamp right after each send so a retry never double-sends.
    await admin.auth.admin.updateUserById(r.id, {
      app_metadata: { ...r.appMetadata, reply_fix_followup_sent_at: new Date().toISOString() },
    });
    sent += 1;
    await new Promise((resolve) => setTimeout(resolve, 600)); // Resend rate limit
  }

  revalidatePath("/admin");
  return { sent, failed };
}
