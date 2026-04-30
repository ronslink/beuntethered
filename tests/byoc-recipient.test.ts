import assert from "node:assert/strict";
import test from "node:test";
import { validateBYOCInviteRecipient } from "../src/lib/byoc-recipient.ts";

test("allows BYOC invite to a new unknown client email", () => {
  const result = validateBYOCInviteRecipient({
    invitedEmail: "new-client@example.com",
    existingUser: null,
    facilitatorId: "facilitator_1",
  });

  assert.equal(result.valid, true);
});

test("allows BYOC invite to an existing client account", () => {
  const result = validateBYOCInviteRecipient({
    invitedEmail: "buyer@example.com",
    existingUser: { id: "client_1", role: "CLIENT" },
    facilitatorId: "facilitator_1",
  });

  assert.equal(result.valid, true);
});

test("rejects BYOC invite when facilitator enters their own email", () => {
  const result = validateBYOCInviteRecipient({
    invitedEmail: "elena@example.com",
    existingUser: { id: "facilitator_1", role: "FACILITATOR" },
    facilitatorId: "facilitator_1",
  });

  assert.equal(result.valid, false);
  assert.equal(result.code, "BYOC_CLIENT_EMAIL_IS_FACILITATOR");
});

test("rejects BYOC invite to another facilitator account", () => {
  const result = validateBYOCInviteRecipient({
    invitedEmail: "facilitator@example.com",
    existingUser: { id: "facilitator_2", role: "FACILITATOR" },
    facilitatorId: "facilitator_1",
  });

  assert.equal(result.valid, false);
  assert.equal(result.code, "BYOC_CLIENT_EMAIL_ROLE_INVALID");
});
