import { expect, test } from "@playwright/test";
import bcrypt from "bcrypt";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("admin can review linked marketplace risk signals", async ({ page }) => {
  const prefix = `playwright-risk-review-${Date.now()}`;
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@untether.network";
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-risk-review-");
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, password_hash: true, onboarding_complete: true, tos_accepted_at: true },
  });
  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password_hash: await bcrypt.hash("Playwright123!", 12),
          onboarding_complete: true,
          tos_accepted_at: existingAdmin.tos_accepted_at ?? new Date(),
        },
      })
    : await seedUser({ email: adminEmail, role: "CLIENT", name: "Platform Admin" });
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Risk Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Risk Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Risk Review Vendor Portal",
      ai_generated_sow: "Build a vendor portal with Stripe checkout and audit-ready milestones.",
      status: "OPEN_BIDDING",
    },
  });
  const bid = await prisma.bid.create({
    data: {
      project_id: project.id,
      developer_id: facilitator.id,
      proposed_amount: 3200,
      estimated_days: 10,
      technical_approach: "Human-led implementation with AI-assisted milestone proof.",
      proposed_tech_stack: "Next.js, Stripe, Prisma",
      ai_translation_summary: "Audit-ready bid summary.",
      status: "PENDING",
    },
  });
  await prisma.accountRiskSignal.create({
    data: {
      event_type: "SELF_DEALING_REVIEW",
      severity: "REVIEW",
      user_id: facilitator.id,
      counterparty_id: client.id,
      project_id: project.id,
      bid_id: bid.id,
      hashed_ip: "hashed-ip-for-test",
      user_agent_hash: "hashed-agent-for-test",
      reason: "Bid submitted from the same hashed IP and browser family as the project posting.",
      metadata: {
        linked_signals: ["same_hashed_ip", "same_user_agent_hash"],
        invited: false,
      },
    },
  });

  try {
    await signInAs(page, admin.email);
    await page.goto("/admin/risk");

    await expect(page.getByRole("heading", { name: /trust risk review/i })).toBeVisible();
    await expect(page.getByText("Self-Dealing Review")).toHaveCount(2);
    await expect(page.getByText("Risk Review Vendor Portal")).toBeVisible();
    await expect(page.getByText("same hashed ip", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "policy Risk Review" })).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
    if (existingAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password_hash: existingAdmin.password_hash,
          onboarding_complete: existingAdmin.onboarding_complete,
          tos_accepted_at: existingAdmin.tos_accepted_at,
        },
      });
    } else {
      await prisma.user.deleteMany({ where: { id: admin.id } });
    }
  }
});

test("non-admin users are redirected away from risk review", async ({ page }) => {
  const prefix = `playwright-risk-review-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;

  await cleanupByEmailPrefix("playwright-risk-review-");
  await seedUser({ email: clientEmail, role: "CLIENT", name: "Risk Review Buyer" });

  try {
    await signInAs(page, clientEmail);
    await page.goto("/admin/risk");

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /trust risk review/i })).toHaveCount(0);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
