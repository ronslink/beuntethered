import { loadEnvConfig } from "@next/env";
import { PrismaClient, type VerificationStatus, type VerificationType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  allowExitOnIdle: true,
});

export const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

export async function seedUser({
  email,
  role,
  name,
}: {
  email: string;
  role: "CLIENT" | "FACILITATOR";
  name: string;
}) {
  return prisma.user.create({
    data: {
      email,
      name,
      role,
      password_hash: await bcrypt.hash("Playwright123!", 12),
      onboarding_complete: true,
      tos_accepted_at: new Date(),
      skills: role === "FACILITATOR" ? ["Next.js", "TypeScript", "Stripe"] : [],
      ai_agent_stack: role === "FACILITATOR" ? ["Cursor", "OpenAI API"] : [],
      portfolio_url: role === "FACILITATOR" ? "https://example.com/portfolio" : null,
      bio: role === "FACILITATOR" ? "Enterprise-grade software facilitator." : null,
      availability: role === "FACILITATOR" ? "AVAILABLE" : null,
      trust_score: role === "FACILITATOR" ? 91 : 0,
      average_ai_audit_score: role === "FACILITATOR" ? 94 : 0,
      hourly_rate: role === "FACILITATOR" ? 125 : 0,
    },
  });
}

export async function seedFacilitatorVerifications({
  userId,
  provider = "playwright",
  includePortfolio = true,
}: {
  userId: string;
  provider?: string;
  includePortfolio?: boolean;
}) {
  const data: { user_id: string; type: VerificationType; status: VerificationStatus; provider: string }[] = [
    { user_id: userId, type: "IDENTITY" as const, status: "VERIFIED" as const, provider },
    { user_id: userId, type: "STRIPE" as const, status: "VERIFIED" as const, provider },
  ];

  if (includePortfolio) {
    data.push({ user_id: userId, type: "PORTFOLIO" as const, status: "VERIFIED" as const, provider });
  }

  return prisma.verification.createMany({ data });
}

export async function cleanupByEmailPrefix(prefix: string) {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  if (users.length === 0) return;
  const ids = users.map((user) => user.id);
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { client_id: { in: ids } },
        { creator_id: { in: ids } },
      ],
    },
    select: { id: true },
  });
  const projectIds = projects.map((project) => project.id);

  if (projectIds.length > 0) {
    await prisma.activityLog.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.accountRiskSignal.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.paymentRecord.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.attachment.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.projectInvite.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.milestoneAudit.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.timelineEvent.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.message.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.bid.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.squadProposal.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.changeOrder.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.dispute.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.milestone.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }
  await prisma.savedSearch.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.accountRiskSignal.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.verification.deleteMany({ where: { user_id: { in: ids } } });
  const organizations = await prisma.organization.findMany({
    where: { owner_id: { in: ids } },
    select: { id: true },
  });
  const organizationIds = organizations.map((organization) => organization.id);
  await prisma.organizationMember.deleteMany({
    where: {
      OR: [
        { user_id: { in: ids } },
        ...(organizationIds.length > 0 ? [{ organization_id: { in: organizationIds } }] : []),
      ],
    },
  });
  if (organizationIds.length > 0) {
    await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
  }
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
