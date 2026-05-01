import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("client wallet forecasts escrow funding totals before checkout", async ({ page }) => {
  const prefix = `playwright-wallet-forecast-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;

  await cleanupByEmailPrefix("playwright-wallet-forecast-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Wallet Forecast Buyer" });

  await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Marketplace Wallet Forecast",
      ai_generated_sow: "Build a verified dashboard funded through marketplace escrow.",
      status: "ACTIVE",
      milestones: {
        create: {
          title: "Marketplace pending milestone",
          amount: 1000,
          status: "PENDING",
          description: "Fund marketplace escrow before delivery.",
          deliverables: ["Preview URL"],
          acceptance_criteria: ["Buyer can review preview"],
        },
      },
    },
  });

  await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "BYOC Wallet Forecast",
      ai_generated_sow: "Govern a private client packet through BYOC escrow.",
      is_byoc: true,
      status: "ACTIVE",
      milestones: {
        create: {
          title: "BYOC pending milestone",
          amount: 2000,
          status: "PENDING",
          description: "Fund BYOC escrow before delivery.",
          deliverables: ["Evidence package"],
          acceptance_criteria: ["Buyer can review evidence"],
        },
      },
    },
  });

  try {
    await signInAs(page, clientEmail);
    await page.goto("/wallet");

    await expect(page.getByRole("heading", { name: /^payments$/i })).toBeVisible();
    const fundingForecast = page.getByTestId("funding-forecast-panel");
    await expect(fundingForecast.getByText("Funding Forecast")).toBeVisible();
    await expect(fundingForecast.getByText("Mixed 8% marketplace / 5% BYOC fee model")).toBeVisible();
    await expect(fundingForecast.getByText("1 marketplace / 1 BYOC")).toBeVisible();
    await expect(fundingForecast.getByText("$3,000")).toBeVisible();
    await expect(fundingForecast.getByText("$180")).toBeVisible();
    await expect(fundingForecast.getByText("$3,180")).toBeVisible();
    await expect(page.getByText("Total due $1,080 incl. $80 client fee")).toBeVisible();
    await expect(page.getByText("Total due $2,100 incl. $100 client fee")).toBeVisible();

    await page.getByRole("link", { name: /fund milestone/i }).first().click();
    await expect(page).toHaveURL(/\/command-center\/.+\?tab=war-room#milestone-/);
    await expect(page.getByRole("link", { name: /milestones/i })).toHaveClass(/border-primary/);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
