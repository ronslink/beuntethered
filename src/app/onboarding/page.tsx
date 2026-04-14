import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/auth";
import OnboardingWizard from "./_OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      onboarding_complete: true,
      role: true,
      name: true,
      email: true,
      stripe_account_id: true,
    },
  });

  if (!dbUser) redirect("/api/auth/signin");

  // Already done — go to dashboard
  if (dbUser.onboarding_complete) redirect("/dashboard");

  return (
    <OnboardingWizard
      role={dbUser.role}
      userName={dbUser.name ?? dbUser.email ?? ""}
      stripeConnected={!!dbUser.stripe_account_id}
    />
  );
}
