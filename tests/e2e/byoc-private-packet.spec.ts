import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("facilitator sees recent BYOC packet and client invite renders trust scope", async ({ page }) => {
  const prefix = `playwright-byoc-packet-${Date.now()}`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const inviteToken = `playwright-byoc-${Date.now()}`;

  await cleanupByEmailPrefix("playwright-byoc-packet-");
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "BYOC Facilitator",
  });
  const claimedClient = await seedUser({
    email: `${prefix}-claimed-client@example.com`,
    role: "CLIENT",
    name: "Claimed BYOC Buyer",
  });

  await prisma.project.create({
    data: {
      creator_id: facilitator.id,
      title: "Private Revenue Ops Portal",
      ai_generated_sow:
        "Private BYOC Scope: Private Revenue Ops Portal\n\nExecutive Summary\nBuild a verified revenue operations portal with role-based access, billing evidence, and milestone acceptance checks.\n\nBYOC Transition Baseline\nTransition mode: running project\nCurrent project state: The buyer has a partial dashboard and draft billing model.\nPrior work or existing assets: Existing repository, staging URL, and design notes.\nRemaining work to govern in Untether: Release hardening, billing evidence, and reporting handoff.\nKnown risks or open questions: Stripe webhook access is pending.\nPlatform responsibility starts from the accepted packet and funded milestones onward.\n\nMilestone evidence must include a live preview URL, repository branch, screenshots, and buyer acceptance checklist.",
      is_byoc: true,
      invite_token: inviteToken,
      invited_client_email: `${prefix}-client@example.com`,
      status: "DRAFT",
      milestones: {
        create: [
          {
            facilitator_id: facilitator.id,
            title: "Revenue portal foundation",
            amount: 2400,
            estimated_duration_days: 6,
            description: "Implement authenticated workspace, navigation, and billing-ready account model.",
            deliverables: ["Live preview URL", "Repository branch", "Setup notes"],
            acceptance_criteria: ["Buyer can sign in", "Workspace navigation renders", "Billing fields are present"],
          },
          {
            facilitator_id: facilitator.id,
            title: "Evidence-backed reporting workflow",
            amount: 1800,
            estimated_duration_days: 4,
            description: "Deliver reporting screens with audit-ready screenshots and acceptance checklist.",
            deliverables: ["Report screenshots", "QA checklist"],
            acceptance_criteria: ["Reports render sample data", "Checklist maps each acceptance item to evidence"],
          },
        ],
      },
      activity_logs: {
        create: [
          {
            actor_id: facilitator.id,
            action: "PROJECT_CREATED",
            entity_type: "Project",
            entity_id: "seeded-byoc-project",
            metadata: {
              operation: "BYOC_INVITE_CREATED",
              actor_project_role: "FACILITATOR",
              byoc: true,
              milestone_count: 2,
              gross_amount_cents: 420000,
              platform_fee_cents: 21000,
              client_total_cents: 441000,
              facilitator_payout_cents: 420000,
            },
          },
          {
            actor_id: facilitator.id,
            action: "SYSTEM_EVENT",
            entity_type: "Project",
            entity_id: "seeded-byoc-delivery",
            metadata: {
              operation: "BYOC_INVITE_DELIVERY_RECORDED",
              actor_project_role: "FACILITATOR",
              byoc: true,
              invited_client_email: `${prefix}-client@example.com`,
              email_delivery_sent: false,
              email_delivery_skipped: "RESEND_API_KEY_MISSING",
              existing_client_account: false,
              in_app_notification_sent: false,
            },
          },
        ],
      },
    },
  });
  await prisma.project.create({
    data: {
      creator_id: facilitator.id,
      client_id: claimedClient.id,
      title: "Claimed Support Dashboard",
      ai_generated_sow:
        "Private BYOC Scope: Claimed Support Dashboard\n\nBYOC Transition Baseline\nTransition mode: ongoing to milestones",
      is_byoc: true,
      invite_token: null,
      invited_client_email: claimedClient.email,
      status: "ACTIVE",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Support dashboard release",
          amount: 1600,
          estimated_duration_days: 5,
          description: "Release a support dashboard with buyer-visible evidence and acceptance checklist.",
          deliverables: ["Live preview URL", "Evidence checklist"],
          acceptance_criteria: ["Buyer can open the preview", "Checklist maps each item to evidence"],
        },
      },
    },
  });

  try {
    await signInAs(page, facilitatorEmail);
    await page.goto("/byoc/new");

    await expect(page.getByRole("heading", { name: /create a verified private delivery packet/i })).toBeVisible();
    await expect(page.getByText("Private Revenue Ops Portal").first()).toBeVisible();
    await expect(page.getByText("Claimed Support Dashboard").first()).toBeVisible();
    await expect(page.getByText("Awaiting funding").first()).toBeVisible();
    await expect(page.getByText("Buyer claimed packet").first()).toBeVisible();
    await expect(page.getByText("Support dashboard release").first()).toBeVisible();
    await expect(page.getByText("pending · $1,600").first()).toBeVisible();
    await expect(page.getByText("Email locked").first()).toBeVisible();
    await expect(page.getByText("Waiting for invited buyer").first()).toBeVisible();
    await expect(page.getByText("Email: email unavailable")).toBeVisible();
    await expect(page.getByText("In-app: not matched")).toBeVisible();
    await expect(page.getByText(`${prefix}-client@example.com`)).toBeVisible();
    await expect(page.getByText("$4,200").first()).toBeVisible();
    await expect(page.locator(`a[href="/invite/${inviteToken}"]`).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /copy link/i })).toBeVisible();

    await page.goto(`/invite/${inviteToken}`);
    await expect(page.getByRole("heading", { name: /review your verified delivery scope/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Private Revenue Ops Portal" })).toBeVisible();
    await expect(page.getByText("Revenue portal foundation")).toBeVisible();
    await expect(page.getByText("Evidence-backed reporting workflow")).toBeVisible();
    await expect(page.getByText("Estimated escrow total")).toBeVisible();
    await expect(page.getByText("$4,410").first()).toBeVisible();
    await expect(page.getByText("Milestone escrow")).toBeVisible();
    await expect(page.getByText("Evidence trail")).toBeVisible();
    await expect(page.getByText("Transition baseline", { exact: true })).toBeVisible();
    await expect(page.getByText("What Untether governs from here")).toBeVisible();
    await expect(page.getByText("The buyer has a partial dashboard and draft billing model.", { exact: true })).toBeVisible();
    await expect(page.getByText("Release hardening, billing evidence, and reporting handoff.", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /switch to client account/i })).toHaveAttribute(
      "href",
      "/dashboard?invite_error=client_account_required"
    );
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
