import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="px-6 py-5">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Inspectr
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-6 py-4 text-xs text-slate-400 text-center">
        © {new Date().getFullYear()} Inspectr
      </footer>
    </div>
  );
}
