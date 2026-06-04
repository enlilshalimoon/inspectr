// One-off: create an admin user via the Supabase service-role admin API.
// Bypasses the public signup flow + email confirmation. Use sparingly.
//
// Usage:
//   node scripts/create-admin-user.mjs <email> <password> ["Full Name"]
//
// Reads SUPABASE_URL + SERVICE_ROLE_KEY from .env.local. Requires the email
// to also be in the ADMIN_EMAILS env var (Vercel) for /admin access to work.

import { config as dotenvConfig } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Next.js loads .env.local automatically but a standalone Node script doesn't —
// load it explicitly. Falls back to .env if .env.local doesn't exist.
dotenvConfig({ path: ".env.local" });
dotenvConfig(); // fall back to .env for anything not in .env.local

const [, , emailArg, passwordArg, fullNameArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error("Usage: node scripts/create-admin-user.mjs <email> <password> [\"Full Name\"]");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fullName = fullNameArg ?? emailArg.split("@")[0];

// Create the auth user (email pre-confirmed so they can sign in immediately)
const { data, error } = await supabase.auth.admin.createUser({
  email: emailArg,
  password: passwordArg,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

const userId = data.user.id;

// Update public.users row (trigger should have created it; this fills in full_name)
const { error: updateErr } = await supabase
  .from("users")
  .update({ full_name: fullName })
  .eq("id", userId);

if (updateErr) {
  console.error("Created auth user but failed to update public.users:", updateErr.message);
  // Not fatal — the auth user exists, they can sign in
}

console.log("✓ Created admin user");
console.log("  id:", userId);
console.log("  email:", emailArg);
console.log("  full_name:", fullName);
console.log("");
console.log("Sign in at https://www.uselookover.com/login with the password you set.");
console.log("Change password immediately via Settings → password after signing in.");
