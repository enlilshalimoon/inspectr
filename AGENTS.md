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

See `DECISIONS.md` for stack rationale and `db/migrations/` for the canonical schema.
<!-- END:nextjs-agent-rules -->
