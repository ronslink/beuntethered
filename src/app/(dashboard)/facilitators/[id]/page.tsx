import { Metadata } from "next";
import { prisma } from "@/lib/auth";
import FacilitatorProfileClient from "./FacilitatorProfileClient";
import { getCurrentUser } from "@/lib/session";
import { buyerProjectManagerListWhere } from "@/lib/project-access";
import { recordFacilitatorProfileView } from "@/lib/profile-views";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        name: true,
        platform_tier: true,
        total_sprints_completed: true,
        role: true,
      },
    });

    if (!user || user.role !== "FACILITATOR") {
      return {
        title: "Facilitator Not Found | beuntethered",
        description: "This facilitator profile doesn't exist.",
      };
    }

    const name = user.name || "Unnamed Facilitator";

    return {
      title: `${name} — Expert Project Facilitator | beuntethered`,
      description: `Hire ${name}, a ${user.platform_tier} tier facilitator with ${user.total_sprints_completed} completed sprints.`,
    };
  } catch {
    return {
      title: "Facilitator | beuntethered",
      description: "View facilitator profile on beuntethered.",
    };
  }
}

export default async function FacilitatorProfilePage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  let facilitatorData: any = null;
  let openProjects: { id: string; title: string }[] = [];
  let inviteStatus: "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        platform_tier: true,
        trust_score: true,
        total_sprints_completed: true,
        average_ai_audit_score: true,
        hourly_rate: true,
        preferred_llm: true,
        emailVerified: true,
        bio: true,
        skills: true,
        ai_agent_stack: true,
        portfolio_url: true,
        availability: true,
        years_experience: true,
        preferred_project_size: true,
        verifications: {
          select: {
            type: true,
            status: true,
          },
        },
        _count: {
          select: {
            facilitator_disputes: true,
            bids: true,
          },
        },
      },
    });

    if (user && user.role === "FACILITATOR") {
      facilitatorData = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        platform_tier: user.platform_tier,
        trust_score: user.trust_score,
        total_sprints_completed: user.total_sprints_completed,
        average_ai_audit_score: user.average_ai_audit_score,
        hourly_rate: user.hourly_rate ? Number(user.hourly_rate) : 0,
        preferred_llm: user.preferred_llm,
        emailVerified: user.emailVerified?.toISOString() ?? null,
        bio: user.bio,
        skills: user.skills,
        ai_agent_stack: user.ai_agent_stack,
        portfolio_url: user.portfolio_url,
        availability: user.availability,
        years_experience: user.years_experience,
        preferred_project_size: user.preferred_project_size,
        verifications: user.verifications,
        dispute_count: user._count.facilitator_disputes,
        bid_count: user._count.bids,
      };

      await recordFacilitatorProfileView({
        facilitatorId: user.id,
        viewerId: currentUser?.id,
        viewerRole: currentUser?.role ?? null,
      }).catch((error) => {
        console.error("Failed to record facilitator profile view:", error);
      });
    }

    if (currentUser?.role === "CLIENT") {
      openProjects = await prisma.project.findMany({
        where: {
          AND: [
            buyerProjectManagerListWhere(currentUser.id),
            { status: "OPEN_BIDDING" },
          ],
        },
        select: { id: true, title: true },
        orderBy: { created_at: "desc" },
      });
      if (openProjects.length > 0) {
        const invite = await prisma.projectInvite.findFirst({
          where: {
            project_id: { in: openProjects.map((project) => project.id) },
            facilitator_id: id,
          },
          select: { status: true },
          orderBy: { created_at: "desc" },
        });
        inviteStatus = invite?.status ?? null;
      }
    }
  } catch (error) {
    console.error("Failed to fetch facilitator:", error);
  }

  return (
    <FacilitatorProfileClient
      facilitator={facilitatorData}
      canInvite={currentUser?.role === "CLIENT"}
      openProjects={openProjects}
      inviteStatus={inviteStatus}
    />
  );
}
