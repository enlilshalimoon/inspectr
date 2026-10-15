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

          <Field id="companyName" label="Company name" optional>
            <Input
              id="companyName"
              name="companyName"
              autoComplete="organization"
              defaultValue={defaults.companyName}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
            <Field id="licenseNumber" label="License number" optional>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                defaultValue={defaults.licenseNumber}
              />
            </Field>
            <Field id="licenseState" label="State" optional>
              <Input
                id="licenseState"
                name="licenseState"
                maxLength={2}
                autoCapitalize="characters"
                placeholder="e.g. TX"
                defaultValue={defaults.licenseState}
              />
            </Field>
          </div>

          <Field id="phone" label="Phone" optional>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={defaults.phone}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Prefilled, so most people never need to touch it. Collapsed so the
          Continue button isn't buried under a wall of legal text on a phone.
          Not `required`: a required field inside a closed <details> blocks
          submit with no visible error in Safari. */}
      <Card>
        <CardContent className="p-6">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-slate-900">
              Report disclaimer{" "}
              <span className="font-normal text-slate-500">(prefilled. Tap to edit)</span>
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500">
                Goes at the end of every report. You can change it later in Settings.
              </p>
              <Label htmlFor="defaultDisclaimer" className="sr-only">
                Default report disclaimer
              </Label>
              <textarea
                id="defaultDisclaimer"
                name="defaultDisclaimer"
                rows={6}
                defaultValue={defaults.defaultDisclaimer}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              />
            </div>
          </details>
        </CardContent>
      </Card>

      <FormMessage message={state?.error} kind="error" />

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending ? "Saving…" : "Continue to your first inspection"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  optional,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </Label>
      {children}
    </div>
  );
}
