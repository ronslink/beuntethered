import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const facilitators = [
  {
    email: "avery.chen@untether.local",
    name: "Priya Shah",
    platform_tier: "ELITE" as const,
    hourly_rate: "145",
    trust_score: 94,
    total_sprints_completed: 38,
    average_ai_audit_score: 96,
    availability: "AVAILABLE",
    portfolio_url: "https://github.com/priya-shah",
    skills: ["Next.js", "Stripe", "Postgres", "AI workflow design", "Audit automation"],
    ai_agent_stack: ["Cursor", "Claude Code", "OpenAI", "Playwright"],
    bio: "Full-stack delivery facilitator focused on payment-safe SaaS builds, audit-backed releases, and production readiness for SMB software teams.",
    stripe_account_id: "acct_review_priya_connected",
  },
  {
    email: "maya.patel@untether.local",
    name: "Maya Patel",
    platform_tier: "ELITE" as const,
    hourly_rate: "165",
    trust_score: 91,
    total_sprints_completed: 44,
    average_ai_audit_score: 93,
    availability: "SOON",
    portfolio_url: "https://github.com/maya-patel",
    skills: ["Enterprise UX", "React", "Design systems", "Accessibility", "SaaS dashboards"],
    ai_agent_stack: ["Figma", "OpenAI", "Playwright", "Storybook"],
    bio: "Enterprise product facilitator specializing in operational SaaS UX, dense dashboards, accessibility passes, and buyer-ready design systems.",
    stripe_account_id: "acct_review_maya_connected",
  },
  {
    email: "noah.rivera@untether.local",
    name: "Noah Rivera",
    platform_tier: "PRO" as const,
    hourly_rate: "125",
    trust_score: 87,
    total_sprints_completed: 29,
    average_ai_audit_score: 90,
    availability: "AVAILABLE",
    portfolio_url: "https://github.com/noah-rivera",
    skills: ["Prisma", "API design", "Auth", "Webhooks", "Observability"],
    ai_agent_stack: ["Codex", "OpenAI", "Datadog", "Postman"],
    bio: "Backend-heavy facilitator for transaction systems, webhooks, data modeling, and secure workflow instrumentation.",
    stripe_account_id: "acct_review_noah_connected",
  },
  {
    email: "elena.moroz@untether.local",
    name: "Elena Moroz",
    platform_tier: "PRO" as const,
    hourly_rate: "118",
    trust_score: 83,
    total_sprints_completed: 21,
    average_ai_audit_score: 88,
    availability: "LIMITED",
    portfolio_url: "https://github.com/elena-moroz",
    skills: ["Data products", "Vector search", "Python", "LLM evaluation", "Dashboards"],
    ai_agent_stack: ["OpenAI", "LangSmith", "Python", "Playwright"],
    bio: "AI data product facilitator with a focus on matching quality, evaluation traces, and measurable delivery reports.",
    stripe_account_id: "acct_review_elena_connected",
  },
  {
    email: "sam.okafor@untether.local",
    name: "Sam Okafor",
    platform_tier: "STANDARD" as const,
    hourly_rate: "95",
    trust_score: 76,
    total_sprints_completed: 14,
    average_ai_audit_score: 84,
    availability: "AVAILABLE",
    portfolio_url: "https://github.com/sam-okafor",
    skills: ["MVP builds", "Next.js", "Supabase", "QA automation", "Deployment"],
    ai_agent_stack: ["Cursor", "OpenAI", "Vercel", "Playwright"],
    bio: "Pragmatic MVP facilitator for scoped builds, launch checklists, automated smoke tests, and Vercel deployment flows.",
    stripe_account_id: null,
  },
];

async function upsertFacilitators() {
  for (const profile of facilitators) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name,
        role: "FACILITATOR",
        onboarding_complete: true,
        platform_tier: profile.platform_tier,
        hourly_rate: profile.hourly_rate,
        trust_score: profile.trust_score,
        total_sprints_completed: profile.total_sprints_completed,
        average_ai_audit_score: profile.average_ai_audit_score,
        availability: profile.availability,
        portfolio_url: profile.portfolio_url,
        skills: profile.skills,
        ai_agent_stack: profile.ai_agent_stack,
        bio: profile.bio,
        stripe_account_id: profile.stripe_account_id,
      },
      create: {
        email: profile.email,
        name: profile.name,
        role: "FACILITATOR",
        onboarding_complete: true,
        platform_tier: profile.platform_tier,
        hourly_rate: profile.hourly_rate,
        trust_score: profile.trust_score,
        total_sprints_completed: profile.total_sprints_completed,
        average_ai_audit_score: profile.average_ai_audit_score,
        availability: profile.availability,
        portfolio_url: profile.portfolio_url,
        skills: profile.skills,
        ai_agent_stack: profile.ai_agent_stack,
        bio: profile.bio,
        stripe_account_id: profile.stripe_account_id,
      },
    });

    await prisma.verification.upsert({
      where: { user_id_type: { user_id: user.id, type: "IDENTITY" } },
      update: { status: "VERIFIED", provider: "review-seed", reviewed_at: new Date() },
      create: {
        user_id: user.id,
        type: "IDENTITY",
        status: "VERIFIED",
        provider: "review-seed",
        reviewed_at: new Date(),
      },
    });

    await prisma.verification.upsert({
      where: { user_id_type: { user_id: user.id, type: "PORTFOLIO" } },
      update: { status: "VERIFIED", provider: "review-seed", reviewed_at: new Date() },
      create: {
        user_id: user.id,
        type: "PORTFOLIO",
        status: "VERIFIED",
        provider: "review-seed",
        reviewed_at: new Date(),
      },
    });

    if (profile.stripe_account_id) {
      await prisma.verification.upsert({
        where: { user_id_type: { user_id: user.id, type: "STRIPE" } },
        update: { status: "VERIFIED", provider: "stripe-test", reviewed_at: new Date() },
        create: {
          user_id: user.id,
          type: "STRIPE",
          status: "VERIFIED",
          provider: "stripe-test",
          reviewed_at: new Date(),
        },
      });
    }
  }
}

async function ensureReviewProject() {
  const client = await prisma.user.findUnique({ where: { email: "ronslink@gmail.com" } });
  if (!client) return;

  const existing = await prisma.project.findFirst({
    where: { client_id: client.id, title: "Enterprise Marketplace Trust Review" },
    select: { id: true },
  });

  if (existing) return;

  await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Enterprise Marketplace Trust Review",
      status: "OPEN_BIDDING",
      ai_generated_sow:
        "Review and improve the Untether marketplace buyer journey with an emphasis on facilitator search, invite-to-bid, trust signals, and audit-backed milestone review.",
      bidding_closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

async function main() {
  await upsertFacilitators();
  await ensureReviewProject();
  console.log("Review talent data is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
