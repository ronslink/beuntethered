import { Client } from "pg";
import "dotenv/config";

const c = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await c.connect();
  
  // Check if user exists
  const check = await c.query(`SELECT id, email, onboarding_complete FROM "User" WHERE email = $1`, ["ron.onyango@hotmail.com"]);
  
  if (check.rows.length === 0) {
    console.log("User not found. Listing all users:");
    const all = await c.query(`SELECT email, onboarding_complete FROM "User" ORDER BY email`);
    all.rows.forEach((u: any) => console.log(`  ${u.email} | onboarding=${u.onboarding_complete}`));
  } else {
    const user = check.rows[0];
    console.log(`Found: ${user.email} | onboarding_complete=${user.onboarding_complete}`);
    
    if (!user.onboarding_complete) {
      await c.query(`UPDATE "User" SET onboarding_complete = true WHERE id = $1`, [user.id]);
      console.log("✅ Set onboarding_complete = true");
    } else {
      console.log("Already complete, no change needed.");
    }
  }
  
  await c.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
