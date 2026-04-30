import { expect, test } from "@playwright/test";
import bcrypt from "bcrypt";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("admin can view launch readiness checks", async ({ page }) => {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@untether.network";
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

  try {
    await signInAs(page, admin.email);
    await page.goto("/admin/readiness");

    await expect(page.getByRole("heading", { name: /launch readiness/i })).toBeVisible();
    await expect(page.getByText(/configuration checks/i)).toBeVisible();
    await expect(page.getByText(/database/i).first()).toBeVisible();
    await expect(page.getByText(/stripe secret key/i)).toBeVisible();
    await expect(page.getByText(/trusted ai lane/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /readiness/i })).toBeVisible();
  } finally {
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

test("non-admin users are redirected away from launch readiness", async ({ page }) => {
  const prefix = `playwright-readiness-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;

  await cleanupByEmailPrefix("playwright-readiness-");
  await seedUser({ email: clientEmail, role: "CLIENT", name: "Readiness Buyer" });

  try {
    await signInAs(page, clientEmail);
    await page.goto("/admin/readiness");
    await page.waitForURL(/\/dashboard/, { timeout: 45_000 });

    await expect(page.getByRole("heading", { name: /good to see you/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /launch readiness/i })).toHaveCount(0);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
