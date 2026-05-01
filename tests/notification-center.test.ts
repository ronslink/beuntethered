import assert from "node:assert/strict";
import test from "node:test";
import {
  getNotificationCategory,
  getNotificationCenterCounts,
  isPersistentUnread,
} from "../src/lib/notification-center.ts";

test("notification center separates action, trust, and unread persisted counts", () => {
  const notifications = [
    { id: "bid", message: "Bid", type: "BID" as const, read: false, createdAt: new Date(), persistent: false },
    { id: "persisted", message: "Persisted", type: "INFO" as const, read: false, createdAt: new Date(), persistent: true },
    { id: "trust", message: "Trust", type: "SUCCESS" as const, read: true, createdAt: new Date() },
  ];

  assert.deepEqual(getNotificationCenterCounts(notifications), {
    action: 1,
    trust: 1,
    unread: 1,
  });
});

test("notification category can be explicit or inferred from type", () => {
  assert.equal(getNotificationCategory({ type: "BID" }), "ACTION");
  assert.equal(getNotificationCategory({ type: "SUCCESS" }), "TRUST");
  assert.equal(getNotificationCategory({ type: "INFO", category: "MESSAGE" }), "MESSAGE");
  assert.equal(isPersistentUnread({ read: false, persistent: false }), false);
  assert.equal(isPersistentUnread({ read: false, persistent: true }), true);
});
