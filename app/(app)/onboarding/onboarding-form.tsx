"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { Card, CardContent } from "@/components/ui/card";
import { completeOnboarding, type OnboardingState } from "./actions";

type Defaults = {
  fullName: string;
  companyName: string;
  licenseNumber: string;
  licenseState: string;
  phone: string;
  defaultDisclaimer: string;
};

export function OnboardingForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    null,
  );

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-5">
          <Field id="fullName" label="Your name">
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              defaultValue={defaults.fullName}
              required
            />
          </Field>

          <Field id="companyName" label="Company name">
            <Input
              id="companyName"
              name="companyName"
              autoComplete="organization"
              defaultValue={defaults.companyName}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
            <Field id="licenseNumber" label="License number">
              <Input
                id="licenseNumber"
                name="licenseNumber"
                defaultValue={defaults.licenseNumber}
                required
              />
            </Field>
            <Field id="licenseState" label="State">
              <Input
                id="licenseState"
                name="licenseState"
                maxLength={2}
                placeholder="e.g. TX"
                defaultValue={defaults.licenseState}
                required
              />
            </Field>
          </div>

          <Field id="phone" label="Phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={defaults.phone}
              required
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="defaultDisclaimer">Default report disclaimer</Label>
            <p className="text-xs text-slate-500">
              Goes at the end of every report. You can edit per-inspection later.
            </p>
          </div>
          <textarea
            id="defaultDisclaimer"
            name="defaultDisclaimer"
            rows={6}
            defaultValue={defaults.defaultDisclaimer}
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            required
          />
        </CardContent>
      </Card>

      <FormMessage message={state?.error} kind="error" />

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
