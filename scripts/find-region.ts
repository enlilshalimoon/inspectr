// Probe pooler hostnames across AWS regions until one accepts our credentials.
// Run with: npx tsx -r dotenv/config scripts/find-region.ts dotenv_config_path=.env.local

import { Client } from "pg";

const REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-south-1",
  "sa-east-1",
  "ca-central-1",
];

const ref = "uvfmvkhlgtpveusjwfww";
const password = "vpo3HQohkAOnI3IU";

async function tryRegion(region: string) {
  const url = `postgresql://postgres.${ref}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function main() {
  for (const region of REGIONS) {
    process.stdout.write(`Trying ${region.padEnd(16)} ... `);
    const ok = await tryRegion(region);
    console.log(ok ? "MATCH" : "no");
    if (ok) {
      console.log(`\nUse: postgresql://postgres.${ref}:****@aws-0-${region}.pooler.supabase.com:5432/postgres`);
      return;
    }
  }
  console.log("\nNo region matched. Check the connection string in the Supabase dashboard.");
  process.exit(1);
}

main();
