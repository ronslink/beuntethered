import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("facilitator marketplace highlights proof capability fit", async ({ page }) => {
  const prefix = `playwright-marketplace-proof-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const projectTitle = `${prefix} verified launch`;

  await cleanupByEmailPrefix("playwright-marketplace-proof-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Proof Fit Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Proof Fit Facilitator" });

  await prisma.user.update({
    where: { id: facilitator.id },
    data: {
      proof_capabilities: ["VERCEL", "SUPABASE", "DOMAIN"],
      skills: ["Next.js", "TypeScript", "PostgreSQL"],
      ai_agent_stack: ["Cursor", "OpenAI API"],
      trust_score: 72,
    },
  });

  await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: projectTitle,
      ai_generated_sow:
        "Build a Next.js operations dashboard with a Vercel preview, Supabase migration evidence, and DNS launch proof.",
      status: "OPEN_BIDDING",
      milestones: {
        create: [
          {
            title: "Verified dashboard release",
            description: "Working dashboard deployment with database migration and domain readiness evidence.",
            amount: 4200,
            estimated_duration_days: 14,
            deliverables: ["Vercel preview URL", "Supabase migration log", "DNS launch checklist"],
            acceptance_criteria: ["Buyer can review the live dashboard and evidence before funding release"],
          },
        ],
      },
    },
  });

  try {
    await signInAs(page, facilitatorEmail);

    await page.goto(`/marketplace?search=${encodeURIComponent(projectTitle)}`);
    await expect(page.getByRole("heading", { name: /marketplace deal feed/i })).toBeVisible();

    const row = page.getByRole("button").filter({ hasText: projectTitle }).first();
    await expect(row).toBeVisible();
    await expect(row.getByText("Proof fit", { exact: true })).toBeVisible();
    await expect(row.getByText("Vercel", { exact: true })).toBeVisible();
    await expect(row.getByText("Supabase", { exact: true })).toBeVisible();
    await expect(row.getByText("Domain", { exact: true })).toBeVisible();
    await expect(page.getByText(/Proof fit: Vercel, Supabase, Domain/i)).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
