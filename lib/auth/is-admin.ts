// Admin allowlist for /admin route + nav link. Comma-separated env var on the
// server (NOT prefixed NEXT_PUBLIC_, so it never leaks to the client bundle).
//
// To grant a teammate admin access:
//   1) Add their email to the ADMIN_EMAILS env var in Vercel (Production env)
//   2) Redeploy
//
// Stored as an env var rather than a DB column so:
//   - rotating access doesn't require a DB write
//   - the allowlist is auditable in one place (Vercel)
//   - bypass impossible without env access

const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function adminEmailsCount(): number {
  return ADMIN_EMAILS.length;
}
