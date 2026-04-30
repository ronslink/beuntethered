import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("buyer insights show durable audit evidence metrics", async ({ page }) => {
  const prefix = `playwright-insights-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-insights-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Insights Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Insights Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Insights Audit Project",
      ai_generated_sow: "Build a verified reporting workflow with audit-backed milestone release.",
      status: "COMPLETED",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Verified reporting workflow",
          amount: 5000,
          description: "Reporting workflow with durable audit proof.",
          acceptance_criteria: ["Report renders", "Audit evidence is visible"],
          deliverables: ["Staging URL", "Audit report"],
          estimated_duration_days: 12,
          status: "APPROVED_AND_PAID",
          paid_at: new Date(),
        },
      },
    },
    include: { milestones: true },
  });

  await prisma.milestoneAudit.create({
    data: {
      milestone_id: project.milestones[0].id,
      project_id: project.id,
      requested_by_id: client.id,
      provider: "playwright",
      model: "insights-smoke",
      score: 92,
      is_passing: true,
      criteria_met: ["Report renders", "Audit evidence is visible"],
      criteria_missed: [],
      summary: "Audit evidence confirms the reporting workflow meets acceptance criteria.",
      raw_result: { confidence_score: 92, pass: true },
    },
  });

  try {
    await signInAs(page, clientEmail);

    await page.goto("/insights");
    await expect(page.getByText("Audit-Backed Delivery Evidence")).toBeVisible();
    await expect(page.getByText("1 audited")).toBeVisible();
    await expect(page.getByTestId("audit-pass-rate")).toContainText("Pass rate");
    await expect(page.getByTestId("audit-pass-rate")).toContainText("100%");
    await expect(page.getByTestId("audit-average-score")).toContainText("92%");
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
