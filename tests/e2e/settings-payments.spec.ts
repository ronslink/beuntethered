import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, seedUser } from "./support/db";

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
