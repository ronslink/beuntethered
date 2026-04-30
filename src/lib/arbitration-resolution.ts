export type ArbitrationStanding = "CLIENT" | "FACILITATOR";

export function getArbitrationPaymentKeys(milestoneId: string) {
  return {
    refundRecordKey: `refund_${milestoneId}`,
    refundStripeIdempotencyKey: `refund_${milestoneId}`,
    releaseRecordKey: `release_${milestoneId}`,
    releaseStripeIdempotencyKey: `release_escrow_${milestoneId}`,
  };
}

export function getArbitrationStatusError(status: string, standing: ArbitrationStanding) {
  if (status === "DISPUTED") return null;

  return standing === "CLIENT"
    ? "Only disputed milestones can be refunded through arbitration."
    : "Only disputed milestones can be released through arbitration.";
}

export function buildArbitrationResolutionMetadata({
  standing,
  disputeId,
  arbiterId,
  stripeId,
  platformFeeCents,
  counterpartyAmountCents,
  latestAuditScore,
  latestAuditPassing,
}: {
  standing: ArbitrationStanding;
  disputeId: string;
  arbiterId: string;
  stripeId: string;
  platformFeeCents: number;
  counterpartyAmountCents: number;
  latestAuditScore?: number | null;
  latestAuditPassing?: boolean | null;
}) {
  const isClientStanding = standing === "CLIENT";

  return {
    operation: isClientStanding ? "ARBITRATION_REFUND" : "ARBITRATION_RELEASE",
    dispute_id: disputeId,
    arbiter_id: arbiterId,
    platform_fee_cents: platformFeeCents,
    latest_audit_score: latestAuditScore ?? null,
    latest_audit_passing: latestAuditPassing ?? null,
    ...(isClientStanding
      ? {
          stripe_refund_id: stripeId,
          client_refund_cents: counterpartyAmountCents,
        }
      : {
          stripe_transfer_id: stripeId,
          facilitator_payout_cents: counterpartyAmountCents,
        }),
  };
}
