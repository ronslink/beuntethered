import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientInsights from "@/components/dashboard/insights/client/ClientInsights";
import FacilitatorInsights from "@/components/dashboard/insights/facilitator/FacilitatorInsights";
import { buyerProjectListWhere } from "@/lib/project-access";
import { computeOpportunityFit } from "@/lib/opportunity-fit";
import { getProfileViewWindowStart } from "@/lib/profile-view-rules";

export default async function InsightsTrafficController() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  if (user.role === "CLIENT") {
    const clientProjects = await prisma.project.findMany({
      where: buyerProjectListWhere(user.id),
      include: {
        milestones: {
          include: {
            facilitator: true,
            audits: {
              orderBy: { created_at: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    let totalSpend = 0;
    let activeExposure = 0;
    let sprintClears = 0;
    let totalAuditScore = 0;
    let facilitatorCount = 0;
    let fundedMilestones = 0;
    let pendingMilestones = 0;
    let reviewMilestones = 0;
    let disputedMilestones = 0;
    let auditedMilestones = 0;
    let passingAudits = 0;
    let latestAuditScoreTotal = 0;
    const seenFacilitators = new Set<string>();

    clientProjects.forEach(project => {
      const projMax = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
      totalSpend += projMax;
      if (project.status === "ACTIVE") activeExposure += projMax;
      project.milestones.forEach(m => {
        if (m.status === "APPROVED_AND_PAID") sprintClears++;
        if (m.status === "FUNDED_IN_ESCROW") fundedMilestones++;
        if (m.status === "PENDING") pendingMilestones++;
        if (m.status === "SUBMITTED_FOR_REVIEW") reviewMilestones++;
        if (m.status === "DISPUTED" || project.status === "DISPUTED") disputedMilestones++;
        const latestAudit = m.audits[0];
        if (latestAudit) {
          auditedMilestones++;
          latestAuditScoreTotal += latestAudit.score;
          if (latestAudit.is_passing) passingAudits++;
        }
        if (m.facilitator_id && !seenFacilitators.has(m.facilitator_id) && m.facilitator) {
          seenFacilitators.add(m.facilitator_id);
          totalAuditScore += m.facilitator.average_ai_audit_score;
          facilitatorCount++;
        }
      });
    });

    const avgCodeQuality = facilitatorCount > 0 ? (totalAuditScore / facilitatorCount) : 0;
    const avgAuditScore = auditedMilestones > 0 ? latestAuditScoreTotal / auditedMilestones : avgCodeQuality;
    const auditPassRate = auditedMilestones > 0 ? Math.round((passingAudits / auditedMilestones) * 100) : 0;

    return (
      <ClientInsights
        totalSpend={totalSpend}
        activeExposure={activeExposure}
        totalSprintClears={sprintClears}
        projectCount={clientProjects.length}
        activeProjectCount={clientProjects.filter((project) => project.status === "ACTIVE").length}
        openProjectCount={clientProjects.filter((project) => project.status === "OPEN_BIDDING").length}
        fundedMilestones={fundedMilestones}
        pendingMilestones={pendingMilestones}
        reviewMilestones={reviewMilestones}
        disputedMilestones={disputedMilestones}
        facilitatorCount={seenFacilitators.size}
        auditedMilestones={auditedMilestones}
        auditPassRate={auditPassRate}
        durableAvgAuditScore={avgAuditScore}
      />
    );
  }

  if (user.role === "FACILITATOR") {
    const expert = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        milestones: { include: { audits: { orderBy: { created_at: "desc" }, take: 1 } } },
        received_project_invites: { where: { status: "SENT" } },
        bids: { where: { status: { in: ["PENDING", "SHORTLISTED", "UNDER_NEGOTIATION"] } } },
      },
    });
    const openDisputes = await prisma.dispute.findMany({
      where: { facilitator_id: user.id, status: "OPEN" },
      include: {
        project: { select: { id: true, title: true } },
        milestone: { select: { id: true, title: true, status: true } },
        client: { select: { name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    if (!expert) redirect("/dashboard");

    const profileViewSince = getProfileViewWindowStart();
    const [profileViews7d, profileViewsTotal, newOpenProjectCount, opportunityProjects] = await Promise.all([
      prisma.profileView.count({
        where: {
          facilitator_id: user.id,
          created_at: { gte: profileViewSince },
        },
      }),
      prisma.profileView.count({
        where: { facilitator_id: user.id },
      }),
      prisma.project.count({
        where: {
          status: "OPEN_BIDDING",
          created_at: { gte: profileViewSince },
        },
      }),
      prisma.project.findMany({
        where: {
          status: "OPEN_BIDDING",
          bids: { none: { developer_id: user.id } },
          invites: { none: { facilitator_id: user.id, status: { in: ["SENT", "VIEWED", "ACCEPTED"] } } },
        },
        include: {
          milestones: { orderBy: { id: "asc" } },
          invites: {
            where: { facilitator_id: user.id, status: { in: ["SENT", "VIEWED", "ACCEPTED"] } },
            select: { id: true, status: true },
          },
          _count: { select: { bids: true } },
        },
        orderBy: { created_at: "desc" },
        take: 8,
      }),
    ]);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const revenueMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const key = monthNames[new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth()];
      revenueMap[key] = 0;
    }

    expert.milestones.filter((m) => m.status === "APPROVED_AND_PAID").forEach(m => {
      const paidDate = m.paid_at ? new Date(m.paid_at) : new Date();
      const key = monthNames[paidDate.getMonth()];
      if (revenueMap[key] !== undefined) revenueMap[key] += Number(m.amount);
    });

    const revenueData = Object.keys(revenueMap).map(k => ({ name: k, revenue: revenueMap[k] }));
    const latestAudits = expert.milestones.flatMap((milestone) => milestone.audits);
    const durableAuditScore = latestAudits.length > 0
      ? latestAudits.reduce((sum, audit) => sum + audit.score, 0) / latestAudits.length
      : expert.average_ai_audit_score;
    const auditPassRate = latestAudits.length > 0
      ? Math.round((latestAudits.filter((audit) => audit.is_passing).length / latestAudits.length) * 100)
      : 0;
    const opportunityRadar = opportunityProjects
      .map((project) => {
        const totalValue = project.milestones.reduce((sum, milestone) => sum + Number(milestone.amount), 0);
        const opportunityFit = computeOpportunityFit(project, expert);
        return {
          id: project.id,
          title: project.title,
          totalValue,
          bidCount: project._count.bids,
          createdAt: project.created_at.toISOString(),
          fitScore: opportunityFit.score,
          fitReasons: opportunityFit.reasons.slice(0, 2),
          matchedTerms: opportunityFit.matchedTerms.slice(0, 4),
        };
      })
      .sort((a, b) => {
        if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 4);

    return (
      <FacilitatorInsights
        trustScore={expert.trust_score}
        totalSprints={expert.total_sprints_completed}
        revenueData={revenueData}
        activeMilestones={expert.milestones.filter((m) => m.status !== "APPROVED_AND_PAID").length}
        reviewMilestones={expert.milestones.filter((m) => m.status === "SUBMITTED_FOR_REVIEW").length}
        pendingInvites={expert.received_project_invites.length}
        activeBids={expert.bids.length}
        auditedMilestones={latestAudits.length}
        auditPassRate={auditPassRate}
        durableAuditScore={durableAuditScore}
        disputedMilestones={expert.milestones.filter((m) => m.status === "DISPUTED").length}
        profileViews7d={profileViews7d}
        profileViewsTotal={profileViewsTotal}
        newOpenProjectCount={newOpenProjectCount}
        opportunityRadar={opportunityRadar}
        disputeQueue={openDisputes.map((dispute) => ({
          id: dispute.id,
          projectId: dispute.project.id,
          projectTitle: dispute.project.title,
          milestoneTitle: dispute.milestone.title,
          milestoneStatus: dispute.milestone.status,
          clientName: dispute.client.name || dispute.client.email,
          reason: dispute.reason,
          createdAt: dispute.created_at.toISOString(),
        }))}
      />
    );
  }

  return null;
}
