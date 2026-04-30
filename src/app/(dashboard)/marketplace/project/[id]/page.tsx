import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import DossierClient from "@/components/dashboard/marketplace/DossierClient";
import { computeOpportunityFit, inferOpportunityTerms } from "@/lib/opportunity-fit";
import { getFacilitatorAwardReadiness } from "@/lib/bid-award-rules";

export default async function ProjectDossierPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      milestones: true,
      client: true,
      organization: { select: { name: true, type: true, website: true } },
      invites: { where: { facilitator_id: user.id }, select: { id: true, status: true } },
      bids: {
        where: { developer_id: user.id },
        select: {
          id: true,
          status: true,
          proposed_amount: true,
          estimated_days: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 1,
      },
      _count: { select: { bids: true } },
    }
  });

  if (!project || project.status !== "OPEN_BIDDING") notFound();

  // Increment metrics asynchronously so listing views do not block page render.
  prisma.project.update({
    where: { id: project.id },
    data: { views: { increment: 1 } }
  }).catch(e => console.error("Metrics sync failed:", e));

  const totalValue = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
  const clientId = project.client_id ?? project.creator_id;
  const facilitatorProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      skills: true,
      ai_agent_stack: true,
      trust_score: true,
      average_ai_audit_score: true,
      total_sprints_completed: true,
      platform_tier: true,
      availability: true,
      portfolio_url: true,
      stripe_account_id: true,
      verifications: { select: { type: true, status: true } },
    },
  });

  const [paymentSpend, paidMilestoneSpend, projectCount, reviewStats] = await Promise.all([
    prisma.paymentRecord.aggregate({
      where: {
        client_id: clientId,
        kind: "ESCROW_RELEASE",
        status: "SUCCEEDED",
      },
      _sum: { gross_amount_cents: true },
    }),
    prisma.milestone.aggregate({
      where: {
        status: "APPROVED_AND_PAID",
        project: { client_id: clientId },
      },
      _sum: { amount: true },
    }),
    prisma.project.count({
      where: {
        OR: [
          { client_id: clientId },
          { creator_id: clientId },
        ],
      },
    }),
    prisma.review.aggregate({
      where: { client_id: clientId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const opportunityFit = computeOpportunityFit(project, facilitatorProfile);
  const awardReadiness = getFacilitatorAwardReadiness(facilitatorProfile);
  const inferredTags = Array.from(inferOpportunityTerms(project))
    .filter((term) => !["with", "and", "for", "the"].includes(term))
    .slice(0, 8)
    .map((term) => term.replace(/\b\w/g, (letter) => letter.toUpperCase()));
  const fallbackSpend = Number(paidMilestoneSpend._sum.amount ?? 0);
  const clientTrust = {
    totalSpend: Math.round((paymentSpend._sum.gross_amount_cents ?? 0) / 100) || fallbackSpend,
    avgRating: reviewStats._avg.rating,
    reviewCount: reviewStats._count.rating,
    projectCount,
  };

  // Serialize Decimal fields for client component
  const serializedProject = {
    ...project,
    milestones: undefined,
    client: undefined,
    bids: undefined,
    invites: undefined,
  };

  const serializedMilestones = project.milestones.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    acceptance_criteria: m.acceptance_criteria,
    deliverables: m.deliverables,
    estimated_duration_days: m.estimated_duration_days,
    amount: Number(m.amount),
    status: m.status,
  }));

  return (
    <DossierClient
      project={serializedProject}
      milestones={serializedMilestones}
      matchScore={opportunityFit.score}
      matchReasons={opportunityFit.reasons}
      technologyTags={inferredTags}
      totalValue={totalValue}
      clientTrust={clientTrust}
      awardReadiness={awardReadiness.ok ? { ok: true } : { ok: false, code: awardReadiness.code, message: awardReadiness.error }}
      invite={project.invites[0] ? { id: project.invites[0].id, status: project.invites[0].status } : null}
      existingProposal={project.bids[0] ? {
        id: project.bids[0].id,
        status: project.bids[0].status,
        proposedAmount: Number(project.bids[0].proposed_amount),
        estimatedDays: project.bids[0].estimated_days,
        createdAt: project.bids[0].created_at.toISOString(),
      } : null}
    />
  );
}
