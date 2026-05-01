import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("facilitator adds project delivery evidence source", async ({ page }) => {
  const prefix = `playwright-evidence-integrations-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-evidence-integrations-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Evidence Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Evidence Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Evidence Integration Project",
      ai_generated_sow: "Build a verified portal with deployment, repository, and handoff evidence.",
      status: "ACTIVE",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Portal deployment evidence",
          amount: 2500,
          description: "Deliver a working preview, source archive, and deployment evidence packet.",
          acceptance_criteria: ["Preview URL loads", "Deployment evidence is attached"],
          deliverables: ["Preview deployment", "Source archive", "Evidence packet"],
          estimated_duration_days: 7,
          status: "FUNDED_IN_ESCROW",
        },
      },
    },
  });

  try {
    await signInAs(page, facilitatorEmail);

    await page.goto(`/command-center/${project.id}?tab=integrations`);
    await expect(page.getByRole("heading", { name: /evidence & integrations/i })).toBeVisible();
    await expect(page.getByText("Delivery Evidence System")).toBeVisible();
    await expect(page.getByText("No evidence sources connected yet.")).toBeVisible();

    await page.getByLabel(/display name/i).fill("Vercel preview deployment");
    await page.getByLabel(/url or provider link/i).fill("https://evidence-preview.vercel.app");
    await page
      .getByLabel(/verification note/i)
      .fill("This preview maps to the portal deployment milestone and is ready for buyer review.");
    await page.getByRole("button", { name: /add source/i }).click();

    await expect(page.getByText("Evidence source added to the project packet.")).toBeVisible();
    await expect(page.getByText("Vercel preview deployment")).toBeVisible();
    await expect(page.getByText("https://evidence-preview.vercel.app")).toBeVisible();

    await expect
      .poll(async () =>
        prisma.projectEvidenceSource.findFirst({
          where: { project_id: project.id, type: "VERCEL" },
          select: { label: true, url: true, status: true },
        }),
      )
      .toEqual({
        label: "Vercel preview deployment",
        url: "https://evidence-preview.vercel.app",
        status: "PENDING_VERIFICATION",
      });
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
