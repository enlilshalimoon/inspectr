import Link from "next/link";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500">
          Welcome back. Sign in to continue your inspections.
        </p>
      </div>
      <LoginForm next={next} initialError={error} />
      <div className="text-sm text-slate-500 space-y-1.5">
        <p>
          New here?{" "}
          <Link href="/signup" className="font-medium text-slate-900 underline-offset-4 hover:underline">
            Start a free trial
          </Link>
        </p>
        <p>
          <Link
            href="/reset-password"
            className="text-slate-600 underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
