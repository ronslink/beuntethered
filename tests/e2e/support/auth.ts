import { expect, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { prisma } from "./db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3200";

export async function signInAs(page: Page, email: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem("cookie_consent", "true");
  });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, onboarding_complete: true } });
  if (!user) throw new Error(`Cannot sign in unknown seeded user: ${email}`);

  const maxAge = 60 * 60;
  const sessionToken = await encode({
    secret: process.env.NEXTAUTH_SECRET ?? "playwright-nextauth-secret",
    maxAge,
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      onboarding_complete: user.onboarding_complete,
    },
  });

  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + maxAge,
    },
  ]);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /good to see you/i })).toBeVisible();
}
