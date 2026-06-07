"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { signupAction, type AuthState } from "@/lib/auth/actions";
import { trackEvent } from "@/components/MetaPixel";

export function SignupForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, null);

  // CompleteRegistration = a real account was created (action returned ok). Fire
  // once, then navigate (with a brief beat so the pixel beacon goes out before we
  // leave the page). Lead (intent) fires on form submit, not here — see onSubmit.
  const completeReportedRef = useRef(false);
  useEffect(() => {
    if (state?.ok && !completeReportedRef.current) {
      completeReportedRef.current = true;
      trackEvent("CompleteRegistration");
      if (state.next) {
        const dest = state.next;
        setTimeout(() => router.push(dest), 600);
      }
    }
  }, [state, router]);

  // Lead = signup intent. Fires only when the form actually submits (passes native
  // validation), i.e. the user clicked "Create account" with valid fields — NOT on
  // page view. This is the fix for inflated Lead counts.
  const redirecting = !!(state?.ok && state.next);

  return (
    <form
      action={action}
      onSubmit={() => trackEvent("Lead")}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-slate-500">At least 8 characters.</p>
      </div>

      <FormMessage message={state?.error} kind="error" />
      <FormMessage
        message={
          state?.ok ? (state.message ?? "Account created — taking you in…") : null
        }
        kind="success"
      />

      <Button type="submit" size="lg" className="w-full" disabled={pending || redirecting}>
        {pending ? "Creating account…" : redirecting ? "Account created…" : "Create account"}
      </Button>

      <p className="text-xs text-slate-500">
        By creating an account, you agree to our terms and privacy policy.
      </p>
    </form>
  );
}
