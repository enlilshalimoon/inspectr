"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendSystemEmail, welcomeEmail, passwordResetEmail } from "@/lib/email/send";

// ---------------------------------------------------------------------------
// Shape returned to forms via useActionState.
// ---------------------------------------------------------------------------
export type AuthState = {
  error?: string;
  ok?: boolean;
  message?: string;
} | null;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const signupSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "At least 8 characters."),
  fullName: z.string().min(1, "Required.").max(120),
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Required."),
});

const resetRequestSchema = z.object({
  email: z.string().email("Enter a valid email."),
});

// ---------------------------------------------------------------------------
async function originFromHeaders(): Promise<string> {
  const h = await headers();
  return (
    h.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

// ---------------------------------------------------------------------------
// SIGNUP
// ---------------------------------------------------------------------------
export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const origin = await originFromHeaders();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) return { error: error.message };

  // If email confirmation is required, the user won't have a session yet.
  if (!data.session) {
    return {
      ok: true,
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  // Stash full_name on public.users (trigger created the row, this fills it).
  if (data.user) {
    await supabase
      .from("users")
      .update({ full_name: parsed.data.fullName })
      .eq("id", data.user.id);
  }

  // Branded welcome email via Resend (best-effort — never block signup on it).
  // Email confirmation is disabled, so this is a greeting, not a verification gate.
  const welcome = welcomeEmail({ fullName: parsed.data.fullName, appUrl: origin });
  await sendSystemEmail({
    to: parsed.data.email,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
  }).catch(() => {
    /* best-effort: a failed welcome email must not break signup */
  });

  redirect("/onboarding");
}

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: "Invalid email or password." };

  const next = (formData.get("next") as string | null) ?? null;

  // Has onboarding been completed? If not, route there.
  const { data: userRow } = await supabase
    .from("users")
    .select("onboarding_completed_at")
    .single();

  if (!userRow?.onboarding_completed_at) redirect("/onboarding");
  redirect(next && next.startsWith("/") ? next : "/inspections");
}

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// PASSWORD RESET REQUEST
// ---------------------------------------------------------------------------
export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const origin = await originFromHeaders();

  // Generate a recovery token server-side via the admin API, then deliver it through
  // our branded Resend pipeline (from noreply@uselookover.com) instead of Supabase's
  // default @supabase.io mailer. generateLink does NOT send an email itself.
  //
  // IMPORTANT: we use the returned `hashed_token` and build our OWN link to
  // /auth/confirm (which calls verifyOtp). We do NOT use `action_link` — that
  // redirects back with a URL fragment / no ?code, which the /auth/callback handler
  // can't consume (that was the "missing code" bug).
  try {
    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: parsed.data.email,
    });
    if (error) {
      // Most common benign case: email doesn't exist. Log, stay generic to the user.
      console.error("[reset-password] generateLink error:", error.message);
    } else {
      const tokenHash = data.properties?.hashed_token;
      if (tokenHash) {
        const resetUrl =
          `${origin}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}` +
          `&type=recovery&next=${encodeURIComponent("/settings/password")}`;
        const email = passwordResetEmail({ resetUrl });
        await sendSystemEmail({
          to: parsed.data.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      }
    }
  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
  }

  // Don't leak whether the email exists.
  return {
    ok: true,
    message: "If that email exists, we sent a reset link.",
  };
}
