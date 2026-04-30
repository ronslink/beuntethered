import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBYOCInviteDeliveryMetadata,
  buildBYOCInviteReviewNotification,
} from "../src/lib/byoc-notifications.ts";

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

test("builds durable delivery metadata for BYOC packet audit trails", () => {
  assert.deepEqual(
    buildBYOCInviteDeliveryMetadata({
      invitedClientEmail: "buyer@example.com",
      existingClientAccount: true,
      emailDelivery: { sent: false, skipped: "RESEND_API_KEY_MISSING" },
      inAppNotificationSent: true,
    }),
    {
      operation: "BYOC_INVITE_DELIVERY_RECORDED",
      actor_project_role: "FACILITATOR",
      byoc: true,
      invited_client_email: "buyer@example.com",
      existing_client_account: true,
      email_delivery_sent: false,
      email_delivery_skipped: "RESEND_API_KEY_MISSING",
      in_app_notification_sent: true,
    },
  );
});
