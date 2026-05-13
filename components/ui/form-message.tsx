import { cn } from "@/lib/utils/cn";

export type FormMessageProps = {
  message?: string | null;
  kind?: "error" | "success" | "info";
  className?: string;
};

const TONE: Record<NonNullable<FormMessageProps["kind"]>, string> = {
  error: "bg-red-50 text-red-800 border-red-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
};

export function FormMessage({ message, kind = "error", className }: FormMessageProps) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        TONE[kind],
        className,
      )}
    >
      {message}
    </div>
  );
}
