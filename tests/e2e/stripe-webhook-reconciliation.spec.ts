import { expect, test } from "@playwright/test";
import { createHmac } from "node:crypto";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_playwright_test_secret";

function signedStripeEvent(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return {
    payload,
    signature: `t=${timestamp},v1=${signature}`,
  };
}

test("stripe webhook reconciles milestone funding idempotently", async ({ request }) => {
  const prefix = `playwright-stripe-funding-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-stripe-funding-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Stripe Buyer" });
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "Stripe Facilitator",
  });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Stripe Funding Webhook Project",
      ai_generated_sow: "Webhook-funded milestone acceptance.",
      status: "ACTIVE",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Funded by checkout",
          amount: 1200,
          acceptance_criteria: ["Escrow funded"],
          deliverables: ["Funding proof"],
          status: "PENDING",
        },
      },
    },
    include: { milestones: true },
  });
  const milestone = project.milestones[0];

  await prisma.paymentRecord.create({
    data: {
      project_id: project.id,
      milestone_id: milestone.id,
      client_id: client.id,
      facilitator_id: facilitator.id,
      kind: "MILESTONE_FUNDING",
      status: "PENDING",
      gross_amount_cents: 120000,
      platform_fee_cents: 9600,
      facilitator_payout_cents: 120000,
      stripe_checkout_session_id: "cs_playwright_pending",
      idempotency_key: `fund_${milestone.id}`,
    },
  });

  const event = signedStripeEvent({
    id: `evt_${prefix}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_playwright_paid",
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: "pi_playwright_paid",
        metadata: { milestone_id: milestone.id },
      },
    },
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await request.post("/api/webhooks/stripe", {
      data: event.payload,
      headers: {
        "content-type": "application/json",
        "stripe-signature": event.signature,
      },
    });
    expect(response.ok()).toBeTruthy();
  }

  const fundedMilestone = await prisma.milestone.findUnique({
    where: { id: milestone.id },
    select: { status: true, stripe_payment_intent_id: true },
  });
  expect(fundedMilestone).toEqual({
    status: "FUNDED_IN_ESCROW",
    stripe_payment_intent_id: "pi_playwright_paid",
  });

  const paymentRecord = await prisma.paymentRecord.findUnique({
    where: { idempotency_key: `fund_${milestone.id}` },
    select: {
      status: true,
      stripe_checkout_session_id: true,
      stripe_payment_intent_id: true,
      gross_amount_cents: true,
      platform_fee_cents: true,
      facilitator_payout_cents: true,
    },
  });
  expect(paymentRecord).toEqual({
    status: "SUCCEEDED",
    stripe_checkout_session_id: "cs_playwright_paid",
    stripe_payment_intent_id: "pi_playwright_paid",
    gross_amount_cents: 120000,
    platform_fee_cents: 9600,
    facilitator_payout_cents: 120000,
  });

  await expect
    .poll(async () =>
      prisma.activityLog.count({
        where: { project_id: project.id, action: "MILESTONE_FUNDED" },
      })
    )
    .toBe(1);

  await cleanupByEmailPrefix(prefix);
});

