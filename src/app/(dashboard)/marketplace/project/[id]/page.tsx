import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import DossierClient from "@/components/dashboard/marketplace/DossierClient";

// Deterministic hash for stable mock metrics
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default async function ProjectDossierPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      milestones: true,
      client: true
    }
  });

  if (!project || project.status !== "OPEN_BIDDING") notFound();

  const totalValue = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);

  // Deterministic mock match score (identical algorithm to marketplace feed)
  const matchScore = 85 + (stableHash(project.id + user.id) % 14);

  // ========================================================================
  // MOCKED CLIENT TRUST STATS
  // Using deterministic hashing to produce impressive demo numbers.
  // Tracked in mock_tracker.md — replace with real Prisma aggregates for prod.
  // ========================================================================
  const clientHash = stableHash(project.client_id || project.creator_id);
  const clientTrust = {
    totalSpend: 12000 + (clientHash % 88000),           // $12k - $100k range
    avgRating: 4.2 + ((clientHash % 8) / 10),           // 4.2 - 4.9 range
    projectCount: 3 + (clientHash % 12)                  // 3 - 14 range
  };

  // Serialize Decimal fields for client component
  const serializedProject = {
    ...project,
    milestones: undefined,
    client: undefined,
  };

  const serializedMilestones = project.milestones.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    acceptance_criteria: m.acceptance_criteria,
    estimated_duration_days: m.estimated_duration_days,
    amount: Number(m.amount),
    status: m.status,
  }));

  return (
    <DossierClient
      project={serializedProject}
      milestones={serializedMilestones}
      matchScore={matchScore}
      totalValue={totalValue}
      clientTrust={clientTrust}
    />
  );
}
