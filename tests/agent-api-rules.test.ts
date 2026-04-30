import assert from "node:assert/strict";
import test from "node:test";
import { hashAgentToken, isAgentTokenShape, readAgentBearerToken } from "../src/lib/agent-api-rules.ts";

const validToken = `unth_${"a".repeat(64)}`;

test("agent token shape requires Untether prefix and 64 hex characters", () => {
  assert.equal(isAgentTokenShape(validToken), true);
  assert.equal(isAgentTokenShape("unth_short"), false);
  assert.equal(isAgentTokenShape(`unth_${"g".repeat(64)}`), false);
  assert.equal(isAgentTokenShape(`sk_${"a".repeat(64)}`), false);
});

test("agent bearer token reader returns stable auth failures", () => {
  const missing = readAgentBearerToken(new Request("https://untether.test/api/agents/projects"));
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.code, "AGENT_AUTH_MISSING");
    assert.equal(missing.status, 401);
  }

  const invalid = readAgentBearerToken(new Request("https://untether.test/api/agents/projects", {
    headers: { authorization: "Bearer unth_short" },
  }));
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.code, "AGENT_AUTH_INVALID");
    assert.equal(invalid.status, 401);
  }
});

test("agent bearer token reader accepts a valid generated key shape", () => {
  const result = readAgentBearerToken(new Request("https://untether.test/api/agents/projects", {
    headers: { authorization: `Bearer ${validToken}` },
  }));

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.token, validToken);
  }
});

test("agent token hashing is stable and does not expose the plaintext key", () => {
  const hash = hashAgentToken(validToken);

  assert.equal(hash.length, 64);
  assert.notEqual(hash, validToken);
  assert.equal(hashAgentToken(validToken), hash);
});
