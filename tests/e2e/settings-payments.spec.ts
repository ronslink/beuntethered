import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, seedFacilitatorVerifications, seedUser } from "./support/db";

test("client sees settings payment readiness and fee model", async ({ page }) => {
  const prefix = `playwright-settings-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;

  await cleanupByEmailPrefix("playwright-settings-");
  await seedUser({ email: clientEmail, role: "CLIENT", name: "Settings Buyer" });

  try {
    await signInAs(page, clientEmail);

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i })).toBeVisible();
    await expect(page.getByText("Account trust center")).toBeVisible();
    await expect(page.getByText("Setup Action Queue")).toBeVisible();
    await expect(page.getByText("Payments & Payouts")).toBeVisible();
    await expect(page.getByText("Client Fee")).toBeVisible();
    await expect(page.getByText("8%")).toBeVisible();
    await expect(page.getByText("Facilitator Fee")).toBeVisible();
    await expect(page.getByText("0%", { exact: true })).toBeVisible();
    await expect(page.getByText("Created during first checkout", { exact: true })).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("facilitator sees award eligibility trust gates in settings", async ({ page }) => {
  const prefix = `playwright-settings-facilitator-${Date.now()}`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-settings-facilitator-");
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Settings Facilitator" });
  await seedFacilitatorVerifications({ userId: facilitator.id, includePortfolio: false });

  try {
    await signInAs(page, facilitatorEmail);

    await page.goto("/settings");
    await expect(page.getByText("Award Eligibility Checklist")).toBeVisible();
    await expect(page.getByText("These are the buyer-trust gates")).toBeVisible();
    const checklist = page.getByTestId("award-eligibility-checklist");
    await expect(checklist.getByRole("link", { name: /identity/i })).toBeVisible();
    await expect(checklist.getByRole("link", { name: /stripe payouts/i })).toBeVisible();
    await expect(checklist.getByRole("link", { name: /portfolio evidence/i })).toBeVisible();
    await expect(checklist.getByText("2/3")).toBeVisible();
    await expect(checklist.getByText("Add a credible portfolio URL")).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
