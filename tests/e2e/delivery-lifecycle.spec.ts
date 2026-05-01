import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedFacilitatorVerifications, seedUser } from "./support/db";

test("buyer and facilitator complete a funded milestone delivery review", async ({ page, browser }) => {
  const prefix = `playwright-delivery-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-delivery-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Delivery Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Delivery Facilitator" });

  await prisma.user.update({
    where: { id: facilitator.id },
    data: { stripe_account_id: "acct_playwright_connected" },
  });
  await seedFacilitatorVerifications({ userId: facilitator.id });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Delivery Lifecycle Project",
      ai_generated_sow: "Build and verify an operations dashboard milestone with escrow-backed acceptance.",
      status: "ACTIVE",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Operations dashboard delivery",
          amount: 4200,
          description: "Submit a working preview, source package, and review evidence.",
          acceptance_criteria: ["Preview URL loads", "Dashboard workflow is documented"],
          deliverables: ["Preview deployment", "Source archive", "Evidence note"],
          estimated_duration_days: 10,
          status: "FUNDED_IN_ESCROW",
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
      status: "SUCCEEDED",
      gross_amount_cents: 420000,
      platform_fee_cents: 33600,
      facilitator_payout_cents: 420000,
      stripe_payment_intent_id: "pi_playwright_funded",
      idempotency_key: `${prefix}-funding`,
      metadata: { source: "playwright_seed" },
    },
  });

  await prisma.activityLog.create({
    data: {
      project_id: project.id,
      actor_id: client.id,
      milestone_id: milestone.id,
      action: "MILESTONE_FUNDED",
      entity_type: "PaymentRecord",
      entity_id: `${prefix}-funding`,
      metadata: { source: "playwright_seed" },
    },
  });
  const evidenceSource = await prisma.projectEvidenceSource.create({
    data: {
      project_id: project.id,
      created_by_id: facilitator.id,
      type: "VERCEL",
      label: "Delivery lifecycle preview",
      url: "https://preview.example.com/delivery-lifecycle",
      status: "CONNECTED",
      metadata: {
        source: "playwright_seed",
        verification_note: "Maps to the operations dashboard delivery milestone and proves the preview workflow is reviewable.",
      },
    },
  });

  try {
    await signInAs(page, facilitatorEmail);

    await page.goto(`/command-center/${project.id}`);
    await expect(page.getByRole("heading", { name: /delivery lifecycle project/i })).toBeVisible();
    await expect(page.getByText(/funded in escrow/i)).toBeVisible();
    await expect(page.getByText(/proof contract/i)).toBeVisible();
    await expect(page.getByText("Working preview URL", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/proof readiness/i)).toBeVisible();
    await expect(page.getByText(/submit preview, source archive, and evidence/i)).toBeVisible();
    await expect(page.getByText(/submission proof gates/i)).toBeVisible();
    await expect(page.getByText(/linked evidence sources/i)).toBeVisible();
    await page.getByLabel(/delivery lifecycle preview/i).check();
    await expect(page.getByText(/selected proof confidence/i)).toBeVisible();
    await expect(page.getByText(/verified of 1 selected/i)).toBeVisible();
    await page.getByPlaceholder("https://preview.vercel.app").fill("https://preview.example.com/delivery-lifecycle");
    await page.getByPlaceholder(/summarize what changed/i).fill("The preview URL loads the operations dashboard, the attached source archive contains the implementation, and the evidence note documents the dashboard workflow acceptance check.");
    await page.getByLabel(/mapped this submission to the proof gates/i).check();
    await page.locator('input[name="payloadZip"]').setInputFiles({
      name: "delivery-source.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("playwright delivery archive"),
    });
    await page.locator('input[name="evidenceFiles"]').setInputFiles({
      name: "review-evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Preview loads and dashboard workflow is documented."),
    });
    await page.getByRole("button", { name: /submit code/i }).click();

    await expect
      .poll(async () => {
        const fresh = await prisma.milestone.findUnique({
          where: { id: milestone.id },
          select: { status: true },
        });
        return fresh?.status;
      })
      .toBe("SUBMITTED_FOR_REVIEW");

    await expect(page.getByText(/client reviewing staging/i)).toBeVisible();
    await expect(page.getByText("Linked Source Evidence")).toBeVisible();
    await expect(page.getByText("Delivery lifecycle preview")).toBeVisible();
    await expect
      .poll(async () => {
        const activity = await prisma.activityLog.findFirst({
          where: { project_id: project.id, milestone_id: milestone.id, action: "MILESTONE_SUBMITTED" },
          orderBy: { created_at: "desc" },
          select: { metadata: true },
        });
        const metadata = activity?.metadata;
        if (!metadata || typeof metadata !== "object" || !("linked_evidence_sources" in metadata)) return null;
        if (!("linked_evidence_verification" in metadata)) return null;
        const sources = metadata.linked_evidence_sources;
        if (!Array.isArray(sources)) return null;
        const firstSource = sources[0];
        return firstSource &&
          typeof firstSource === "object" &&
          !Array.isArray(firstSource) &&
          "id" in firstSource &&
          typeof firstSource.id === "string"
          ? firstSource.id
          : null;
      })
      .toBe(evidenceSource.id);

    await prisma.milestoneAudit.deleteMany({ where: { milestone_id: milestone.id } });
    const audit = await prisma.milestoneAudit.create({
      data: {
        milestone_id: milestone.id,
        project_id: project.id,
        requested_by_id: client.id,
        provider: "playwright",
        model: "smoke-auditor",
        score: 94,
        is_passing: true,
        criteria_met: ["Preview URL loads", "Dashboard workflow is documented"],
        criteria_missed: [],
        summary: "Playwright smoke audit verified the milestone evidence and acceptance criteria.",
        raw_result: {
          confidence_score: 94,
          pass: true,
          source: "playwright",
        },
      },
    });
    await prisma.attachment.create({
      data: {
        uploader_id: facilitator.id,
        project_id: project.id,
        milestone_id: milestone.id,
        audit_id: audit.id,
        name: "audit-evidence.txt",
        url: "https://local.blob/audit-evidence.txt",
        content_type: "text/plain",
        size_bytes: 128,
        purpose: "AUDIT_EVIDENCE",
      },
    });
    await prisma.activityLog.create({
      data: {
        project_id: project.id,
        actor_id: client.id,
        milestone_id: milestone.id,
        action: "AUDIT_COMPLETED",
        entity_type: "MilestoneAudit",
        entity_id: audit.id,
        metadata: { score: 94, is_passing: true },
      },
    });

    const clientContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const clientPage = await clientContext.newPage();
    clientPage.on("dialog", async (dialog) => dialog.accept());
    await clientPage.route("**/api/stripe/release-escrow", async (route) => {
      const releaseRequest = route.request().postDataJSON();
      expect(releaseRequest.approvalAttestation.testedPreview).toBe(true);
      expect(releaseRequest.approvalAttestation.reviewedEvidence).toBe(true);
      expect(releaseRequest.approvalAttestation.acceptsPaymentRelease).toBe(true);

      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: "APPROVED_AND_PAID", paid_at: new Date() },
      });
      await prisma.project.update({
        where: { id: project.id },
        data: { status: "COMPLETED" },
      });
      await prisma.paymentRecord.upsert({
        where: { idempotency_key: `${prefix}-release` },
        update: { status: "SUCCEEDED" },
        create: {
          project_id: project.id,
          milestone_id: milestone.id,
          client_id: client.id,
          facilitator_id: facilitator.id,
          kind: "ESCROW_RELEASE",
          status: "SUCCEEDED",
          gross_amount_cents: 420000,
          platform_fee_cents: 33600,
          facilitator_payout_cents: 420000,
          stripe_transfer_id: "tr_playwright_release",
          idempotency_key: `${prefix}-release`,
          metadata: {
            source: "playwright_route",
            approval_attestation: {
              testedPreview: releaseRequest.approvalAttestation.testedPreview,
              reviewedEvidence: releaseRequest.approvalAttestation.reviewedEvidence,
              acceptsPaymentRelease: releaseRequest.approvalAttestation.acceptsPaymentRelease,
              auditStatus: "SUCCESS",
              acceptedAt: new Date().toISOString(),
            },
          },
        },
      });
      await prisma.activityLog.create({
        data: {
          project_id: project.id,
          actor_id: client.id,
          milestone_id: milestone.id,
          action: "PAYMENT_RELEASED",
          entity_type: "PaymentRecord",
          entity_id: `${prefix}-release`,
          metadata: { stripe_transfer_id: "tr_playwright_release" },
        },
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          transfer: "tr_playwright_release",
          downloadUrl: "https://local.blob/delivery-source.zip",
        }),
      });
    });

    try {
      await signInAs(clientPage, clientEmail);
      await clientPage.goto(`/command-center/${project.id}`);
      await expect(clientPage.getByText(/review the audit, test the preview/i)).toBeVisible();
      await expect(clientPage.getByText(/ai delivery audit/i)).toBeVisible();
      await expect(clientPage.getByText("94%", { exact: true })).toBeVisible();
      await expect(clientPage.getByText(/preview url loads/i).first()).toBeVisible();
      await expect(clientPage.getByText("Linked Source Evidence")).toBeVisible();
      await expect(clientPage.getByText(/linked proof confidence/i)).toBeVisible();
      await expect(clientPage.getByText(/average confidence/i).last()).toBeVisible();
      await expect(clientPage.getByText("Client Review Guide")).toBeVisible();
      await expect(clientPage.getByText(/you do not need to understand every tool/i)).toBeVisible();
      await expect(clientPage.getByText(/open the deployment link/i)).toBeVisible();
      await expect(clientPage.getByRole("link", { name: /test app/i })).toBeVisible();
      await clientPage.getByRole("button", { name: /open dispute/i }).click();
      await expect(clientPage.getByText(/dispute review context/i)).toBeVisible();
      await expect(clientPage.getByText(/status submitted for review/i)).toBeVisible();
      await expect(clientPage.getByText(/artifacts?/i).first()).toBeVisible();
      await clientPage.getByRole("button", { name: /close dispute modal/i }).click();
      await clientPage.getByLabel(/tested the preview/i).check();
      await clientPage.getByLabel(/reviewed the proof package/i).check();
      await clientPage.getByLabel(/approval releases escrow/i).check();
      await clientPage.getByRole("button", { name: /approve & pay/i }).click();
      await expect(clientPage.getByText(/project complete/i)).toBeVisible();
      await expect(clientPage.getByText(/buyer release attestation/i)).toBeVisible();
      await expect(clientPage.getByText(/preview tested/i)).toBeVisible();

      await expect
        .poll(async () => {
          const fresh = await prisma.milestone.findUnique({
            where: { id: milestone.id },
            select: { status: true },
          });
          return fresh?.status;
        })
        .toBe("APPROVED_AND_PAID");
    } finally {
      await clientContext.close();
    }
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
