"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { signupAction, type AuthState } from "@/lib/auth/actions";
import { trackEvent } from "@/components/MetaPixel";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, null);

  // Fire Meta Pixel "Lead" when the signup form mounts — intent signal for ad
  // optimization. Fire "CompleteRegistration" when the action returns ok=true
  // (email-confirm flow). The redirect flow (immediate session) bypasses this
  // return path; future enhancement is to fire CompleteRegistration on the
  // /onboarding page when arrived via signup, but the email-confirm path is
  // dominant in production and covers the conversion event we care about.
  useEffect(() => {
    trackEvent("Lead");
  }, []);

  const completeReportedRef = useRef(false);
  useEffect(() => {
    if (state?.ok && !completeReportedRef.current) {
      completeReportedRef.current = true;
      trackEvent("CompleteRegistration");
    }
  }, [state]);

  return (
    <form action={action} className="space-y-4">
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
      <FormMessage message={state?.ok ? state.message : null} kind="success" />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-xs text-slate-500">
        By creating an account, you agree to our terms and privacy policy.
      </p>
    </form>
  );
}
