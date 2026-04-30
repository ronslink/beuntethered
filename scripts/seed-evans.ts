/**
 * Seed: Evans Onyango demo CLIENT account.
 * Run: npx tsx scripts/seed-evans.ts
 */
import { Client } from "pg";
import bcrypt from "bcrypt";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error("DATABASE_URL is required to run scripts/seed-evans.ts");
}
const db = new Client({ connectionString: DB_URL });

function cuid(): string {
  // Simple cuid-style id — matches Prisma @default(cuid()) output format
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `c${ts}${rand}`;
}

async function main() {
  await db.connect();
  console.log("✓ Connected to Supabase");

  const email = "evans@intellibyte.dev";

  // ── Idempotent cleanup ──────────────────────────────────────────────────────
  const existing = await db.query(`SELECT id FROM "User" WHERE email = $1`, [email]);
  if (existing.rows.length > 0) {
    const userId = existing.rows[0].id;
    console.log(`Existing user found — cleaning up...`);
    const projects = await db.query(`SELECT id FROM "Project" WHERE client_id = $1 OR creator_id = $1`, [userId]);
    for (const p of projects.rows) {
      await db.query(`DELETE FROM "Milestone" WHERE project_id = $1`, [p.id]);
      await db.query(`DELETE FROM "Bid" WHERE project_id = $1`, [p.id]);
    }
    await db.query(`DELETE FROM "Project" WHERE client_id = $1 OR creator_id = $1`, [userId]);
    await db.query(`DELETE FROM "User" WHERE id = $1`, [userId]);
    console.log("✓ Cleaned previous seed");
  }

  // ── 1. Create Evans ─────────────────────────────────────────────────────────
  const evansId = cuid();
  const password_hash = await bcrypt.hash("Evans2024!", 12);

  await db.query(
    `INSERT INTO "User" (id, email, name, password_hash, role)
     VALUES ($1, $2, $3, $4, 'CLIENT')`,
    [evansId, email, "Evans Onyango", password_hash]
  );
  console.log(`✓ Created CLIENT: ${evansId}`);

  // ── 2. Find or create facilitator ───────────────────────────────────────────
  const facilResult = await db.query(`SELECT id FROM "User" WHERE role = 'FACILITATOR' LIMIT 1`);
  let facilitatorId: string;
  if (facilResult.rows.length > 0) {
    facilitatorId = facilResult.rows[0].id;
    console.log(`✓ Using existing facilitator: ${facilitatorId}`);
  } else {
    facilitatorId = cuid();
    const fHash = await bcrypt.hash("Demo1234!", 12);
    await db.query(
      `INSERT INTO "User" (id, email, name, password_hash, role)
       VALUES ($1, $2, $3, $4, 'FACILITATOR')`,
      [facilitatorId, "dev@demo.untether.network", "Alex Dev", fHash]
    );
    console.log(`✓ Created demo facilitator: ${facilitatorId}`);
  }

  // ── Helper: create project ───────────────────────────────────────────────────
  async function createProject(title: string, status: string, sow: string): Promise<string> {
    const id = cuid();
    await db.query(
      `INSERT INTO "Project" (id, title, status, client_id, creator_id, ai_generated_sow)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, title, status, evansId, evansId, sow]
    );
    return id;
  }

  // ── Helper: create milestone ─────────────────────────────────────────────────
  async function createMilestone(
    projectId: string, title: string, description: string, amount: number, status: string
  ): Promise<void> {
    const id = cuid();
    await db.query(
      `INSERT INTO "Milestone" (id, project_id, facilitator_id, title, description, amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, projectId, facilitatorId, title, description, amount, status]
    );
  }

  // ── 3. ACTIVE project ──────────────────────────────────────────────────────
  const p1 = await createProject(
    "InteliByte Analytics Dashboard", "ACTIVE",
    "Full-stack analytics dashboard: real-time KPI monitoring, exportable reports, role-based access."
  );
  await createMilestone(p1, "Backend API & Data Models", "REST API, PostgreSQL schema, auth middleware.", 1500, "APPROVED_AND_PAID");
  await createMilestone(p1, "Dashboard UI — Core Layout", "React dashboard shell with chart components.", 2000, "FUNDED_IN_ESCROW");
  await createMilestone(p1, "Export & Reporting Module", "CSV/PDF export, scheduled email reports.", 1200, "PENDING");
  console.log(`✓ ACTIVE project created: ${p1}`);

  // ── 4. OPEN_BIDDING project ─────────────────────────────────────────────────
  const p2 = await createProject(
    "Mobile App — Customer Portal", "OPEN_BIDDING",
    "React Native app: order tracking, support tickets, push notifications."
  );
  await createMilestone(p2, "App Architecture & Setup", "RN scaffold, navigation, auth flow.", 800, "PENDING");
  await createMilestone(p2, "Order Tracking Screen", "Live order status UI with real-time polling.", 1200, "PENDING");

  // Add a realistic bid with all required fields
  const bidId = cuid();
  await db.query(
    `INSERT INTO "Bid" (id, project_id, developer_id, proposed_amount, estimated_days, technical_approach, ai_translation_summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      bidId, p2, facilitatorId, 1800, 28,
      "Will use React Native with Expo, React Query for data fetching, and Firebase Cloud Messaging for push notifications. Estimated 4 weeks.",
      "Experienced RN developer proposes a 4-week delivery using modern tooling including Expo, React Query, and FCM for notifications."
    ]
  );
  console.log(`✓ OPEN_BIDDING project + bid created: ${p2}`);

  // ── 5. COMPLETED project ────────────────────────────────────────────────────
  const p3 = await createProject(
    "Landing Page Redesign", "COMPLETED",
    "Full redesign of intellibyte.dev — modern layout, animations, CMS integration."
  );
  await createMilestone(p3, "Design Handoff & Build", "Figma to Next.js, fully responsive.", 2500, "APPROVED_AND_PAID");
  console.log(`✓ COMPLETED project created: ${p3}`);

  console.log("\n✅ Evans' account is ready.");
  console.log("────────────────────────────────────────");
  console.log(`  Name:     Evans Onyango`);
  console.log(`  Email:    evans@intellibyte.dev`);
  console.log(`  Password: Evans2024!`);
  console.log(`  Role:     CLIENT`);
  console.log("────────────────────────────────────────");
}

main()
  .catch(e => { console.error("❌ Seed failed:", e.message); process.exit(1); })
  .finally(() => db.end());
