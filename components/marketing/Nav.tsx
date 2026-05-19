import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Lookover
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="#how-it-works"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            How it works
          </Link>
          <Link
            href="#pricing"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            FAQ
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  );
}
