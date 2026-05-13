import { createBrowserClient } from "@supabase/ssr";

// NOTE: Untyped for now. After provisioning the DB, regenerate types with
//   npx supabase gen types typescript --project-id <ref> --schema public > lib/supabase/database.types.ts
// then change to `createBrowserClient<Database>(...)`.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
