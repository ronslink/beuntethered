import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, seedUser } from "./support/db";

test("client sees enterprise project intake workflow", async ({ page }) => {
  const prefix = `playwright-intake-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;

  await cleanupByEmailPrefix("playwright-intake-");
  await seedUser({ email: clientEmail, role: "CLIENT", name: "Intake Buyer" });

  try {
    await signInAs(page, clientEmail);

    await page.goto("/projects/new");
    await expect(page.getByRole("heading", { name: /create verified project scope/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /full delivery scope/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /\$1k discovery sprint/i })).toBeVisible();
    await expect(page.getByPlaceholder(/manual business process/i)).toBeVisible();
    await expect(page.getByText(/milestone-based sow/i)).toBeVisible();
    await expect(page.getByText(/meaningful/i)).toBeVisible();
    await expect(page.getByText("Verifiable", { exact: true })).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
