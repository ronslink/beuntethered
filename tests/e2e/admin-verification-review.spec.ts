import { expect, test } from "@playwright/test";
import bcrypt from "bcrypt";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("admin can review manual verification queue", async ({ page }) => {
  const prefix = `playwright-admin-verification-${Date.now()}`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@untether.network";

  await cleanupByEmailPrefix("playwright-admin-verification-");
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
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "Manual Review Facilitator",
  });

  const verification = await prisma.verification.create({
    data: {
      user_id: facilitator.id,
      type: "PORTFOLIO",
      status: "PENDING",
      provider: "profile_evidence",
      evidence: {
        portfolio_url: "https://example.com/manual-review",
        has_bio: true,
        skills_count: 3,
      },
    },
  });

  try {
    await signInAs(page, admin.email);
    await page.goto("/admin/verifications");

    await expect(page.getByRole("heading", { name: /verification review/i })).toBeVisible();
    await expect(page.getByText(/manual review facilitator/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /^admin$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /verifications/i }).first()).toBeVisible();
    await expect(page.getByText(/portfolio verification/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /approve/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /reject/i }).first()).toBeVisible();

    await page.getByPlaceholder(/add a short reason/i).fill("Evidence is complete and reviewable.");
    await page.getByRole("button", { name: /approve/i }).first().click();
    await expect(page.getByRole("heading", { name: /no manual verification reviews pending/i })).toBeVisible();

    await expect
      .poll(async () => {
        const reviewed = await prisma.verification.findUnique({
          where: { id: verification.id },
          select: { status: true, provider: true, evidence: true, reviewed_at: true },
        });
        return {
          status: reviewed?.status,
          provider: reviewed?.provider,
          reviewed: Boolean(reviewed?.reviewed_at),
        };
      })
      .toEqual({
        status: "VERIFIED",
        provider: "manual_admin_review",
        reviewed: true,
      });

    await expect
      .poll(async () =>
        prisma.notification.count({
          where: {
            user_id: facilitator.id,
            message: { contains: "Portfolio verification is verified" },
            type: "SUCCESS",
          },
        }),
      )
      .toBe(1);
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
