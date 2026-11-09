import Link from "next/link";
import { SignupForm } from "./signup-form";
import { parseTrySignup } from "@/lib/try/signup-link";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const fromTry = parseTrySignup(await searchParams);
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-900">Start your free trial</h1>
        <p className="text-sm text-slate-500">
          14 days. No credit card. Up to 3 inspections.
        </p>
        {fromTry && fromTry.findings > 0 && (
          <p className="text-sm text-slate-900">
            You already drafted {fromTry.findings} finding{fromTry.findings === 1 ? "" : "s"} on the
            try page. Your next inspection picks up from here.
          </p>
        )}
      </div>
      <SignupForm fromTry={fromTry} />
      <p className="text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
