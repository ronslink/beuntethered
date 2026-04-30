import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("client dashboard shows durable project activity", async ({ page }) => {
  const prefix = `playwright-dashboard-activity-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;

  await cleanupByEmailPrefix("playwright-dashboard-activity-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Dashboard Buyer" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Dashboard Activity Project",
      ai_generated_sow: "Build an audit-visible customer portal with milestone delivery.",
      status: "OPEN_BIDDING",
    },
  });

  await prisma.activityLog.create({
    data: {
      project_id: project.id,
      actor_id: client.id,
      action: "SYSTEM_EVENT",
      entity_type: "PROJECT",
      entity_id: project.id,
      metadata: {
        operation: "SOW_UPDATED",
        actor_project_role: "OWNER",
        actor_scope: "PROJECT_OWNER",
        workspace_admin_action: false,
      },
    },
  });

  try {
    await signInAs(page, clientEmail);

    await expect(page.getByText("Buyer Control Center")).toBeVisible();
    await expect(page.getByText("Proposal Decisions")).toBeVisible();
    await expect(page.getByRole("link", { name: /escrow funding/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /delivery review/i })).toBeVisible();
    await expect(page.getByText("Recent Trust Events")).toBeVisible();
    await expect(page.getByText("Scope updated")).toBeVisible();
    await expect(page.getByText("Dashboard Buyer - Project owner")).toBeVisible();
    await expect(page.getByText("Dashboard Activity Project").first()).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("facilitator dashboard shows invites and proposal pipeline before awarded work", async ({ page }) => {
  const prefix = `playwright-dashboard-facilitator-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-dashboard-facilitator-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Pipeline Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Pipeline Facilitator" });

  const invitedProject = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Invited Analytics Portal",
      ai_generated_sow: "Build a verified analytics portal with staged milestone evidence.",
      status: "OPEN_BIDDING",
    },
  });
  const proposalProject = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Submitted Ops Dashboard",
      ai_generated_sow: "Deliver an operations dashboard with verifiable preview links.",
      status: "OPEN_BIDDING",
    },
  });

  await prisma.projectInvite.create({
    data: {
      project_id: invitedProject.id,
      inviter_id: client.id,
      facilitator_id: facilitator.id,
      status: "SENT",
      message: "We would like your AI-assisted delivery approach.",
    },
  });
  await prisma.bid.create({
    data: {
      project_id: proposalProject.id,
      developer_id: facilitator.id,
      proposed_amount: 4200,
      estimated_days: 12,
      technical_approach: "Human-led implementation with AI-assisted scaffolding, staged proof, and buyer review checkpoints.",
      proposed_tech_stack: "Next.js, TypeScript, Stripe",
      ai_translation_summary: "Build the dashboard in verifiable milestones with audit-ready artifacts.",
      status: "PENDING",
    },
  });

  try {
    await page.context().clearCookies();
    await signInAs(page, facilitatorEmail);

    await expect(page.getByText("Facilitator Dashboard")).toBeVisible();
    await expect(page.getByText("Opportunity Pipeline")).toBeVisible();
    await expect(page.getByText("Client Invite")).toBeVisible();
    await expect(page.getByText("Invited Analytics Portal", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Submitted Ops Dashboard", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Invited opportunity", { exact: true })).toBeVisible();
    await expect(page.getByText("Proposal submitted", { exact: true })).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
