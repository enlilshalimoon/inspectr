import Link from "next/link";
import { ResetForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
        <p className="text-sm text-slate-500">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>
      </div>
      <ResetForm />
      <p className="text-sm text-slate-500">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
