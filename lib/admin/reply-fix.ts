// Reply-fix follow-up: everyone who received a founder email while its reply-to
// bounced (flagged founder_checkin_sent_at by the check-in cron) and hasn't been
// sent the apology yet (reply_fix_followup_sent_at). Both flags live in auth
// app_metadata, same as the cron's dedup.

import type { createServiceClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/email/internal";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type ReplyFixRecipient = {
  id: string;
  email: string;
  fullName: string | null;
  appMetadata: Record<string, unknown>;
};

export type AuthUser = Awaited<
  ReturnType<ServiceClient["auth"]["admin"]["listUsers"]>
>["data"]["users"][number];

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

export async function getReplyFixRecipients(
  admin: ServiceClient,
  authUsers?: AuthUser[],
): Promise<{
  pending: ReplyFixRecipient[];
  alreadySent: number;
}> {
  authUsers ??= await listAllAuthUsers(admin);

  const eligible = authUsers.filter((u) => {
    const meta = u.app_metadata ?? {};
    return u.email && meta.founder_checkin_sent_at && !isInternalEmail(u.email);
  });
  const pendingUsers = eligible.filter((u) => !u.app_metadata?.reply_fix_followup_sent_at);

  const { data: profiles } = pendingUsers.length
    ? await admin.from("users").select("id, full_name").in("id", pendingUsers.map((u) => u.id))
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((r) => [r.id as string, r.full_name as string | null]));

  return {
    pending: pendingUsers.map((u) => ({
      id: u.id,
      email: u.email!,
      fullName: nameById.get(u.id) ?? null,
      appMetadata: u.app_metadata ?? {},
    })),
    alreadySent: eligible.length - pendingUsers.length,
  };
}
