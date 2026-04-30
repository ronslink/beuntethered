import { execSync } from "node:child_process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? "";
const isLocalDatabase =
  /localhost|127\.0\.0\.1|host\.docker\.internal/i.test(databaseUrl) ||
  databaseUrl.includes("@db:5432/");

if (!isLocalDatabase && process.env.ALLOW_DB_PUSH !== "1") {
  console.error(
    [
      "Refusing to run prisma db push against a non-local DATABASE_URL.",
      "Use `npm run db:migrate:deploy` for production/Supabase migrations.",
      "Set ALLOW_DB_PUSH=1 only for an intentional non-production schema sync.",
    ].join("\n")
  );
  process.exit(1);
}

console.log("Synchronizing local development database with Prisma schema via prisma db push.");
console.log("Historical Prisma migrations are retained for production baseline/deploy workflows.");

execSync("npx prisma db push", { stdio: "inherit" });
