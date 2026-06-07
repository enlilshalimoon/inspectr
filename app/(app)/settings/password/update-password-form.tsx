"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { updatePassword } from "../actions";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    const res = await updatePassword({ password });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/inspections"), 1200);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-slate-500">At least 8 characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>

      <FormMessage message={error} kind="error" />
      <FormMessage message={done ? "Password updated. Taking you in…" : null} kind="success" />

      <Button type="submit" size="lg" className="w-full" disabled={pending || done}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
