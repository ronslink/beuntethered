import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedFacilitatorVerifications, seedUser } from "./support/db";

test("client sees facilitator trust evidence profile", async ({ page }) => {
  const prefix = `playwright-profile-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-profile-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Profile Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Trust Evidence Facilitator" });

  await prisma.user.update({
    where: { id: facilitator.id },
    data: {
      bio: "Ships audit-backed software milestones for operations teams.",
      portfolio_url: "https://example.com/trust-evidence",
      years_experience: 8,
      preferred_project_size: "$10K-$50K",
      availability: "AVAILABLE",
    },
  });

  await seedFacilitatorVerifications({ userId: facilitator.id });

  try {
    await signInAs(page, client.email);

    await page.goto(`/facilitators/${facilitator.id}`);
    await expect(page.getByRole("heading", { name: /trust evidence facilitator/i })).toBeVisible();
    await expect(page.getByText(/verification evidence/i)).toBeVisible();
    await expect(page.getByText(/skills and ai tools/i)).toBeVisible();
    await expect(page.getByText(/commercial readiness/i)).toBeVisible();
    await expect(page.getByText("3/3")).toBeVisible();
    await expect(page.getByRole("link", { name: /post project/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /portfolio/i })).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("client sees active invite status on facilitator profile", async ({ page }) => {
  const prefix = `playwright-profile-invite-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-profile-invite-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Profile Invite Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Already Invited Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Profile Invite Project",
      ai_generated_sow: "Build a verification-backed internal tool with milestone evidence.",
      status: "OPEN_BIDDING",
    },
  });
  await prisma.projectInvite.create({
    data: {
      project_id: project.id,
      inviter_id: client.id,
      facilitator_id: facilitator.id,
      status: "VIEWED",
      viewed_at: new Date(),
    },
  });

  try {
    await signInAs(page, client.email);

    await page.goto(`/facilitators/${facilitator.id}`);
    await expect(page.getByRole("heading", { name: /already invited facilitator/i })).toBeVisible();
    await expect(page.getByText("Viewed")).toBeVisible();
    await expect(page.getByRole("button", { name: /invite to bid/i })).toHaveCount(0);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
