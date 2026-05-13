"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const origin = await originFromHeaders();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/settings/password`,
  });

  // Don't leak whether the email exists.
  if (error) {
    // Log internally; still show generic success to the user.
    console.error("[reset-password] supabase error:", error.message);
  }

  return {
    ok: true,
    message: "If that email exists, we sent a reset link.",
  };
}
