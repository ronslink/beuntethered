import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedFacilitatorVerifications, seedUser } from "./support/db";

test("client sees proof readiness on talent search cards", async ({ page }) => {
  const prefix = `playwright-talent-proof-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-talent-proof-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Talent Proof Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Evidence Ready Facilitator" });

  await prisma.user.update({
    where: { id: facilitator.id },
    data: {
      total_sprints_completed: 6,
      average_ai_audit_score: 94,
    },
  });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Talent Proof Project",
      ai_generated_sow: "Build an audit-backed web application with deploy evidence.",
      status: "OPEN_BIDDING",
    },
  });

  await prisma.projectEvidenceSource.create({
    data: {
      project_id: project.id,
      created_by_id: facilitator.id,
      type: "VERCEL",
      label: "Production preview",
      url: "https://example.vercel.app",
      status: "CONNECTED",
      metadata: {
        verification_note: "Maps to milestone delivery and proves the working preview.",
      },
    },
  });

  await seedFacilitatorVerifications({ userId: facilitator.id });

  try {
    await signInAs(page, client.email);

    await page.goto("/talent");
    await expect(page.getByRole("heading", { name: /browse talent/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /evidence ready facilitator/i })).toBeVisible();
    const card = page.locator("article").filter({ hasText: "Evidence Ready Facilitator" }).first();
    await expect(card.getByText("Enterprise ready", { exact: true })).toBeVisible();
    await expect(card.getByText("Evidence tools", { exact: true })).toBeVisible();
    await expect(card.getByText("Vercel", { exact: true })).toBeVisible();
    await expect(page.getByText("Proof ready", { exact: true })).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
