import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, seedUser } from "./support/db";

test("dashboard explains BYOC private invite claim errors", async ({ page }) => {
  const prefix = `playwright-byoc-claim-error-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;

  await cleanupByEmailPrefix("playwright-byoc-claim-error-");
  await seedUser({
    email: clientEmail,
    role: "CLIENT",
    name: "Claim Error Client",
  });

  try {
    await signInAs(page, clientEmail);

    await page.goto("/dashboard?invite_error=wrong_client_email");

    await expect(page.getByText("Invite email mismatch")).toBeVisible();
    await expect(page.getByText("locked to the client email")).toBeVisible();
    await expect(page.getByRole("link", { name: /review account/i })).toHaveAttribute("href", "/settings");
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
