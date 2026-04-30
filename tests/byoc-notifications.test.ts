import assert from "node:assert/strict";
import test from "node:test";
import { buildBYOCInviteReviewNotification } from "../src/lib/byoc-notifications.ts";

test("builds a buyer next-action notification for existing BYOC invite recipients", () => {
  const notification = buildBYOCInviteReviewNotification({
    projectId: "project_123",
    projectTitle: "Private Billing Repair",
    facilitatorName: "Elena",
    inviteToken: "invite_token_123",
    transitionMode: "RUNNING_PROJECT",
  });

  assert.equal(notification.type, "MILESTONE");
  assert.equal(notification.href, "/invite/invite_token_123");
  assert.equal(notification.sourceKey, "byoc_invite_ready_project_123");
  assert.match(notification.message, /Elena prepared a private BYOC delivery packet/);
  assert.deepEqual(notification.metadata, {
    project_id: "project_123",
    invite_token: "invite_token_123",
    byoc: true,
    transition_mode: "RUNNING_PROJECT",
    next_action: "REVIEW_BYOC_PACKET",
  });
});
