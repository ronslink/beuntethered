import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, seedUser } from "./support/db";

test.describe("role access guards", () => {
  test("non-admin buyers cannot access platform admin or facilitator-only pages", async ({ page }) => {
    const prefix = `playwright-role-guards-${Date.now()}`;
    const buyerEmail = `${prefix}-buyer@example.com`;

    await cleanupByEmailPrefix("playwright-role-guards-");
    await seedUser({ email: buyerEmail, role: "CLIENT", name: "Buyer Guard Check" });

    try {
      await signInAs(page, buyerEmail);
      await page.goto("/admin/verifications");

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("heading", { name: /good to see you/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /verification review/i })).toHaveCount(0);

      await page.goto("/advisor");
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("heading", { name: /proposal advisor/i })).toHaveCount(0);
    } finally {
      await cleanupByEmailPrefix(prefix);
    }
  });

  test("facilitators can access advisor", async ({ page }) => {
    const prefix = `playwright-role-guards-${Date.now()}`;
    const facilitatorEmail = `${prefix}-facilitator@example.com`;

    await cleanupByEmailPrefix("playwright-role-guards-");
    await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Facilitator Advisor Guard" });

    try {
      await signInAs(page, facilitatorEmail);
      await page.goto("/advisor");
      await expect(page.getByRole("heading", { name: /proposal advisor/i })).toBeVisible();
    } finally {
      await cleanupByEmailPrefix(prefix);
    }
  });
});
