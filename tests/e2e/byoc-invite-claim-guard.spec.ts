import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("BYOC invite page blocks signed-in clients using the wrong invited email", async ({ page }) => {
  const prefix = `playwright-byoc-invite-guard-${Date.now()}`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const invitedClientEmail = `${prefix}-invited@example.com`;
  const wrongClientEmail = `${prefix}-wrong@example.com`;
  const inviteToken = `playwright-byoc-guard-${Date.now()}`;

  await cleanupByEmailPrefix("playwright-byoc-invite-guard-");
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "BYOC Guard Facilitator",
  });
  await seedUser({
    email: wrongClientEmail,
    role: "CLIENT",
    name: "Wrong Client",
  });

  await prisma.project.create({
    data: {
      creator_id: facilitator.id,
      title: "Private Analytics Console",
      ai_generated_sow:
        "Build a private analytics console with verifiable staging access, event evidence, and milestone acceptance checks.",
      is_byoc: true,
      invite_token: inviteToken,
      invited_client_email: invitedClientEmail,
      status: "DRAFT",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Analytics console delivery",
          amount: 3200,
          estimated_duration_days: 7,
          description: "Deliver the analytics console with staging evidence and buyer review checklist.",
          deliverables: ["Staging URL", "Repository branch", "Evidence checklist"],
          acceptance_criteria: ["Buyer can access staging", "Checklist maps each feature to evidence"],
        },
      },
    },
  });

  try {
    await signInAs(page, wrongClientEmail);
    await page.goto(`/invite/${inviteToken}`);

    await expect(page.getByRole("heading", { name: /review your verified delivery scope/i })).toBeVisible();
    await expect(page.getByText("Invite email mismatch")).toBeVisible();
    await expect(page.getByText("Private claim guard")).toBeVisible();
    await expect(page.getByRole("link", { name: /review account/i })).toHaveAttribute(
      "href",
      "/dashboard?invite_error=wrong_client_email"
    );
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
