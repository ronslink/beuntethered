import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedFacilitatorVerifications, seedUser } from "./support/db";

test("buyer insights show durable audit evidence metrics", async ({ page }) => {
  const prefix = `playwright-insights-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-insights-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Insights Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Insights Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Insights Audit Project",
      ai_generated_sow: "Build a verified reporting workflow with audit-backed milestone release.",
      status: "COMPLETED",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Verified reporting workflow",
          amount: 5000,
          description: "Reporting workflow with durable audit proof.",
          acceptance_criteria: ["Report renders", "Audit evidence is visible"],
          deliverables: ["Staging URL", "Audit report"],
          estimated_duration_days: 12,
          status: "APPROVED_AND_PAID",
          paid_at: new Date(),
        },
      },
    },
    include: { milestones: true },
  });
  await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Insights Active Portal",
      ai_generated_sow: "Build a buyer portal with escrow funding, delivery review, and evidence reporting.",
      status: "ACTIVE",
      milestones: {
        create: [
          {
            facilitator_id: facilitator.id,
            title: "Fund the integration milestone",
            amount: 2400,
            description: "Integration milestone awaiting escrow funding.",
            acceptance_criteria: ["Escrow can be funded"],
            deliverables: ["Funding plan"],
            status: "PENDING",
          },
          {
            facilitator_id: facilitator.id,
            title: "Review delivered dashboard",
            amount: 3200,
            description: "Dashboard submitted with evidence.",
            acceptance_criteria: ["Buyer can review staging"],
            deliverables: ["Preview URL", "Screenshots"],
            status: "SUBMITTED_FOR_REVIEW",
          },
        ],
      },
    },
  });
  const biddingProject = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Insights Proposal Queue",
      ai_generated_sow: "Collect proposals for a verified reporting workflow.",
      status: "OPEN_BIDDING",
    },
  });
  await prisma.bid.create({
    data: {
      project_id: biddingProject.id,
      developer_id: facilitator.id,
      proposed_amount: 4100,
      estimated_days: 14,
      technical_approach: "Deliver with verified checkpoints and audit-ready evidence.",
      proposed_tech_stack: "Next.js, TypeScript, Stripe",
      ai_translation_summary: "Outcome-based milestone proposal.",
      status: "PENDING",
    },
  });

  await prisma.milestoneAudit.create({
    data: {
      milestone_id: project.milestones[0].id,
      project_id: project.id,
      requested_by_id: client.id,
      provider: "playwright",
      model: "insights-smoke",
      score: 92,
      is_passing: true,
      criteria_met: ["Report renders", "Audit evidence is visible"],
      criteria_missed: [],
      summary: "Audit evidence confirms the reporting workflow meets acceptance criteria.",
      raw_result: { confidence_score: 92, pass: true },
    },
  });

  try {
    await signInAs(page, clientEmail);

    await page.goto("/insights");
    await expect(page.getByText("Action Radar")).toBeVisible();
    await expect(page.getByText("Proposal decisions")).toBeVisible();
    await expect(page.getByText("Escrow funding")).toBeVisible();
    await expect(page.getByText("Delivery review")).toBeVisible();
    await expect(page.getByRole("link", { name: /milestones awaiting funding/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /milestones awaiting review/i })).toBeVisible();
    await expect(page.getByText("Priority Workspaces")).toBeVisible();
    await expect(page.getByText("Insights Active Portal")).toBeVisible();
    await expect(page.getByText("Insights Proposal Queue")).toBeVisible();
    await expect(page.getByText("Audit-Backed Delivery Evidence")).toBeVisible();
    await expect(page.getByText("1 audited")).toBeVisible();
    await expect(page.getByTestId("audit-pass-rate")).toContainText("Pass rate");
    await expect(page.getByTestId("audit-pass-rate")).toContainText("100%");
    await expect(page.getByTestId("audit-average-score")).toContainText("92%");
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("facilitator insights show profile demand and opportunity radar", async ({ page }) => {
  const prefix = `playwright-facilitator-insights-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-facilitator-insights-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Insights Demand Buyer" });
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "Insights Demand Facilitator",
  });

  await prisma.user.update({
    where: { id: facilitator.id },
    data: {
      skills: ["Next.js", "Stripe", "TypeScript"],
      ai_agent_stack: ["OpenAI", "Playwright"],
      trust_score: 88,
      average_ai_audit_score: 91,
      total_sprints_completed: 3,
      portfolio_url: "https://example.com/insights-demand",
      availability: "AVAILABLE",
    },
  });
  await seedFacilitatorVerifications({ userId: facilitator.id, includePortfolio: false });

  await prisma.profileView.create({
    data: {
      facilitator_id: facilitator.id,
      viewer_id: client.id,
      viewer_role: "CLIENT",
    },
  });

  await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Insights Fit Portal",
      ai_generated_sow: "Build a Next.js Stripe portal with TypeScript, checkout evidence, and Playwright verification.",
      status: "OPEN_BIDDING",
      milestones: {
        create: {
          title: "Verified Stripe portal",
          amount: 4200,
          description: "Build the Stripe portal with verified staging evidence.",
          deliverables: ["Preview URL", "Stripe test checkout proof"],
          acceptance_criteria: ["Buyer can complete a Stripe test checkout."],
        },
      },
    },
  });

  try {
    await signInAs(page, facilitatorEmail);

    await page.goto("/insights");
    await expect(page.getByText("Marketplace Signals")).toBeVisible();
    await expect(page.getByText("New projects listed")).toBeVisible();
    await expect(page.getByText("Profile views")).toBeVisible();
    await expect(page.getByText("Opportunity Radar")).toBeVisible();
    await expect(page.getByText("Insights Fit Portal")).toBeVisible();
    await expect(page.getByText(/fit/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /active milestones/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /pending invites/i })).toBeVisible();
    await expect(page.getByText("Trust Readiness")).toBeVisible();
    await expect(page.getByRole("link", { name: /identity verification ready/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /stripe payouts ready/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /portfolio evidence pending/i })).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
