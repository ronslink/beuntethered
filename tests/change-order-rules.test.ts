import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChangeOrderCheckoutMetadata,
  canFundChangeOrderStatus,
  getChangeOrderCostCents,
  validateChangeOrderFundingReadiness,
} from "../src/lib/change-order-rules.ts";

test("change order funding is allowed only while proposed", () => {
  assert.equal(canFundChangeOrderStatus("PROPOSED"), true);
  assert.equal(canFundChangeOrderStatus("ACCEPTED_AND_FUNDED"), false);
  assert.equal(canFundChangeOrderStatus("REJECTED"), false);
});

test("change order funding readiness validates status and amount", () => {
  assert.deepEqual(validateChangeOrderFundingReadiness({
    status: "PROPOSED",
    added_cost: "1250.25",
  }), { ok: true, addedCostCents: 125025 });

  const funded = validateChangeOrderFundingReadiness({
    status: "ACCEPTED_AND_FUNDED",
    added_cost: 1000,
  });
  assert.equal(funded.ok, false);
  if (!funded.ok) {
    assert.equal(funded.code, "CHANGE_ORDER_NOT_FUNDABLE");
    assert.equal(funded.status, 409);
  }

  const invalid = validateChangeOrderFundingReadiness({
    status: "PROPOSED",
    added_cost: 0,
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.code, "INVALID_CHANGE_ORDER_AMOUNT");
    assert.equal(invalid.status, 400);
  }
});

test("change order checkout metadata is stable for Stripe reconciliation", () => {
  assert.equal(getChangeOrderCostCents("42.50"), 4250);
  assert.deepEqual(buildChangeOrderCheckoutMetadata({
    changeOrderId: "change_1",
    projectId: "project_1",
    addedCostCents: 4250,
  }), {
    change_order_id: "change_1",
    project_id: "project_1",
    change_order_amount_cents: "4250",
  });
});
