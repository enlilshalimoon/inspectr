import { Nav } from "./Nav";
import { Footer } from "./Footer";

/**
 * Shared shell for policy/legal pages (/terms, /privacy, /data-export, /e-and-o).
 * Keeps the marketing nav + footer + typography consistent so we don't have to
 * re-style each page individually.
 */
export function LegalPage({
  title,
  lastUpdated,
  draftNotice = true,
  children,
}: {
  title: string;
  lastUpdated: string;
  draftNotice?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Nav />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <header className="mb-10 border-b border-slate-200 pb-6">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">Last updated: {lastUpdated}</p>
          </header>
          <div className="space-y-6 text-slate-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-orange-700 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-slate-900 [&_strong]:font-semibold">
            {children}
          </div>
          {draftNotice && (
            <aside className="mt-12 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <strong className="font-semibold">Draft v0.1</strong> — This document is a
              working version and has not yet been reviewed by counsel. It will be
              updated before public beta launch. If you have questions in the meantime,
              email <a href="mailto:hello@uselookover.com">hello@uselookover.com</a>.
            </aside>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
