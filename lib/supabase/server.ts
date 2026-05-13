import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Untyped for now; regenerate types after DB provisioning.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware will refresh.
          }
        },
      },
    },
  );
}

// Service-role client. Server-only. Bypasses RLS. Use sparingly:
//   - public report viewer (looking up inspections by share_url_slug)
//   - Stripe webhook handlers updating user billing state
//   - background jobs that need cross-user access
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