test("stripe webhook reconciles checkout expiration and transfer confirmation", async ({ request }) => {
  const prefix = `playwright-stripe-transfer-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-stripe-transfer-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Transfer Buyer" });
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "Transfer Facilitator",
  });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Stripe Transfer Webhook Project",
      ai_generated_sow: "Transfer and expiration reconciliation.",
      status: "ACTIVE",
      milestones: {
        create: [
          {
            facilitator_id: facilitator.id,
            title: "Expired checkout",
            amount: 800,
            acceptance_criteria: ["No stale funding"],
            deliverables: ["Expired session"],
            status: "PENDING",
          },
          {
            facilitator_id: facilitator.id,
            title: "Release by transfer",
            amount: 1500,
            acceptance_criteria: ["Payment released"],
            deliverables: ["Transfer proof"],
            status: "SUBMITTED_FOR_REVIEW",
          },
        ],
      },
    },
    include: { milestones: true },
  });
  const expiredMilestone = project.milestones.find((item) => item.title === "Expired checkout")!;
  const releaseMilestone = project.milestones.find((item) => item.title === "Release by transfer")!;

  await prisma.paymentRecord.create({
    data: {
      project_id: project.id,
      milestone_id: expiredMilestone.id,
      client_id: client.id,
      facilitator_id: facilitator.id,
      kind: "MILESTONE_FUNDING",
      status: "PENDING",
      gross_amount_cents: 80000,
      platform_fee_cents: 6400,
      facilitator_payout_cents: 80000,
      stripe_checkout_session_id: "cs_playwright_expiring",
      idempotency_key: `fund_${expiredMilestone.id}`,
    },
  });

  await prisma.paymentRecord.create({
    data: {
      project_id: project.id,
      milestone_id: releaseMilestone.id,
      client_id: client.id,
      facilitator_id: facilitator.id,
      kind: "ESCROW_RELEASE",
      status: "PENDING",
      gross_amount_cents: 150000,
      platform_fee_cents: 12000,
      facilitator_payout_cents: 150000,
      idempotency_key: `release_${releaseMilestone.id}`,
    },
  });

  const expiredEvent = signedStripeEvent({
    id: `evt_${prefix}_expired`,
    object: "event",
    type: "checkout.session.expired",
    data: {
      object: {
        id: "cs_playwright_expired",
        object: "checkout.session",
        payment_intent: "pi_playwright_expired",
        metadata: { milestone_id: expiredMilestone.id },
      },
    },
  });
  const expiredResponse = await request.post("/api/webhooks/stripe", {
    data: expiredEvent.payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": expiredEvent.signature,
    },
  });
  expect(expiredResponse.ok()).toBeTruthy();

  const cancelledFunding = await prisma.paymentRecord.findUnique({
    where: { idempotency_key: `fund_${expiredMilestone.id}` },
    select: { status: true, stripe_checkout_session_id: true, stripe_payment_intent_id: true },
  });
  expect(cancelledFunding).toEqual({
    status: "CANCELLED",
    stripe_checkout_session_id: "cs_playwright_expired",
    stripe_payment_intent_id: "pi_playwright_expired",
  });

  await expect
    .poll(async () =>
      prisma.activityLog.count({
        where: {
          project_id: project.id,
          action: "SYSTEM_EVENT",
          metadata: {
            path: ["operation"],
            equals: "MILESTONE_CHECKOUT_CANCELLED",
          },
        },
      })
    )
    .toBe(1);

  const transferEvent = signedStripeEvent({
    id: `evt_${prefix}_transfer`,
    object: "event",
    type: "transfer.created",
    data: {
      object: {
        id: "tr_playwright_release",
        object: "transfer",
        metadata: { milestone_id: releaseMilestone.id },
      },
    },
  });
  const transferResponse = await request.post("/api/webhooks/stripe", {
    data: transferEvent.payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": transferEvent.signature,
    },
  });
  expect(transferResponse.ok()).toBeTruthy();

  const releasedMilestone = await prisma.milestone.findUnique({
    where: { id: releaseMilestone.id },
    select: { status: true },
  });
  expect(releasedMilestone?.status).toBe("APPROVED_AND_PAID");

  const releasePayment = await prisma.paymentRecord.findUnique({
    where: { idempotency_key: `release_${releaseMilestone.id}` },
    select: { status: true, stripe_transfer_id: true },
  });
  expect(releasePayment).toEqual({
    status: "SUCCEEDED",
    stripe_transfer_id: "tr_playwright_release",
  });

  await expect
    .poll(async () =>
      prisma.activityLog.count({
        where: { project_id: project.id, action: "PAYMENT_RELEASED" },
      })
    )
    .toBe(1);

  await cleanupByEmailPrefix(prefix);
});

test("stripe transfer webhook preserves existing approval attestation", async ({ request }) => {
  const prefix = `playwright-stripe-release-idem-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-stripe-release-idem-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Release Buyer" });
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "Release Facilitator",
  });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Stripe Release Idempotency Project",
      ai_generated_sow: "Preserve approval evidence after transfer webhook.",
      status: "COMPLETED",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Already released",
          amount: 900,
          acceptance_criteria: ["Release evidence preserved"],
          deliverables: ["Transfer proof"],
          status: "APPROVED_AND_PAID",
          paid_at: new Date(),
        },
      },
    },
    include: { milestones: true },
  });
  const milestone = project.milestones[0];
  const releaseMetadata = {
    fee_rate: 0.08,
    approval_attestation: {
      testedPreview: true,
      reviewedEvidence: true,
      acceptsPaymentRelease: true,
      acceptedAt: "2026-04-29T12:00:00.000Z",
    },
  };

  await prisma.paymentRecord.create({
    data: {
      project_id: project.id,
      milestone_id: milestone.id,
      client_id: client.id,
      facilitator_id: facilitator.id,
      kind: "ESCROW_RELEASE",
      status: "SUCCEEDED",
      gross_amount_cents: 90000,
      platform_fee_cents: 7200,
      facilitator_payout_cents: 90000,
      stripe_transfer_id: "tr_existing_release",
      idempotency_key: `release_${milestone.id}`,
      metadata: releaseMetadata,
    },
  });

  await prisma.activityLog.create({
    data: {
      project_id: project.id,
      actor_id: client.id,
      milestone_id: milestone.id,
      action: "PAYMENT_RELEASED",
      entity_type: "PaymentRecord",
      entity_id: `release_${milestone.id}`,
      metadata: releaseMetadata,
    },
  });

  const transferEvent = signedStripeEvent({
    id: `evt_${prefix}_transfer`,
    object: "event",
    type: "transfer.created",
    data: {
      object: {
        id: "tr_webhook_release",
        object: "transfer",
        metadata: { milestone_id: milestone.id },
      },
    },
  });

  const transferResponse = await request.post("/api/webhooks/stripe", {
    data: transferEvent.payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": transferEvent.signature,
    },
  });
  expect(transferResponse.ok()).toBeTruthy();

  const releasePayment = await prisma.paymentRecord.findUnique({
    where: { idempotency_key: `release_${milestone.id}` },
    select: { status: true, stripe_transfer_id: true, metadata: true },
  });
  expect(releasePayment).toEqual({
    status: "SUCCEEDED",
    stripe_transfer_id: "tr_webhook_release",
    metadata: releaseMetadata,
  });

  await expect
    .poll(async () =>
      prisma.activityLog.count({
        where: { project_id: project.id, action: "PAYMENT_RELEASED" },
      })
    )
    .toBe(1);

  await cleanupByEmailPrefix(prefix);
});
