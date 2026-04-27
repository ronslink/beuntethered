import { execFileSync } from "node:child_process";

const container = process.env.POSTGRES_CONTAINER || "beuntethered-db-1";
const database = process.env.POSTGRES_DB || "beuntethered_local";
const user = process.env.POSTGRES_USER || "postgres";

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

function capture(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

const exists = capture("docker", [
  "exec",
  container,
  "psql",
  "-U",
  user,
  "-d",
  "postgres",
  "-tAc",
  `SELECT 1 FROM pg_database WHERE datname='${database.replaceAll("'", "''")}'`,
]);

if (exists !== "1") {
  run("docker", ["exec", container, "createdb", "-U", user, database]);
}

run("docker", [
  "exec",
  container,
  "psql",
  "-U",
  user,
  "-d",
  database,
  "-c",
  "CREATE SCHEMA IF NOT EXISTS extensions;",
]);
