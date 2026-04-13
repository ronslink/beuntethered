import { Client } from "pg";
const c = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await c.connect();

  // Recent bids
  const bids = await c.query(`
    SELECT b.id, b."project_id", b."developer_id", b.status, b."proposed_amount", b."created_at",
           u.email, u.role
    FROM "Bid" b
    JOIN "User" u ON u.id = b."developer_id"
    ORDER BY b."created_at" DESC
    LIMIT 10
  `);
  console.log("\n=== RECENT BIDS ===");
  bids.rows.forEach(r => console.log(`  bid=${r.id.slice(0,8)} | project=${r.project_id.slice(0,8)} | email=${r.email} | role=${r.role} | status=${r.status} | amount=${r.proposed_amount}`));

  // Recent projects open for bidding
  const projects = await c.query(`
    SELECT id, title, status, "client_id", "created_at"
    FROM "Project"
    WHERE status = 'OPEN_BIDDING'
    ORDER BY "created_at" DESC
    LIMIT 5
  `);
  console.log("\n=== OPEN BIDDING PROJECTS ===");
  projects.rows.forEach(r => console.log(`  ${r.id.slice(0,8)} | ${r.title} | client=${r.client_id.slice(0,8)}`));

  await c.end();
}
run().catch(e => { console.error(e); process.exit(1); });
