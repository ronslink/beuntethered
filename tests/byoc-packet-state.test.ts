import assert from "node:assert/strict";
import test from "node:test";
import { getBYOCPacketState } from "../src/lib/byoc-packet-state.ts";

test("marks claimed BYOC packets as awaiting funding while first milestone is pending", () => {
  assert.deepEqual(
    getBYOCPacketState({
      id: "project_1",
      status: "ACTIVE",
      inviteToken: null,
      clientId: "client_1",
      firstMilestone: { title: "Foundation", status: "PENDING", amountCents: 160000 },
    }),
    {
      label: "Awaiting funding",
      detail: "Buyer claimed packet",
      icon: "account_balance_wallet",
      tone: "border-secondary/25 bg-secondary/10 text-secondary",
      href: "/command-center/project_1",
      action: "Open Funding",
    },
  );
});

test("marks funded BYOC packets as open for delivery", () => {
  const state = getBYOCPacketState({
    id: "project_2",
    status: "ACTIVE",
    inviteToken: null,
    clientId: "client_2",
    firstMilestone: { title: "Release", status: "FUNDED_IN_ESCROW", amountCents: 240000 },
  });

  assert.equal(state.label, "Delivery open");
  assert.equal(state.action, "Open Work");
});

test("keeps unclaimed private packets in invite states", () => {
  assert.equal(
    getBYOCPacketState({
      id: "project_3",
      status: "DRAFT",
      inviteToken: "token_3",
      clientEmail: "buyer@example.com",
      firstMilestone: { title: "Review", status: "PENDING", amountCents: 100000 },
    }).label,
    "Email locked",
  );
});
