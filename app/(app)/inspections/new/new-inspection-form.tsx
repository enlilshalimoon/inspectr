"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { createInspection, type NewInspectionState } from "./actions";

export function NewInspectionForm() {
  const [state, action, pending] = useActionState<NewInspectionState, FormData>(
    createInspection,
    null,
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-5">
      <Card>
        <CardContent className="p-6 space-y-4">
          <SectionTitle>Property</SectionTitle>

          <Field id="property_address" label="Street address" required>
            <Input id="property_address" name="property_address" autoComplete="street-address" required />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px] gap-3">
            <Field id="property_city" label="City">
              <Input id="property_city" name="property_city" autoComplete="address-level2" />
            </Field>
            <Field id="property_state" label="State">
              <Input id="property_state" name="property_state" maxLength={2} placeholder="TX" />
            </Field>
            <Field id="property_zip" label="ZIP">
              <Input id="property_zip" name="property_zip" autoComplete="postal-code" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field id="property_year_built" label="Year built">
              <Input id="property_year_built" name="property_year_built" inputMode="numeric" placeholder="1998" />
            </Field>
            <Field id="property_sqft" label="Square feet">
              <Input id="property_sqft" name="property_sqft" inputMode="numeric" placeholder="2100" />
            </Field>
            <Field id="property_type" label="Type">
              <select
                id="property_type"
                name="property_type"
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="single_family">Single family</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="multi_family">Multi-family</option>
              </select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <SectionTitle>Client</SectionTitle>
          <Field id="client_name" label="Client name">
            <Input id="client_name" name="client_name" autoComplete="name" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="client_email" label="Email">
              <Input id="client_email" name="client_email" type="email" autoComplete="email" />
            </Field>
            <Field id="client_phone" label="Phone">
              <Input id="client_phone" name="client_phone" type="tel" autoComplete="tel" />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <SectionTitle>Inspection</SectionTitle>
          <Field id="inspection_date" label="Date">
            <Input id="inspection_date" name="inspection_date" type="date" defaultValue={today} />
          </Field>
        </CardContent>
      </Card>

      <FormMessage message={state?.error} kind="error" />

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating…" : "Start inspection"}
        </Button>
      </div>
    </form>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-slate-700 uppercase tracking-wide">{children}</h2>;
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      {children}
    </div>
  );
}
