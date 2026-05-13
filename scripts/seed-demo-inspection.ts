// Seed one realistic demo inspection for the currently signed-in user.
// Use ONLY in dev — uses service-role key to bypass RLS.
//
// Usage:
//   npm run seed:demo                # prompts you to pick a user from auth.users
//   npm run seed:demo -- --email=foo@bar.com
//
// Creates: 1 inspection + sections + ~10 findings spread across severities.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    return m ? [[m[1], m[2]]] : [];
  }),
) as { email?: string };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}
const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function pickUser(): Promise<{ id: string; email: string }> {
  // List the most recent auth.users row(s) via the admin API.
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) throw error;
  const users = data.users.map((u) => ({ id: u.id, email: u.email ?? "" }));
  if (!users.length) {
    console.error("No users found in auth.users. Sign up first.");
    process.exit(1);
  }
  if (args.email) {
    const m = users.find((u) => u.email.toLowerCase() === args.email!.toLowerCase());
    if (!m) {
      console.error(`No user with email ${args.email}`);
      process.exit(1);
    }
    return m;
  }
  // Default: most recent signup.
  return users[0];
}

const SECTIONS = [
  { type: "roof", label: "Roof", order: 20 },
  { type: "exterior", label: "Exterior", order: 30 },
  { type: "structure", label: "Structure & Foundation", order: 40 },
  { type: "electrical", label: "Electrical", order: 70 },
  { type: "plumbing", label: "Plumbing", order: 80 },
  { type: "hvac", label: "HVAC", order: 90 },
  { type: "water_heater", label: "Water Heater", order: 100 },
  { type: "interior", label: "Interior", order: 110 },
];

type DemoFinding = {
  section: string;
  severity: "info" | "monitor" | "minor_repair" | "major_repair" | "safety_hazard";
  title: string;
  description: string;
  recommended_action: string;
};

const DEMO_FINDINGS: DemoFinding[] = [
  {
    section: "roof",
    severity: "monitor",
    title: "Asphalt shingle roof at end of expected service life",
    description:
      "Roof covering is original asphalt shingle, estimated 22 years old. Granule loss observed on the south-facing slope, with some curling at the field shingles. Roof is functional today but at the upper end of typical service life.",
    recommended_action:
      "Recommend a qualified roofing contractor evaluate prior to next winter to plan for replacement.",
  },
  {
    section: "roof",
    severity: "major_repair",
    title: "Active leak at plumbing vent boot",
    description:
      "Dark staining approximately 2 ft in diameter observed on attic sheathing radiating from a plumbing vent penetration. Stain pattern indicates active water intrusion, likely from a cracked or aged vent boot.",
    recommended_action:
      "Recommend a qualified roofing contractor evaluate and replace the vent boot prior to closing.",
  },
  {
    section: "exterior",
    severity: "minor_repair",
    title: "Negative grade slope toward foundation, north side",
    description:
      "Grade on the north side of the home slopes toward the foundation rather than away. A visible erosion channel approaches the foundation wall. This indicates possible water intrusion into the crawl space over time.",
    recommended_action:
      "Recommend a qualified grading or landscape contractor evaluate and re-grade to establish positive drainage away from the foundation.",
  },
  {
    section: "structure",
    severity: "monitor",
    title: "Hairline drywall crack at bedroom door frame",
    description:
      "Diagonal hairline crack approximately 18 inches long observed at the top corner of an interior bedroom door frame. Door frame appears slightly out of square. This indicates possible minor settlement.",
    recommended_action:
      "Monitor for changes in crack width or door operation over the next 12 months. If progression is observed, recommend a structural engineer evaluate.",
  },
  {
    section: "electrical",
    severity: "safety_hazard",
    title: "Missing GFCI protection at kitchen counter outlet",
    description:
      "A standard duplex receptacle was observed within approximately 3 feet of the kitchen sink, lacking GFCI protection. Current electrical code requires GFCI protection within 6 feet of water sources to mitigate shock risk.",
    recommended_action:
      "Recommend a licensed electrician evaluate and replace with a GFCI-protected receptacle prior to closing.",
  },
  {
    section: "electrical",
    severity: "minor_repair",
    title: "Reversed polarity at master bedroom outlet",
    description:
      "Outlet tester indicated reversed polarity (hot and neutral swapped) at one master bedroom receptacle. Other outlets on the same circuit tested correctly.",
    recommended_action:
      "Recommend a licensed electrician evaluate and correct the receptacle wiring.",
  },
  {
    section: "plumbing",
    severity: "major_repair",
    title: "Active leak at kitchen sink p-trap",
    description:
      "An active drip was observed at the PVC p-trap beneath the kitchen sink. Standing water present on the cabinet floor, with wood staining indicating prolonged exposure.",
    recommended_action:
      "Recommend a licensed plumber evaluate and repair the p-trap. Cabinet base should be assessed for moisture damage.",
  },
  {
    section: "hvac",
    severity: "info",
    title: "Cooling system not tested — outdoor temperature below threshold",
    description:
      "Outdoor ambient temperature at the time of inspection was approximately 52°F, below the 65°F threshold required to safely operate cooling equipment. Unit appeared visually intact and free of obvious defects.",
    recommended_action:
      "Recommend an HVAC technician evaluate and test the cooling system once outdoor temperatures permit.",
  },
  {
    section: "water_heater",
    severity: "major_repair",
    title: "TPR discharge tube terminates at improper height",
    description:
      "Temperature-pressure relief (TPR) valve discharge tube terminates approximately 24 inches above the floor. Code requires termination within 6 inches of the floor to prevent scalding in the event of a relief release.",
    recommended_action:
      "Recommend a licensed plumber evaluate and re-route the TPR discharge tube to terminate within 6 inches of the floor or to an approved drain point.",
  },
  {
    section: "interior",
    severity: "minor_repair",
    title: "Failed insulated glass unit seal at living room window",
    description:
      "Living room fixed-pane window exhibits visible fogging between glass panes, consistent with a failed insulated glass unit (IGU) seal. Window remains functional but thermal performance is reduced.",
    recommended_action:
      "Recommend a qualified window contractor evaluate and replace the failed IGU.",
  },
];

