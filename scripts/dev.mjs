// Wraps `next dev` so .env.local values aren't shadowed by placeholders
// some shells inject (e.g. an empty ANTHROPIC_API_KEY="noop" set by an
// agent runtime). Next.js's loader has override:false semantics, so any
// pre-existing process.env value beats the file.

import { config } from "dotenv";
import { spawn } from "child_process";

// Drop anything that looks like a placeholder — real keys are longer.
const KEYS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const k of KEYS) {
  const v = process.env[k];
  if (!v || v.length < 20) delete process.env[k];
}

// Load .env.local now, with override so anything missing from the strip
// list still gets the file's value.
config({ path: ".env.local", override: true });

const proc = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
proc.on("exit", (code) => process.exit(code ?? 0));
