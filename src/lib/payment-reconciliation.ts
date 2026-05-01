import type { Milestone, Prisma, Project, User } from "@prisma/client";
import { prisma } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { RELEASABLE_MILESTONE_STATUSES, shouldApplyFundingEvent } from "@/lib/milestone-state";
import { calculateMilestoneFees } from "@/lib/platform-fees";
import { buildChangeOrderCheckoutMetadata, validateChangeOrderFundingReadiness } from "./change-order-rules.ts";
import { buildEscrowTransferRecordUpdate } from "./payment-reconciliation-rules.ts";

type MilestoneWithProjectAndFacilitator = Milestone & {
  project: Project;
  facilitator: Pick<User, "id" | "email" | "notify_payment_updates"> | null;
};

export type ReconciliationResult =
  | {
      applied: true;
      milestone: MilestoneWithProjectAndFacilitator;
    }
  | {
      applied: false;
      reason: "missing_milestone" | "missing_payment_intent" | "not_applicable" | "concurrent_update";
      milestone?: MilestoneWithProjectAndFacilitator;
    };

export async function reconcileMilestoneFunding({
  milestoneId,
  paymentIntentId,
  checkoutSessionId,
  actorId,
  source,
}: {
  milestoneId: string;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  actorId?: string | null;
  source: "checkout_success" | "webhook_checkout" | "webhook_payment_intent";
}): Promise<ReconciliationResult> {
  if (!paymentIntentId) {
    return { applied: false, reason: "missing_payment_intent" };
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      project: true,
      facilitator: { select: { id: true, email: true, notify_payment_updates: true } },
    },
  });

  if (!milestone) {
    return { applied: false, reason: "missing_milestone" };
  }

  const shouldApply = shouldApplyFundingEvent({
    status: milestone.status,
    currentPaymentIntentId: milestone.stripe_payment_intent_id,
    incomingPaymentIntentId: paymentIntentId,
  });

  if (!shouldApply) {
    return { applied: false, reason: "not_applicable", milestone };
  }

  const funded = await prisma.milestone.updateMany({
    where: { id: milestoneId, status: "PENDING", stripe_payment_intent_id: null },
    data: {
      status: "FUNDED_IN_ESCROW",
      stripe_payment_intent_id: paymentIntentId,
    },
  });

  if (funded.count === 0) {
    return { applied: false, reason: "concurrent_update", milestone };
  }

  const fees = calculateMilestoneFees({
    amount: Number(milestone.amount),
    isByoc: milestone.project.is_byoc,
  });

  await prisma.paymentRecord.upsert({
    where: { idempotency_key: `fund_${milestone.id}` },
    update: {
      status: "SUCCEEDED",
      stripe_checkout_session_id: checkoutSessionId ?? undefined,
      stripe_payment_intent_id: paymentIntentId,
      gross_amount_cents: fees.grossAmountCents,
      platform_fee_cents: fees.platformFeeCents,
      facilitator_payout_cents: fees.facilitatorPayoutCents,
      metadata: { fee_rate: fees.feeRate, reconciliation_source: source },
    },
    create: {
      project_id: milestone.project_id,
      milestone_id: milestone.id,
      client_id: milestone.project.client_id ?? milestone.project.creator_id,
      facilitator_id: milestone.facilitator_id,
      kind: "MILESTONE_FUNDING",
      status: "SUCCEEDED",
      gross_amount_cents: fees.grossAmountCents,
      platform_fee_cents: fees.platformFeeCents,
      facilitator_payout_cents: fees.facilitatorPayoutCents,
      stripe_checkout_session_id: checkoutSessionId ?? null,
      stripe_payment_intent_id: paymentIntentId,
      idempotency_key: `fund_${milestone.id}`,
      metadata: { fee_rate: fees.feeRate, reconciliation_source: source },
    },
  });

  await recordActivity({
    projectId: milestone.project_id,
    actorId: actorId ?? milestone.project.client_id,
    milestoneId,
    action: "MILESTONE_FUNDED",
    entityType: "PaymentRecord",
    entityId: `fund_${milestone.id}`,
    metadata: {
      operation: "MILESTONE_FUNDED",
      payment_intent_id: paymentIntentId,
      checkout_session_id: checkoutSessionId ?? null,
      reconciliation_source: source,
    },
  });

  return { applied: true, milestone };
}

export async function markMilestoneFundingFailed({
  milestoneId,
  paymentIntentId,
  checkoutSessionId,
  status,
  source,
}: {
  milestoneId: string;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  status: "FAILED" | "CANCELLED";
  source: "webhook_checkout_expired" | "webhook_payment_failed";
}) {
  const updated = await prisma.paymentRecord.updateMany({
    where: {
      milestone_id: milestoneId,
      kind: "MILESTONE_FUNDING",
      status: "PENDING",
    },
    data: {
      status,
      stripe_checkout_session_id: checkoutSessionId ?? undefined,
      stripe_payment_intent_id: paymentIntentId ?? undefined,
      metadata: buildPaymentFailureMetadata(source),
    },
  });

  if (updated.count === 0) return updated;

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });

  if (!milestone) return updated;

  const fees = calculateMilestoneFees({
    amount: Number(milestone.amount),
    isByoc: milestone.project.is_byoc,
  });

  await recordActivity({
    projectId: milestone.project_id,
    actorId: milestone.project.client_id ?? milestone.project.creator_id,
    milestoneId,
    action: "SYSTEM_EVENT",
    entityType: "PaymentRecord",
    entityId: `fund_${milestone.id}`,
    metadata: {
      operation: status === "CANCELLED" ? "MILESTONE_CHECKOUT_CANCELLED" : "MILESTONE_PAYMENT_FAILED",
      payment_status: status,
      payment_intent_id: paymentIntentId ?? null,
      checkout_session_id: checkoutSessionId ?? null,
      gross_amount_cents: fees.grossAmountCents,
      platform_fee_cents: fees.platformFeeCents,
      facilitator_payout_cents: fees.facilitatorPayoutCents,
      client_total_cents: fees.clientTotalCents,
      fee_rate: fees.feeRate,
      fee_model: milestone.project.is_byoc ? "BYOC" : "MARKETPLACE",
      reconciliation_source: source,
    },
  });

  return updated;
}

