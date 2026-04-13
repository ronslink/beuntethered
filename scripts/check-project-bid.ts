import { Client } from "pg";
const c = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await c.connect();

  // Bid detail
  const bid = await c.query(`
    SELECT b.id, b."project_id", b.status, b."proposed_amount", b."created_at",
           u.email as dev_email, u.role,
           p.title, p.status as proj_status, p."client_id",
           cu.email as client_email
    FROM "Bid" b
    JOIN "User" u ON u.id = b."developer_id"
    JOIN "Project" p ON p.id = b."project_id"
    JOIN "User" cu ON cu.id = p."client_id"
    WHERE b.id LIKE 'cmnxrl7n%'
  `);
  console.log("\n=== BID DETAIL ===");
  bid.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

  await c.end();
}
run().catch(e => { console.error(e); process.exit(1); });
