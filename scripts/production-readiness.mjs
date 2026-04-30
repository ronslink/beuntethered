import fs from "node:fs";
import path from "node:path";

const strictEnv = process.argv.includes("--strict-env");
const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const requiredEnv = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "ENCRYPTION_MASTER_KEY",
  "INTERNAL_API_SECRET",
  "CRON_SECRET",
  "ADMIN_EMAIL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "AI_BASIC_PROVIDER",
];

const providerEnv = {
  groq: ["GROQ_API_KEY", "GROQ_BASE_URL", "GROQ_MODEL"],
  "gemma-4-server": ["GEMMA_BASE_URL", "GEMMA_MODEL"],
  minimax: ["MINIMAX_API_KEY", "MINIMAX_BASE_URL"],
};

function hasValue(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

function line(status, message) {
  console.log(`${status} ${message}`);
}

let failed = false;

line("==", "Untether production readiness check");

const buildScript = packageJson.scripts?.build ?? "";
if (!buildScript) {
  line("!!", "Missing npm build script.");
  failed = true;
} else if (/migrate\s+(dev|deploy)|db\s+push|prisma\s+db\s+push/i.test(buildScript)) {
  line("!!", `Build script mutates the database: ${buildScript}`);
  failed = true;
} else {
  line("OK", `Build script is database-safe: ${buildScript}`);
}

const migrationsDir = path.join(root, "prisma", "migrations");
const migrations = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory())
  : [];

if (migrations.length === 0) {
  line("!!", "No Prisma migrations found. Production Supabase should use migrations, not db push.");
  failed = true;
} else {
  line("OK", `${migrations.length} Prisma migration directories found.`);
}

const vercelJsonPath = path.join(root, "vercel.json");
if (fs.existsSync(vercelJsonPath)) {
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));
  const cronCount = Array.isArray(vercelConfig.crons) ? vercelConfig.crons.length : 0;
  line("OK", `vercel.json present with ${cronCount} cron definition${cronCount === 1 ? "" : "s"}.`);
} else {
  line("--", "No vercel.json found.");
}

const missingRequired = requiredEnv.filter((name) => !hasValue(name));
const provider = process.env.AI_BASIC_PROVIDER || "groq";
const missingProvider = (providerEnv[provider] ?? []).filter((name) => !hasValue(name));

if (missingRequired.length > 0) {
  line(strictEnv ? "!!" : "--", `Missing required env in current shell: ${missingRequired.join(", ")}`);
  if (strictEnv) failed = true;
} else {
  line("OK", "Required environment variables are present in current shell.");
}

if (!(provider in providerEnv)) {
  line(strictEnv ? "!!" : "--", `AI_BASIC_PROVIDER is '${provider}', which is not one of: ${Object.keys(providerEnv).join(", ")}`);
  if (strictEnv) failed = true;
} else if (missingProvider.length > 0) {
  line(strictEnv ? "!!" : "--", `Missing ${provider} provider env in current shell: ${missingProvider.join(", ")}`);
  if (strictEnv) failed = true;
} else {
  line("OK", `${provider} provider environment variables are present in current shell.`);
}

line("==", strictEnv ? "Strict readiness check complete." : "Readiness check complete. Use --strict-env to fail on missing env.");
process.exit(failed ? 1 : 0);
