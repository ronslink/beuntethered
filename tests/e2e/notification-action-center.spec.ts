import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("client notification bell separates action items from durable unread notices", async ({ page }) => {
  const prefix = `playwright-notifications-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-notifications-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Notification Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Notification Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Notification Center Project",
      ai_generated_sow: "Build a verified operations workflow with proposal review evidence.",
      status: "OPEN_BIDDING",
    },
  });

  await prisma.bid.create({
    data: {
      project_id: project.id,
      developer_id: facilitator.id,
      proposed_amount: 3200,
      estimated_days: 9,
      technical_approach: "Deliver a human-led implementation with AI-assisted verification evidence.",
      proposed_tech_stack: "Next.js, TypeScript, Stripe",
      ai_translation_summary: "Verified workflow delivery with proposal review evidence.",
      status: "PENDING",
    },
  });

  await prisma.notification.create({
    data: {
      user_id: client.id,
      message: "Workspace payment readiness updated",
      type: "ALERT",
      href: "/settings",
      metadata: { provider: "playwright" },
    },
  });

  try {
    await signInAs(page, clientEmail);

    await page.getByRole("button", { name: /notifications/i }).click();

    await expect(page.getByText("Action Center")).toBeVisible();
    await expect(page.locator("[aria-label='Needs action: 1']")).toBeVisible();
    await expect(page.locator("[aria-label='Unread: 1']")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Needs Action" })).toBeVisible();
    await expect(page.getByText('1 new proposal on "Notification Center Project"')).toBeVisible();
    await expect(page.getByText("Review, shortlist, negotiate, or award the proposal queue.")).toBeVisible();
    await expect(page.getByText("Recent Activity")).toBeVisible();
    await expect(page.getByText("Workspace payment readiness updated")).toBeVisible();

    await page.getByRole("button", { name: /mark all as read/i }).click();
    await expect(page.locator("[aria-label='Unread: 0']")).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
