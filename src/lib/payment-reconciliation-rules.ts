export function buildEscrowTransferRecordUpdate({
  existingStatus,
  transferId,
  fees,
  source,
}: {
  existingStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | null;
  transferId: string;
  fees: {
    grossAmountCents: number;
    platformFeeCents: number;
    facilitatorPayoutCents: number;
    feeRate: number;
  };
  source: "webhook_transfer";
}) {
  return {
    status: "SUCCEEDED" as const,
    stripe_transfer_id: transferId,
    gross_amount_cents: fees.grossAmountCents,
    platform_fee_cents: fees.platformFeeCents,
    facilitator_payout_cents: fees.facilitatorPayoutCents,
    ...(existingStatus === "PENDING"
      ? { metadata: { fee_rate: fees.feeRate, reconciliation_source: source } }
      : {}),
  };
}
