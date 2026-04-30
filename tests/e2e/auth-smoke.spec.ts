import { expect, test } from "@playwright/test";

test("client can register and sign in with credentials", async ({ page }) => {
  const nonce = Date.now();
  const email = `playwright-client-${nonce}@example.com`;
  const password = "Playwright123!";

  await page.goto("/register?role=CLIENT");
  await page.getByLabel(/full name/i).fill("Playwright Client");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/login\?registered=true/);

  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await page.waitForURL(/\/(onboarding|dashboard)/);
  await expect(
    page
      .getByRole("heading", { name: /let's get you set up/i })
      .or(page.getByRole("heading", { name: /good to see you/i }))
  ).toBeVisible();
});
