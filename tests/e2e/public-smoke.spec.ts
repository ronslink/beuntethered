import { expect, test } from "@playwright/test";

test("public homepage presents verified delivery positioning", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /hire human-led software facilitators/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /post a project/i })).toBeVisible();
  await expect(page.getByText(/verified software delivery/i).first()).toBeVisible();
  await expect(page.getByText("Proof network")).toBeVisible();
  await expect(page.getByText("Netlify")).toBeVisible();
  await expect(page.getByText("Render")).toBeVisible();
  await expect(page.getByText("Cloudflare Pages")).toBeVisible();
});

test("pricing page shows clear fee model", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: /pay for verified milestones/i })).toBeVisible();
  await expect(page.getByText("8%").first()).toBeVisible();
  await expect(page.getByText("0% platform fee on facilitator earnings")).toBeVisible();
  await expect(page.getByText(/does not publish generic project prices/i)).toBeVisible();
});
