import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyGitHubWebhookSignature } from "../src/lib/github.ts";

function sign(payload: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

test("verifies GitHub webhook signatures with timing-safe comparison", () => {
  const payload = JSON.stringify({ repository: { html_url: "https://github.com/acme/app" } });
  const result = verifyGitHubWebhookSignature({
    payload,
    signatureHeader: sign(payload, "shared-secret"),
    secret: "shared-secret",
  });

  assert.equal(result.ok, true);
});

test("rejects invalid GitHub webhook signatures", () => {
  const result = verifyGitHubWebhookSignature({
    payload: "{}",
    signatureHeader: "sha256=bad",
    secret: "shared-secret",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "GITHUB_SIGNATURE_INVALID");
    assert.equal(result.status, 401);
  }
});

test("requires GitHub webhook secret in production", () => {
  const result = verifyGitHubWebhookSignature({
    payload: "{}",
    signatureHeader: null,
    secret: "",
    nodeEnv: "production",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "GITHUB_WEBHOOK_SECRET_MISSING");
    assert.equal(result.status, 503);
  }
});
