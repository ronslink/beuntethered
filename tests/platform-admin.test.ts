import assert from "node:assert/strict";
import test from "node:test";
import { getPlatformAdminEmail, isPlatformAdminEmail, requirePlatformAdminEmail } from "../src/lib/platform-admin.ts";

test("platform admin email falls back to default", () => {
  assert.equal(getPlatformAdminEmail({}), "admin@untether.network");
  assert.equal(isPlatformAdminEmail("admin@untether.network", {}), true);
});

test("platform admin email trims env and compares case-insensitively", () => {
  const env = { ADMIN_EMAIL: " Admin@Example.COM " };

  assert.equal(getPlatformAdminEmail(env), "Admin@Example.COM");
  assert.equal(isPlatformAdminEmail("admin@example.com", env), true);
  assert.equal(isPlatformAdminEmail("other@example.com", env), false);
});

test("requirePlatformAdminEmail throws for non-admin email", () => {
  assert.doesNotThrow(() => requirePlatformAdminEmail("admin@example.com", { ADMIN_EMAIL: "admin@example.com" }));
  assert.throws(
    () => requirePlatformAdminEmail("buyer@example.com", { ADMIN_EMAIL: "admin@example.com" }),
    /Platform admin permissions/
  );
});
