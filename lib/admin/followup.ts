// Founder follow-up: one personal email to every real signup who hasn't had it yet
// (dedup flag followup_sent_at in auth app_metadata, same pattern as the check-in
// cron). Inspectors who finalized at least one report get the "lifetime" variant
// and are comped (subscription active, no Stripe customer) when it's sent; everyone
// else gets a plain "what did you think?".

import type { createServiceClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/email/internal";
import type { FollowupVariant } from "@/lib/email/send";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type AuthUser = Awaited<
  ReturnType<ServiceClient["auth"]["admin"]["listUsers"]>
>["data"]["users"][number];

export type FollowupRecipient = {
  id: string;
  email: string;
  fullName: string | null;
  variant: FollowupVariant;
  appMetadata: Record<string, unknown>;
};

export async function listAllAuthUsers(admin: ServiceClient): Promise<AuthUser[]> {
  const authUsers: AuthUser[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    authUsers.push(...data.users);
    if (data.users.length < 200) break;
  }
  return authUsers;
}

export async function getFollowupRecipients(
  admin: ServiceClient,
  authUsers?: AuthUser[],
): Promise<{ pending: FollowupRecipient[]; alreadySent: number }> {
  authUsers ??= await listAllAuthUsers(admin);

  const real = authUsers.filter((u) => u.email && !isInternalEmail(u.email));
  const pendingUsers = real.filter((u) => !u.app_metadata?.followup_sent_at);
  const ids = pendingUsers.map((u) => u.id);

  const [{ data: profiles }, { data: finalized }] = ids.length
    ? await Promise.all([
        admin.from("users").select("id, full_name").in("id", ids),
        admin
          .from("inspections")
          .select("inspector_id")
          .in("inspector_id", ids)
          .not("finalized_at", "is", null),
      ])
    : [{ data: [] }, { data: [] }];

  const nameById = new Map((profiles ?? []).map((r) => [r.id as string, r.full_name as string | null]));
  const finishedIds = new Set((finalized ?? []).map((r) => r.inspector_id as string));

  const pending: FollowupRecipient[] = pendingUsers.map((u) => ({
    id: u.id,
    email: u.email!,
    fullName: nameById.get(u.id) ?? null,
    variant: finishedIds.has(u.id) ? "lifetime" : "feedback",
    appMetadata: u.app_metadata ?? {},
  }));
  // Lifetime first so they're easy to eyeball before sending.
  pending.sort((a, b) => (a.variant === b.variant ? 0 : a.variant === "lifetime" ? -1 : 1));

  return { pending, alreadySent: real.length - pendingUsers.length };
}
