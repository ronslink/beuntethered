import assert from "node:assert/strict";
import test from "node:test";
import { getEmailConfiguration, getResendApiKey } from "../src/lib/email-config.ts";
import { sendSavedSearchAlert } from "../src/lib/resend.ts";

test("email configuration is disabled and explicit when Resend is missing", () => {
  const config = getEmailConfiguration({ RESEND_API_KEY: "" });

  assert.equal(config.provider, "resend");
  assert.equal(config.enabled, false);
  assert.deepEqual(config.missing, ["RESEND_API_KEY"]);
  assert.equal(config.defaultFrom, "Untether <notifications@untether.network>");
});

test("email configuration trims secrets and supports branded sender", () => {
  const env = {
    RESEND_API_KEY: "  re_test_key  ",
    EMAIL_FROM: " Untether Ops <ops@example.com> ",
  };

  assert.equal(getResendApiKey(env), "re_test_key");
  assert.deepEqual(getEmailConfiguration(env), {
    provider: "resend",
    enabled: true,
    defaultFrom: "Untether Ops <ops@example.com>",
    missing: [],
  });
});

test("saved search email alerts report skipped delivery when Resend is unconfigured", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const result = await sendSavedSearchAlert({
      to: "facilitator@example.com",
      name: "Facilitator",
      searchName: "AI delivery",
      matchCount: 1,
      projects: [{ title: "Audit-backed dashboard", totalValue: 12000, bidCount: 2 }],
      marketplaceUrl: "https://example.com/marketplace",
    });

    assert.deepEqual(result, { sent: false, skipped: "RESEND_API_KEY_MISSING" });
  } finally {
    if (previousKey) {
      process.env.RESEND_API_KEY = previousKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }
  }
});
