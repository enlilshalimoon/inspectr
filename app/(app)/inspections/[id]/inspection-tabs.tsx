"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string };

/**
 * Client-side tab nav for the inspection workspace. Using `usePathname` here
 * gives instant active-state feedback — the highlight moves the moment you
 * click, even before the new server-rendered page streams in. Pair this with
 * per-segment `loading.tsx` skeletons so the body area also reacts immediately.
 */
export function InspectionTabs({ inspectionId }: { inspectionId: string }) {
  const pathname = usePathname() ?? "";
  const tabs: Tab[] = [
    { label: "Capture", href: `/inspections/${inspectionId}/capture` },
    { label: "Review", href: `/inspections/${inspectionId}/review` },
    { label: "Finalize", href: `/inspections/${inspectionId}/finalize` },
  ];
  return (
    <nav className="flex gap-1 text-sm border-b border-slate-200">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            prefetch
            className={`px-3 py-2 border-b-2 -mb-px transition-colors ${
              active
                ? "text-slate-900 border-slate-900 font-medium"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
