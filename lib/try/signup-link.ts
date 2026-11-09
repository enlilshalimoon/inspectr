// Carries /try context into signup without putting anything identifying in the URL.
//
// The URL only says the visitor came from /try and how many findings they drafted
// (the page URL is reported to the Meta pixel, so it must stay anonymous). The
// visitor hash that links try_drafts / try_leads to the new account rides in a
// first-party httpOnly cookie set by /api/try/draft, read by signupAction.

export const TRY_VISITOR_COOKIE = "lk_try";
export const TRY_VISITOR_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function trySignupHref(findings: number): string {
  const n = Math.max(0, Math.min(99, Math.floor(findings) || 0));
  return n > 0 ? `/signup?from=try&findings=${n}` : "/signup?from=try";
}

// Parses /signup's from/findings params. Returns null unless from=try.
export function parseTrySignup(params: {
  from?: string | string[];
  findings?: string | string[];
}): { findings: number } | null {
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  if (from !== "try") return null;
  const raw = Array.isArray(params.findings) ? params.findings[0] : params.findings;
  const n = Number.parseInt(raw ?? "", 10);
  return { findings: Number.isFinite(n) && n > 0 && n < 100 ? n : 0 };
}

// The visitor hash is sha256 hex; reject anything else before storing it.
export function cleanVisitor(v: string | undefined | null): string | null {
  return v && /^[0-9a-f]{16,64}$/.test(v) ? v : null;
}

// Soft gate: the first finding is free; the rest unlock with an email.
export const FREE_FINDINGS = 1;