export async function reconcileEscrowTransfer({
  milestoneId,
  transferId,
  source,
}: {
  milestoneId: string;
  transferId: string;
  source: "webhook_transfer";
}) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });

  if (!milestone) {
    return { applied: false as const, reason: "missing_milestone" as const };
  }

  const fees = calculateMilestoneFees({
    amount: Number(milestone.amount),
    isByoc: milestone.project.is_byoc,
  });

  const existingRelease = await prisma.paymentRecord.findUnique({
    where: { idempotency_key: `release_${milestone.id}` },
    select: { id: true, status: true },
  });

  if (existingRelease) {
    await prisma.paymentRecord.update({
      where: { id: existingRelease.id },
      data: buildEscrowTransferRecordUpdate({ existingStatus: existingRelease.status, transferId, fees, source }),
    });
  } else {
    await prisma.paymentRecord.create({
      data: {
      project_id: milestone.project_id,
      milestone_id: milestone.id,
      client_id: milestone.project.client_id ?? milestone.project.creator_id,
      facilitator_id: milestone.facilitator_id,
      kind: "ESCROW_RELEASE",
      status: "SUCCEEDED",
      gross_amount_cents: fees.grossAmountCents,
      platform_fee_cents: fees.platformFeeCents,
      facilitator_payout_cents: fees.facilitatorPayoutCents,
      stripe_transfer_id: transferId,
      idempotency_key: `release_${milestone.id}`,
      metadata: { fee_rate: fees.feeRate, reconciliation_source: source },
      },
    });
  }

  const released = await prisma.milestone.updateMany({
    where: { id: milestoneId, status: { in: RELEASABLE_MILESTONE_STATUSES } },
    data: { status: "APPROVED_AND_PAID", paid_at: new Date() },
  });

  if (released.count === 0) {
    return { applied: false as const, reason: "not_releasable" as const, milestone };
  }

  await recordActivity({
    projectId: milestone.project_id,
    actorId: milestone.project.client_id,
    milestoneId,
    action: "PAYMENT_RELEASED",
    entityType: "PaymentRecord",
    entityId: `release_${milestone.id}`,
    metadata: {
      stripe_transfer_id: transferId,
      platform_fee_cents: fees.platformFeeCents,
      facilitator_payout_cents: fees.facilitatorPayoutCents,
      reconciliation_source: source,
    },
  });

  const remainingOpenMilestones = await prisma.milestone.count({
    where: {
      project_id: milestone.project_id,
      status: { not: "APPROVED_AND_PAID" },
    },
  });

  if (remainingOpenMilestones === 0) {
    await prisma.project.update({
      where: { id: milestone.project_id },
      data: { status: "COMPLETED" },
    });
  }

  return { applied: true as const, milestone };
}

export function buildPaymentFailureMetadata(
  source: "webhook_checkout_expired" | "webhook_payment_failed"
): Prisma.InputJsonObject {
  return { reconciliation_source: source };
}

export async function reconcileChangeOrderFunding({
  changeOrderId,
  paymentIntentId,
  checkoutSessionId,
  source,
}: {
  changeOrderId: string;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  source: "webhook_checkout";
}) {
  const order = await prisma.changeOrder.findUnique({
    where: { id: changeOrderId },
    include: { project: true },
  });

  if (!order) {
    return { applied: false as const, reason: "missing_change_order" as const };
  }

  const readiness = validateChangeOrderFundingReadiness(order);
  if (!readiness.ok) {
    return { applied: false as const, reason: "not_applicable" as const, order };
  }

  const funded = await prisma.changeOrder.updateMany({
    where: { id: changeOrderId, status: "PROPOSED" },
    data: { status: "ACCEPTED_AND_FUNDED" },
  });

  if (funded.count === 0) {
    return { applied: false as const, reason: "concurrent_update" as const, order };
  }

  const metadata = {
    operation: "CHANGE_ORDER_FUNDED",
    ...buildChangeOrderCheckoutMetadata({
      changeOrderId: order.id,
      projectId: order.project_id,
      addedCostCents: readiness.addedCostCents,
    }),
    checkout_session_id: checkoutSessionId ?? null,
    payment_intent_id: paymentIntentId ?? null,
    reconciliation_source: source,
  } satisfies Prisma.InputJsonObject;

  await recordActivity({
    projectId: order.project_id,
    actorId: order.project.client_id,
    action: "SYSTEM_EVENT",
    entityType: "ChangeOrder",
    entityId: order.id,
    metadata,
  });

  await prisma.timelineEvent.create({
    data: {
      project_id: order.project_id,
      type: "SYSTEM",
      status: "SUCCESS",
      description: `Change order funded: ${order.description.slice(0, 180)}`,
      author: "Untether Payments",
    },
  });

  return { applied: true as const, order };
}
