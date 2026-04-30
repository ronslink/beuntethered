import assert from "node:assert/strict";
import test from "node:test";
import { decrypt, decryptApiKey, encrypt, encryptApiKey } from "../src/lib/encryption.ts";

test("round-trips generic encrypted payloads", () => {
  const previous = process.env.ENCRYPTION_SECRET;
  process.env.ENCRYPTION_SECRET = "unit-test-secret";

  try {
    const encrypted = encrypt("delivery evidence payload", "workspace-salt");

    assert.equal(decrypt(encrypted, "workspace-salt"), "delivery evidence payload");
  } finally {
    if (previous === undefined) {
      delete process.env.ENCRYPTION_SECRET;
    } else {
      process.env.ENCRYPTION_SECRET = previous;
    }
  }
});

test("round-trips encrypted API keys", () => {
  const previous = process.env.ENCRYPTION_MASTER_KEY;
  process.env.ENCRYPTION_MASTER_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  try {
    const encrypted = encryptApiKey("sk-test-enterprise-readiness");

    assert.equal(decryptApiKey(encrypted), "sk-test-enterprise-readiness");
  } finally {
    if (previous === undefined) {
      delete process.env.ENCRYPTION_MASTER_KEY;
    } else {
      process.env.ENCRYPTION_MASTER_KEY = previous;
    }
  }
});
