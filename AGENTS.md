<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next.js 16 + React 19.2) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Quick gotchas confirmed for this project:

- **`middleware.ts` → `proxy.ts`** at repo root. Function is `export function proxy(...)`.
- **All Request APIs are async**: `await cookies()`, `await headers()`, `await params`, `await searchParams`.
- **Server Actions** are the preferred mutation path: `<form action={serverFn}>` with `'use server'`. Always re-check auth inside the action.
- **Turbopack is default** — don't add `--turbopack` flags.
- **`next lint` is gone** — use ESLint CLI directly. Package script is `"lint": "eslint"`.
- **`revalidateTag(tag, profile)`** — second arg required. Use `updateTag(tag)` in actions for read-your-writes.
- **Parallel routes** need `default.tsx` in every slot.

**Read `STATUS.md` next** — current state, open items, and handoff notes; update it before ending a session.

See `DECISIONS.md` for stack rationale and `db/migrations/` for the canonical schema.
<!-- END:nextjs-agent-rules -->

## Secrets in cloud sessions

`.env.local` is gitignored and never comes with a cloud session. Real values live in Vercel → Project → Settings → Environment Variables. For ops work (querying signups, sending founder email) the cloud environment's env vars must include:

- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — read users/inspections
- `RESEND_API_KEY` — send email (send-only; can't read delivery status)

If they're missing, ask the founder to add them in the environment settings (session title bar → environment → Edit). Never ask for keys in chat and never write values into the repo.
