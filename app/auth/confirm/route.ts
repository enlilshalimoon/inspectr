import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles token_hash-based email links (password recovery, etc.) that are generated
// server-side via the admin generateLink API and delivered through our branded Resend
// pipeline. Verifies the one-time token to establish a session, then forwards to ?next=.
//
// This is the counterpart to /auth/callback (which handles the ?code= PKCE flow).
// generateLink produces a token_hash, NOT a code — so it must be verified with
// verifyOtp here, not exchangeCodeForSession.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/inspections";

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/login?error=missing_token", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  const safeNext = next.startsWith("/") ? next : "/inspections";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
