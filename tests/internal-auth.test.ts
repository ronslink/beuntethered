import assert from "node:assert/strict";
import test from "node:test";
import { requireInternalRequest } from "../src/lib/internal-auth.ts";

function requestWithSecret(secret?: string) {
  return new Request("https://untether.test/api/internal", {
    headers: secret ? { "x-internal-secret": secret } : {},
  });
}

function restoreEnv(key: "INTERNAL_API_SECRET" | "NODE_ENV", value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env[key];
  } else {
    env[key] = value;
  }
}

function setEnv(key: "INTERNAL_API_SECRET" | "NODE_ENV", value: string | undefined) {
  restoreEnv(key, value);
}

test("internal auth accepts matching shared secret", () => {
  const previousSecret = process.env.INTERNAL_API_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  setEnv("INTERNAL_API_SECRET", "local-secret");
  setEnv("NODE_ENV", "production");

  try {
    assert.deepEqual(requireInternalRequest(requestWithSecret("local-secret")), {
      ok: true,
      mode: "secret",
    });
  } finally {
    restoreEnv("INTERNAL_API_SECRET", previousSecret);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("internal auth denies missing or wrong production secrets", () => {
  const previousSecret = process.env.INTERNAL_API_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  setEnv("INTERNAL_API_SECRET", "local-secret");
  setEnv("NODE_ENV", "production");

  try {
    const result = requireInternalRequest(requestWithSecret("wrong-secret"));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "INTERNAL_ACCESS_DENIED");
      assert.equal(result.status, 401);
    }
  } finally {
    restoreEnv("INTERNAL_API_SECRET", previousSecret);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});

test("internal auth allows development fallback but blocks missing production configuration", () => {
  const previousSecret = process.env.INTERNAL_API_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  setEnv("INTERNAL_API_SECRET", undefined);

  try {
    setEnv("NODE_ENV", "development");
    assert.deepEqual(requireInternalRequest(requestWithSecret()), {
      ok: true,
      mode: "development",
    });

    setEnv("NODE_ENV", "production");
    const result = requireInternalRequest(requestWithSecret());
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "INTERNAL_SECRET_MISSING");
      assert.equal(result.status, 503);
    }
  } finally {
    restoreEnv("INTERNAL_API_SECRET", previousSecret);
    restoreEnv("NODE_ENV", previousNodeEnv);
  }
});
