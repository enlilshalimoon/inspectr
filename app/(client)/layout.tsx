// Public layout for client-facing report pages. No auth, no app nav.

import "../globals.css";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-white">{children}</div>;
}
