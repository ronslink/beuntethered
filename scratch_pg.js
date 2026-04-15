const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.iotkcsnalgwrewbpclcu:6OrPMVYx3FdP2l92@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  });
  
  try {
    await client.connect();
    
    // Check by exact email
    const emailRes = await client.query(`
      SELECT id, email, name, role, "password_hash" IS NOT NULL as has_password
      FROM "User"
      WHERE email = 'djejse@gmail.com';
    `);
    
    // Check by name just in case they used a different email but the same name
    const nameRes = await client.query(`
      SELECT id, email, name, role
      FROM "User"
      WHERE name ILIKE '%Eric%Onyango%';
    `);

    console.log("--- Query Results ---");
    console.log("Users found by Email (djejse@gmail.com):", emailRes.rows);
    console.log("Users found by Name (Eric Onyango):", nameRes.rows);
    console.log("---------------------");
    
  } catch (err) {
    console.error("Query error:", err);
  } finally {
    await client.end();
  }
}

main();
