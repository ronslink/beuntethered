import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("facilitator proposal advisor maps live SOWs into bid guidance", async ({ page }) => {
  const prefix = `playwright-proposal-advisor-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-proposal-advisor-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Advisor Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Advisor Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Verified Stripe Portal",
      ai_generated_sow:
        "Build a Next.js buyer portal with Stripe checkout, authenticated dashboards, and audit-ready delivery evidence.",
      status: "OPEN_BIDDING",
      milestones: {
        create: [
          {
            title: "Checkout and account foundation",
            amount: 1800,
            estimated_duration_days: 5,
            description: "Implement auth, account workspace, and Stripe checkout test flow.",
            deliverables: ["GitHub branch", "Live preview URL", "Stripe test checkout proof"],
            acceptance_criteria: ["Buyer can complete Stripe test payment", "Auth permissions are verified"],
          },
          {
            title: "Dashboard evidence pack",
            amount: 2200,
            estimated_duration_days: 6,
            description: "Deliver dashboard screens with milestone evidence and acceptance checklist.",
            deliverables: ["Live demo link", "QA notes"],
            acceptance_criteria: ["Acceptance checklist is mapped to each deliverable"],
          },
        ],
      },
    },
  });

  await prisma.projectInvite.create({
    data: {
      project_id: project.id,
      inviter_id: client.id,
      facilitator_id: facilitator.id,
      status: "SENT",
      message: "Please propose a verifiable milestone plan.",
    },
  });

  try {
    await signInAs(page, facilitatorEmail);
    await page.goto("/advisor");

    await expect(page.getByRole("heading", { name: /proposal advisor/i })).toBeVisible();
    await expect(page.getByText("Verified Stripe Portal")).toBeVisible();
    await expect(page.getByText("Marketplace award readiness is incomplete")).toBeVisible();
    await expect(page.getByRole("link", { name: /finish verification/i })).toHaveAttribute("href", "/settings");
    await expect(page.getByRole("heading", { name: "SOW-to-bid map" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Proof strategy" }).first()).toBeVisible();
    await expect(page.getByText("Live preview or demo URL").first()).toBeVisible();
    await expect(page.getByText("Payment test proof").first()).toBeVisible();
    await expect(page.locator(`a[href="/marketplace/project/${project.id}"]`)).toHaveAttribute(
      "href",
      `/marketplace/project/${project.id}`
    );

    await page.goto(`/marketplace/project/${project.id}`);
    await expect(page.getByText("Award readiness incomplete").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /finish verification/i }).first()).toHaveAttribute("href", "/settings");
    await page.getByRole("button", { name: /submit proposal/i }).click();
    await expect(page.getByText("Submit when ready, but complete verification before a buyer can award this proposal.")).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("project dossier shows submitted proposal state instead of duplicate submission CTA", async ({ page }) => {
  const prefix = `playwright-existing-proposal-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-existing-proposal-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Existing Proposal Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Existing Proposal Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Existing Proposal Portal",
      ai_generated_sow: "Build a verified portal with milestone evidence and buyer review.",
      status: "OPEN_BIDDING",
      milestones: {
        create: {
          title: "Portal delivery",
          amount: 3000,
          estimated_duration_days: 8,
          description: "Build and verify the portal delivery.",
          deliverables: ["Live preview URL"],
          acceptance_criteria: ["Buyer can review the live preview"],
        },
      },
      bids: {
        create: {
          developer_id: facilitator.id,
          proposed_amount: 2900,
          estimated_days: 7,
          technical_approach: "Ship the portal in one evidence-backed milestone with a reviewable preview.",
          ai_translation_summary: "Evidence-backed portal delivery.",
          status: "PENDING",
        },
      },
    },
  });

  try {
    await signInAs(page, facilitatorEmail);
    await page.goto(`/marketplace/project/${project.id}`);

    await expect(page.getByText("Existing Proposal Portal")).toBeVisible();
    await expect(page.getByText("Proposal already submitted")).toBeVisible();
    await expect(page.getByText("$2,900")).toBeVisible();
    await expect(page.getByText("Proposal submitted").last()).toBeVisible();
    await expect(page.getByRole("button", { name: /submit proposal/i })).toHaveCount(0);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
