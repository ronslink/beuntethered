import nextEnv from "@next/env";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DEFAULT_PLATFORM_ADMIN_EMAIL = "admin@untether.network";
const adminEmail = (process.env.ADMIN_EMAIL || DEFAULT_PLATFORM_ADMIN_EMAIL).trim().toLowerCase();
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL is required to ensure the platform admin account.");
  process.exit(1);
}

if (!adminEmail.includes("@")) {
  console.error("ADMIN_EMAIL must be a valid email address.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 5000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, name: true, role: true, password_hash: true, onboarding_complete: true },
  });

  if (!existing && (!adminPassword || adminPassword.length < 12)) {
    console.error(
      "ADMIN_BOOTSTRAP_PASSWORD must be set to at least 12 characters when creating a new admin account."
    );
    process.exit(1);
  }

  const password_hash = adminPassword ? await bcrypt.hash(adminPassword, 12) : undefined;

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: existing?.name || "Platform Admin",
      onboarding_complete: true,
      ...(password_hash ? { password_hash } : {}),
    },
    create: {
      email: adminEmail,
      name: "Platform Admin",
      role: "CLIENT",
      onboarding_complete: true,
      password_hash,
      skills: [],
      ai_agent_stack: [],
    },
    select: { id: true, email: true, role: true, onboarding_complete: true },
  });

  console.log(`Platform admin account ready: ${user.email} (${user.id})`);
  console.log("Admin access is granted by ADMIN_EMAIL match; the stored role is preserved for marketplace workflows.");
} finally {
  await prisma.$disconnect();
  await pool.end();
}
