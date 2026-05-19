// Creates the two private storage buckets Lookover needs.
// Run with: npx tsx -r dotenv/config scripts/setup-storage.ts dotenv_config_path=.env.local

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKETS: { name: string; public: boolean }[] = [
  { name: "inspection-media", public: false },
  { name: "report-assets", public: false },
];

async function main() {
  const { data: existing, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("Could not list buckets:", listErr.message);
    process.exit(1);
  }
  const existingNames = new Set(existing.map((b) => b.name));

  for (const bucket of BUCKETS) {
    if (existingNames.has(bucket.name)) {
      console.log(`= skip   ${bucket.name} (exists)`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
    });
    if (error) {
      console.error(`  FAIL   ${bucket.name}: ${error.message}`);
      process.exitCode = 1;
    } else {
      console.log(`+ create ${bucket.name} (private)`);
    }
  }
}

main();
