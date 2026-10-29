"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { signupAction, type AuthState } from "@/lib/auth/actions";
import { trackEvent } from "@/components/MetaPixel";
import {
  SIGNUP_ROLES,
  SIGNUP_ROLE_LABELS,
  isInspectorRole,
  registrationPixelEvent,
} from "@/lib/signup-role";

export function SignupForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, null);

  // A real account was created (action returned ok). Fire the registration event
  // once: CompleteRegistration for inspectors, a custom NonInspectorSignup for
  // everyone else (lib/signup-role.ts) so the ad optimizes toward inspectors.
  // Inspectors then navigate on (with a brief beat so the pixel beacon goes out
  // before we leave the page); non-inspectors see a short note first. Lead
  // (intent) fires on form submit, not here — see onSubmit.
  const completeReportedRef = useRef(false);
  const nonInspector = !!(state?.ok && state.role && !isInspectorRole(state.role));
  useEffect(() => {
    if (state?.ok && !completeReportedRef.current) {
      completeReportedRef.current = true;
      const ev = registrationPixelEvent(state.role);
      trackEvent(ev.name, state.role ? { role: state.role } : undefined, ev.method);
      if (state.next && !nonInspector) {
        const dest = state.next;
        setTimeout(() => router.push(dest), 600);
      }
    }
  }, [state, router, nonInspector]);

  if (nonInspector) {
    return (
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Thanks for signing up</h2>
        <p className="text-sm text-slate-600">
          Lookover is built for home inspectors. If you&apos;re buying a home, ask your
          inspector about Lookover.
        </p>
        {state?.message && <p className="text-sm text-slate-600">{state.message}</p>}
        {state?.next && (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => router.push(state.next!)}
          >
            Continue anyway
          </Button>
        )}
      </div>
    );
  }

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
        <Label htmlFor="role">What best describes you?</Label>
        {/* text-base keeps iOS Safari from zooming in when the picker opens. */}
        <select
          id="role"
          name="role"
          required
          defaultValue=""
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          <option value="" disabled>
            Choose one
          </option>
          {SIGNUP_ROLES.map((r) => (
            <option key={r} value={r}>
              {SIGNUP_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
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
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-slate-700">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-700">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
