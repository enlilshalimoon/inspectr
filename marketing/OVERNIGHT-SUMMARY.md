# Overnight work summary — read this first

Everything below was done while you slept. Net result: **signups were broken; they now work, are frictionless, and every email is branded.** Plus you have working admin access.

---

## 🔑 Your admin sign-in (do this first)

- **URL:** https://www.uselookover.com/login
- **Email:** `enlilshalimoon@gmail.com`
- **Temp password:** `FOYn8P5eQ5gO78vPMijg`
- **Change it immediately** after signing in (Settings → password). It'll send you a branded reset email if you use "forgot password," or just set a new one in Settings.

Once signed in, click **Admin** in the top nav (or go to `/admin`) to see the signup dashboard. `hi@enlil.studio` is also an admin if you remember that password.

---

## What was actually broken

The signup "fetch failed" error wasn't random — root cause: **email confirmation was ON, and Supabase's default email service has a hard rate limit (~2-4/hour).** Every signup tried to send a confirmation email, hit the rate limit, and the whole signup threw. So **nobody could sign up** — not just you. That would have quietly killed every ad click and every outreach lead.

(The Supabase project itself was fine — it had briefly been unreachable due to DNS, but it came back with all data and keys intact. 3 real user accounts were never lost.)

---

## What I changed

### 1. Signup is now frictionless (Supabase)
- **Disabled "Confirm email"** in Auth → Providers. New inspectors submit the form → instantly signed in → land on onboarding. No email-verify step, no rate limit, no "check your inbox" dead-end.
- Verified end-to-end on production: test signup → `/onboarding`, zero errors.

### 2. Every email is now branded via Resend (code, deployed)
No more `@mail.app.supabase.io` sender in any active flow. New `lib/email/send.ts` with a shared on-brand template (navy/cream/orange, Lookover wordmark).
- **Welcome email** fires on signup — from `noreply@uselookover.com`. *(Check your Gmail — I sent you a live copy so you can see it.)*
- **Password reset** now generates the secure link server-side and delivers it branded via Resend, instead of Supabase's default mailer.
- **Report delivery** to clients was already branded (`reports@uselookover.com`) — unchanged.

### 3. Auth URLs fixed (Supabase)
- Added `https://www.uselookover.com/**` to the redirect allowlist (it only had the apex `uselookover.com` before — `www` links would've been rejected on password reset).
- Set Site URL to the canonical `https://www.uselookover.com`.

### 4. Admin access restored
- Provisioned `enlilshalimoon@gmail.com` with a known password (it existed from a failed signup but had no usable password). Sign-in verified working.

---

## Verified working

| Check | Status |
|---|---|
| Supabase project reachable, keys valid, data intact | ✅ |
| Email confirmation OFF (signup issues session immediately) | ✅ |
| Production signup → /onboarding, no errors | ✅ |
| Welcome email sends from noreply@uselookover.com (HTTP 200) | ✅ |
| Password-reset link generation returns correct shape | ✅ |
| Redirect allowlist + Site URL = www | ✅ |
| /admin page queries all succeed (won't error on load) | ✅ |
| Admin sign-in works with temp password | ✅ |
| Test accounts cleaned up | ✅ |

---

## Two small things for you (optional, low priority)

1. **Change your temp password** (above) — only real to-do.
2. **Stray account:** `hello@enlil.studio` is an old unconfirmed test account (never onboarded). I left it alone since deleting accounts is destructive — delete it from Supabase → Auth → Users if you want a clean list.

## What I did NOT need to do (good news)

- **Custom SMTP** — I flagged this earlier as needing your Resend API key (which I can't type into forms). It's now **unnecessary**: since welcome + password-reset both go through Resend, no active flow uses Supabase's default sender anymore. Skip it.
- **Vercel env changes** — keys didn't rotate, so nothing to update there.

---

## Commits from tonight

```
e6960c6  Add welcome-email preview/verification script
85abf22  Branded transactional emails via Resend (welcome + password reset)
5e5f11b  Trigger redeploy to pick up ADMIN_EMAILS env var
e32806b  Admin dashboard at /admin for team signup visibility
```

All deployed to production and verified.
