import type { Severity } from "@/lib/supabase/types";

export const SEVERITY_LABEL: Record<Severity, string> = {
  info: "Informational",
  monitor: "Monitor",
  minor_repair: "Minor Repair",
  major_repair: "Major Repair",
  safety_hazard: "Safety Hazard",
};

// Tailwind-friendly color tokens for each severity.
export const SEVERITY_COLOR: Record<
  Severity,
  { dot: string; pill: string; ring: string }
> = {
  info: {
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-700 border-slate-200",
    ring: "ring-slate-300",
  },
  monitor: {
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-800 border-sky-200",
    ring: "ring-sky-300",
  },
  minor_repair: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    ring: "ring-amber-300",
  },
  major_repair: {
    dot: "bg-orange-600",
    pill: "bg-orange-50 text-orange-800 border-orange-200",
    ring: "ring-orange-300",
  },
  safety_hazard: {
    dot: "bg-red-600",
    pill: "bg-red-50 text-red-800 border-red-200",
    ring: "ring-red-300",
  },
};

export const SEVERITY_ORDER: Severity[] = [
  "safety_hazard",
  "major_repair",
  "minor_repair",
  "monitor",
  "info",
];

export function sortBySeverity<T extends { severity: Severity }>(items: T[]): T[] {
  const rank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
  return [...items].sort((a, b) => rank(a.severity) - rank(b.severity));
}
