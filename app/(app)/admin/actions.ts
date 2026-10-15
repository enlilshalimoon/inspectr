"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { getFollowupRecipients } from "@/lib/admin/followup";
import { followupEmail, sendFounderEmail } from "@/lib/email/send";

export type FollowupResult =
  | { sent: number; comped: number; failed: string[] }
  | { error: string }
  | null;

export async function sendFollowup(): Promise<FollowupResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return { error: "Not authorized." };

  const admin = createServiceClient();
  const { pending } = await getFollowupRecipients(admin);

  let sent = 0;
  let comped = 0;
  const failed: string[] = [];
  for (const r of pending) {
    // Comp BEFORE emailing so the email never promises access they don't have.
    // Only users with no Stripe customer, so a real payer is never touched.
    if (r.variant === "lifetime") {
      const { error } = await admin
        .from("users")
        .update({ subscription_status: "active" })
        .eq("id", r.id)
        .is("stripe_customer_id", null);
      if (error) {
        failed.push(`${r.email} (comp failed: ${error.message})`);
        continue;
      }
      comped += 1;
    }

    const mail = followupEmail({ variant: r.variant, firstName: r.fullName });
    const res = await sendFounderEmail({ to: r.email, ...mail });
    if (!res.ok) {
      failed.push(`${r.email} (${res.error ?? "unknown"})`);
      continue;
    }
    // Stamp right after each send so a retry never double-sends.
    await admin.auth.admin.updateUserById(r.id, {
      app_metadata: { ...r.appMetadata, followup_sent_at: new Date().toISOString() },
    });
    sent += 1;
    await new Promise((resolve) => setTimeout(resolve, 600)); // Resend rate limit
  }

  revalidatePath("/admin");
  return { sent, comped, failed };
}