async function main() {
  const user = await pickUser();
  console.log(`Seeding demo inspection for ${user.email} (${user.id})`);

  // Ensure user profile exists (handle_new_user trigger should have made it, but
  // older users might not have one).
  await sb.from("users").upsert({ id: user.id, email: user.email }).select();

  // Create inspection
  const inspectionId = randomUUID();
  const { error: insErr } = await sb.from("inspections").insert({
    id: inspectionId,
    inspector_id: user.id,
    status: "review",
    property_address: "1428 Maple Avenue",
    property_city: "Austin",
    property_state: "TX",
    property_zip: "78704",
    property_year_built: 1998,
    property_sqft: 2100,
    property_type: "single_family",
    client_name: "Jordan Rivera",
    client_email: "jordan.rivera@example.com",
    client_phone: "(512) 555-0142",
    inspection_date: new Date(Date.now() - 86400_000).toISOString().slice(0, 10),
    weather_conditions: "Partly cloudy",
    temperature_f: 62,
    occupancy_status: "occupied",
    utilities_on: { electric: true, gas: true, water: true },
    share_url_slug: `demo-${Math.random().toString(36).slice(2, 8)}`,
  });
  if (insErr) throw insErr;
  console.log(`+ inspection ${inspectionId}`);

  // Create sections and findings
  const sectionIdByType: Record<string, string> = {};
  for (const s of SECTIONS) {
    const id = randomUUID();
    sectionIdByType[s.type] = id;
    await sb.from("inspection_sections").insert({
      id,
      inspection_id: inspectionId,
      section_type: s.type,
      section_order: s.order,
    });
  }

  for (const f of DEMO_FINDINGS) {
    await sb.from("findings").insert({
      inspection_id: inspectionId,
      section_id: sectionIdByType[f.section] ?? null,
      severity: f.severity,
      title: f.title,
      description: f.description,
      recommended_action: f.recommended_action,
      is_approved: false,
      ai_confidence: 0.85,
    });
  }
  console.log(`+ ${DEMO_FINDINGS.length} findings across ${Object.keys(sectionIdByType).length} sections`);

  console.log("\nDone. Refresh the inspections dashboard to see it.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
