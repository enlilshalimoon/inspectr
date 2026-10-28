// /try — public, no-signup demo. An inspector drops photos from a recent job and
// sees the findings Lookover drafts from them, grouped like the report. Cold
// emails link here so "judge it on a house you know" takes two minutes instead
// of a signup. Photos are never stored (see /api/try/draft).

import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/marketing/Footer";
import { TryClient } from "./try-client";

export const metadata: Metadata = {
  title: "Try Lookover on your own photos",
  description:
    "Drop photos from a recent inspection and see the findings Lookover writes from them. No signup, photos aren't saved.",
};

export default function TryPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
            Lookover
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            Start free trial
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <TryClient />
      </main>
      <Footer />
    </div>
  );
}
