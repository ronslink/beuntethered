import { Metadata } from "next";
import { prisma } from "@/lib/auth";
import TalentPageClient from "./TalentPageClient";
import { getCurrentUser } from "@/lib/session";
import { buyerProjectManagerListWhere } from "@/lib/project-access";

// SEO Metadata
export const metadata: Metadata = {
  title: "Hire Pre-vetted Project Facilitators | Untether",
  description:
    "Access a curated network of software facilitators who use AI-assisted workflows to deliver verifiable projects. Browse verified facilitators, compare trust scores, and hire with confidence.",
  keywords: [
    "hire software facilitators",
    "AI-assisted software delivery",
    "project facilitators",
    "pre-vetted facilitators",
  ],
  openGraph: {
    title: "Hire Pre-vetted Project Facilitators",
    description:
      "Curated network of human-led facilitators using AI-assisted workflows for verifiable software delivery.",
    type: "website",
  },
};

export type TalentProfile = {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  skills: string[];
  hourly_rate: number;
  trust_score: number;
  total_sprints_completed: number;
  average_ai_audit_score: number;
  availability: string | null;
  platform_tier: string;
  portfolio_url: string | null;
  ai_agent_stack: string[];
  stripe_verified: boolean;
  identity_verified: boolean;
  profile_complete: boolean;
  dispute_count: number;
  invite_status: "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | null;
};

export default async function PublicTalentPage() {
  const user = await getCurrentUser();
  const facilitators = await prisma.user.findMany({
    where: { role: "FACILITATOR", onboarding_complete: true },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      skills: true,
      hourly_rate: true,
      trust_score: true,
      total_sprints_completed: true,
      average_ai_audit_score: true,
      availability: true,
      platform_tier: true,
      portfolio_url: true,
      ai_agent_stack: true,
      stripe_account_id: true,
      verifications: { select: { type: true, status: true } },
      facilitator_disputes: { select: { id: true } },
    },
    orderBy: { trust_score: "desc" },
  });

  const openProjects = user?.role === "CLIENT"
    ? await prisma.project.findMany({
        where: {
          AND: [
            buyerProjectManagerListWhere(user.id),
            { status: "OPEN_BIDDING" },
          ],
        },
        select: { id: true, title: true },
        orderBy: { created_at: "desc" },
      })
    : [];

  const inviteStatuses = user?.role === "CLIENT" && openProjects.length > 0
    ? await prisma.projectInvite.findMany({
        where: {
          project_id: { in: openProjects.map((project) => project.id) },
          facilitator_id: { in: facilitators.map((facilitator) => facilitator.id) },
        },
        select: {
          facilitator_id: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      })
    : [];
  const inviteStatusByFacilitator = new Map<string, TalentProfile["invite_status"]>();
  for (const invite of inviteStatuses) {
    if (!inviteStatusByFacilitator.has(invite.facilitator_id)) {
      inviteStatusByFacilitator.set(invite.facilitator_id, invite.status);
    }
  }

  // Serialize Decimal to number for the client
  const talent: TalentProfile[] = facilitators.map((f) => ({
    ...f,
    hourly_rate: Number(f.hourly_rate),
    stripe_verified: f.verifications.some((v) => v.type === "STRIPE" && v.status === "VERIFIED"),
    identity_verified: f.verifications.some((v) => v.type === "IDENTITY" && v.status === "VERIFIED"),
    profile_complete: Boolean(f.bio && f.skills.length > 0 && f.portfolio_url),
    dispute_count: f.facilitator_disputes.length,
    invite_status: inviteStatusByFacilitator.get(f.id) ?? null,
  }));

  return <TalentPageClient talent={talent} openProjects={openProjects} canInvite={user?.role === "CLIENT"} />;
}
