import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientInsights from "@/components/dashboard/insights/client/ClientInsights";
import FacilitatorInsights from "@/components/dashboard/insights/facilitator/FacilitatorInsights";

export default async function InsightsTrafficController() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  if (user.role === "CLIENT") {
    const clientProjects = await prisma.project.findMany({
      where: { client_id: user.id },
      include: { milestones: true },
    });

    let totalSpend = 0;
    let activeExposure = 0;
    let sprintClears = 0;

    clientProjects.forEach(project => {
      const projMax = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
      totalSpend += projMax;
      if (project.status === "ACTIVE") activeExposure += projMax;
      project.milestones.forEach(m => {
        if (m.status === "APPROVED_AND_PAID") sprintClears++;
      });
    });

    return (
      <ClientInsights
        totalSpend={totalSpend}
        activeExposure={activeExposure}
        avgCodeQuality={98.4}
        totalSprintClears={sprintClears}
      />
    );
  }

  if (user.role === "FACILITATOR") {
    const expert = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        milestones: { where: { status: "APPROVED_AND_PAID" } },
      },
    });

    if (!expert) redirect("/dashboard");

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const revenueMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const key = monthNames[new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth()];
      revenueMap[key] = 0;
    }

    expert.milestones.forEach(m => {
      const key = monthNames[new Date().getMonth()];
      if (revenueMap[key] !== undefined) revenueMap[key] += Number(m.amount);
    });

    const revenueData = Object.keys(revenueMap).map(k => ({ name: k, revenue: revenueMap[k] }));

    return (
      <FacilitatorInsights
        trustScore={expert.trust_score}
        totalSprints={expert.total_sprints_completed}
        avgAuditScore={expert.average_ai_audit_score}
        revenueData={revenueData}
      />
    );
  }

  return null;
}
