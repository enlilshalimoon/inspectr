// One-off: provision an admin user so they can sign in immediately.
// Idempotent — if the auth user exists, update password + confirm email;
// if not, create. Then ensure the public.users full_name is set.
//
// Usage: node scripts/provision-admin.mjs <email> <password> ["Full Name"]

import { config as dotenvConfig } from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenvConfig({ path: ".env.local" });
dotenvConfig();

const [, , email, password, fullNameArg] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/provision-admin.mjs <email> <password> ["Full Name"]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !svc) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, svc, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fullName = fullNameArg ?? "Enlil Shalimoon";

// Find the existing auth user by paging admin.listUsers
async function findUser(targetEmail) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
    if (error) throw error;
    const match = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === targetEmail.toLowerCase(),
    );
    if (match) return match;
    if (data.users.length < 50) return null;
    page += 1;
  }
  return null;
}

const existing = await findUser(email);

let userId;
if (existing) {
  const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(existing.user_metadata ?? {}), full_name: fullName },
  });
  if (error) {
    console.error("Failed to update existing user:", error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log("✓ Updated existing user (password reset + email confirmed)");
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    console.error("Failed to create user:", error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log("✓ Created new user (email pre-confirmed)");
}

// Ensure public.users full_name is populated (trigger creates the row on signup)
const { error: updErr } = await supabase
  .from("users")
  .update({ full_name: fullName })
  .eq("id", userId);
if (updErr) console.warn("Note: could not update public.users full_name:", updErr.message);

console.log("  id:", userId);
console.log("  email:", email);
console.log("  full_name:", fullName);
console.log("");
console.log("Sign in at https://www.uselookover.com/login");
console.log("Then change the password in Settings.");
