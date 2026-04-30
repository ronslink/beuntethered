import assert from "node:assert/strict";
import test from "node:test";
import { buildEscrowTransferRecordUpdate } from "../src/lib/payment-reconciliation-rules.ts";

const fees = {
  grossAmountCents: 100000,
  platformFeeCents: 8000,
  facilitatorPayoutCents: 100000,
  feeRate: 0.08,
};

test("transfer webhook update preserves existing succeeded release metadata", () => {
  const update = buildEscrowTransferRecordUpdate({
    existingStatus: "SUCCEEDED",
    transferId: "tr_webhook",
    fees,
    source: "webhook_transfer",
  });

  assert.equal(update.status, "SUCCEEDED");
  assert.equal(update.stripe_transfer_id, "tr_webhook");
  assert.equal("metadata" in update, false);
});

test("transfer webhook update fills metadata for pending release records", () => {
  const update = buildEscrowTransferRecordUpdate({
    existingStatus: "PENDING",
    transferId: "tr_webhook",
    fees,
    source: "webhook_transfer",
  });

  assert.deepEqual(update.metadata, {
    fee_rate: 0.08,
    reconciliation_source: "webhook_transfer",
  });
});
