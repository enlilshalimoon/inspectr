"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";

// Mobile hamburger menu for the app nav. Desktop uses the inline nav in the
// layout; this is shown only below the `sm` breakpoint (sm:hidden) so phones
// actually have a way to reach Inspections / Settings / Billing / Admin.
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/inspections", label: "Inspections" },
    { href: "/settings", label: "Settings" },
    { href: "/billing", label: "Billing" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 -mr-2"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* tap-away backdrop */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-14 z-40 bg-black/20"
          />
          <nav className="fixed inset-x-0 top-14 z-50 border-b border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col p-2">
              {links.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-md px-4 py-3 text-base ${
                      active
                        ? "bg-slate-100 font-medium text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
              <form action={logoutAction} className="border-t border-slate-100 mt-1 pt-1">
                <button
                  type="submit"
                  className="w-full rounded-md px-4 py-3 text-left text-base text-slate-600 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
