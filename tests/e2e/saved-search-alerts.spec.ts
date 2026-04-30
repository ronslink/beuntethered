import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("facilitator can save, apply, and tune marketplace alerts", async ({ page }) => {
  const prefix = `playwright-alerts-${Date.now()}`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const clientEmail = `${prefix}-client@example.com`;

  await cleanupByEmailPrefix("playwright-alerts-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Saved Alert Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Saved Alert Facilitator" });

  await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Saved Search Stripe Portal",
      ai_generated_sow: "Build a Stripe customer portal with verifiable milestone delivery.",
      status: "OPEN_BIDDING",
      milestones: {
        create: {
          title: "Stripe portal proof",
          amount: 6000,
          description: "Authenticated Stripe billing portal with verification evidence.",
          acceptance_criteria: ["Staging portal works", "Stripe test payment flow is documented"],
          deliverables: ["Staging URL", "Test evidence"],
          estimated_duration_days: 10,
        },
      },
    },
  });

  try {
    await signInAs(page, facilitatorEmail);

    await page.goto("/marketplace");
    await page.getByPlaceholder(/search by title/i).fill("Stripe");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/search=Stripe/);
    await page.getByRole("button", { name: /save alert/i }).click();
    await expect(page.getByText(/saved with daily alerts/i)).toBeVisible();
    await expect(page.getByText("Saved Alerts")).toBeVisible();

    await page.getByLabel(/alert frequency/i).selectOption("WEEKLY");
    await expect
      .poll(async () => prisma.savedSearch.findFirst({
        where: { user_id: facilitator.id },
        select: { alert_frequency: true },
      }))
      .toEqual({ alert_frequency: "WEEKLY" });

    await page.getByRole("button", { name: /clear/i }).click();
    await expect(page).toHaveURL(/\/marketplace$/);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/search=Stripe/);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
