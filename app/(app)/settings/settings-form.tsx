"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { createClient } from "@/lib/supabase/client";
import { updateLogo, updateSettings } from "./actions";

type Defaults = {
  full_name: string;
  company_name: string;
  license_number: string;
  license_state: string;
  phone: string;
  default_disclaimer: string;
  company_logo_url: string | null;
  logo_signed_url: string | null;
};

export function SettingsForm({ userId, defaults }: { userId: string; defaults: Defaults }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(defaults.logo_signed_url);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateSettings({
        full_name: String(formData.get("full_name") ?? ""),
        company_name: String(formData.get("company_name") ?? ""),
        license_number: String(formData.get("license_number") ?? ""),
        license_state: String(formData.get("license_state") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        default_disclaimer: String(formData.get("default_disclaimer") ?? ""),
      });
      if (!res.ok) setError(res.error);
      else setSuccess("Saved.");
    });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";

    setLogoUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.type.includes("png") ? "png" : file.type.includes("svg") ? "svg" : "jpg";
    const path = `${userId}/logo.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("report-assets")
      .upload(path, file, { contentType: file.type, upsert: true, cacheControl: "3600" });

    if (upErr) {
      setError(upErr.message);
      setLogoUploading(false);
      return;
    }

    const res = await updateLogo({ storage_path: path });
    if (!res.ok) {
      setError(res.error);
      setLogoUploading(false);
      return;
    }

    const { data: signed } = await supabase.storage
      .from("report-assets")
      .createSignedUrl(path, 60 * 60);
    setLogoSignedUrl(signed?.signedUrl ?? null);
    setLogoUploading(false);
  }

  async function removeLogo() {
    setLogoUploading(true);
    setError(null);
    const supabase = createClient();
    if (defaults.company_logo_url) {
      await supabase.storage.from("report-assets").remove([defaults.company_logo_url]);
    }
    const res = await updateLogo({ storage_path: null });
    if (!res.ok) setError(res.error);
    setLogoSignedUrl(null);
    setLogoUploading(false);
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card>
        <CardContent className="p-6 space-y-4">
          <SectionTitle>Identity</SectionTitle>
          <Field id="full_name" label="Your name">
            <Input id="full_name" name="full_name" autoComplete="name" defaultValue={defaults.full_name} required />
          </Field>
          <Field id="company_name" label="Company name">
            <Input
              id="company_name"
              name="company_name"
              autoComplete="organization"
              defaultValue={defaults.company_name}
              required
            />
          </Field>
          <div>
            <Label>Company logo</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {logoSignedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoSignedUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">No logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={logoUploading}
                  className="inline-flex items-center gap-1 text-sm text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  {logoUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  {logoSignedUrl ? "Replace" : "Upload"}
                </button>
                {logoSignedUrl && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    disabled={logoUploading}
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-700 px-3 py-1.5 rounded-md"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              PNG, JPG, or SVG. Square works best. Shows on every PDF cover and report page.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <SectionTitle>License & contact</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
            <Field id="license_number" label="License number">
              <Input id="license_number" name="license_number" defaultValue={defaults.license_number} />
            </Field>
            <Field id="license_state" label="State">
              <Input id="license_state" name="license_state" maxLength={2} defaultValue={defaults.license_state} />
            </Field>
          </div>
          <Field id="phone" label="Phone">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={defaults.phone} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <SectionTitle>Default report disclaimer</SectionTitle>
          <p className="text-xs text-slate-500">
            Appears at the end of every report. Edit per-inspection if needed.
          </p>
          <textarea
            name="default_disclaimer"
            rows={6}
            defaultValue={defaults.default_disclaimer}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
          />
        </CardContent>
      </Card>

      <FormMessage message={error} kind="error" />
      <FormMessage message={success} kind="success" />

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-slate-700 uppercase tracking-wide">{children}</h2>;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
