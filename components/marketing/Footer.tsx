import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-12 grid sm:grid-cols-3 gap-8">
        <div>
          <p className="text-lg font-semibold text-slate-900">Lookover</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="#how-it-works" className="hover:text-slate-900">
                How it works
              </Link>
            </li>
            <li>
              <Link href="#pricing" className="hover:text-slate-900">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/sample" className="hover:text-slate-900">
                Sample report
              </Link>
            </li>
            <li>
              <a href="mailto:hello@uselookover.com" className="hover:text-slate-900">
                Contact
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            Resources
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/e-and-o" className="hover:text-slate-900">
                For your E&amp;O carrier
              </Link>
            </li>
            <li>
              <Link href="#faq" className="hover:text-slate-900">
                FAQ
              </Link>
            </li>
            <li>
              <a
                href="https://www.nachi.org/sop.htm"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900"
              >
                InterNACHI SOP
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            Legal
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/terms" className="hover:text-slate-900">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-slate-900">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/data-export" className="hover:text-slate-900">
                Data export policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-slate-500">
          © {new Date().getFullYear()} Lookover. Built for residential home inspectors.
        </div>
      </div>
    </footer>
  );
}
