import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientInsights from "@/components/dashboard/insights/client/ClientInsights";
import FacilitatorInsights from "@/components/dashboard/insights/facilitator/FacilitatorInsights";

export default async function InsightsTrafficController() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  // ============================================================================
  // EXECUTIVE CLIENT ROI PIPELINE
  // ============================================================================
  if (user.role === "CLIENT") {
     const clientProjects = await prisma.project.findMany({
        where: { client_id: user.id },
        include: {
           milestones: { include: { time_entries: true } }
        }
     });

     let totalSpend = 0;
     let activeExposure = 0;
     let validAudits = 0;
     let totalAuditScore = 0;
     let sprintClears = 0;

     // Escrow Aggregation
     clientProjects.forEach(project => {
        // Calculate bounds dynamically matching exact Prisma limits
        const projMax = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
        totalSpend += projMax;

        if (project.status === "ACTIVE") {
           activeExposure += projMax;
        }

        // Deep Extract AI Vectors globally passing through Milestones
        project.milestones.forEach(m => {
           if (m.status === "APPROVED_AND_PAID") sprintClears++;

           m.time_entries.forEach(entry => {
              if (entry.ai_audit_report) {
                 const report = entry.ai_audit_report as any;
                 if (report && report.alignment_score) {
                    totalAuditScore += Number(report.alignment_score);
                    validAudits++;
                 }
              }
           });
        });
     });

     const avgQuality = validAudits > 0 ? (totalAuditScore / validAudits) : 0;

     return (
       <ClientInsights 
         totalSpend={totalSpend}
         activeExposure={activeExposure}
         avgCodeQuality={avgQuality}
         totalSprintClears={sprintClears}
       />
     );

  // ============================================================================
  // EXPERT FACILITATOR TELEMETRY FLOW
  // ============================================================================
  } else if (user.role === "FACILITATOR") {
     
     const expert = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
           milestones_as_facilitator: {
              where: { status: "APPROVED_AND_PAID" }
           },
           time_entries: {
              where: { status: "APPROVED" } // Using APPROVED time logs for hourly retainers
           }
        }
     });

     if (!expert) redirect("/dashboard");

     // Initialize 6-month array structure locking boundaries dynamically using native date loops
     const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
     const revenueMap: { [key: string]: number } = {};
     
     const d = new Date();
     for (let i = 5; i >= 0; i--) {
        const monthIndex = new Date(d.getFullYear(), d.getMonth() - i, 1).getMonth();
        revenueMap[monthNames[monthIndex]] = 0; // Initialize exact sequence locking bounds natively
     }

     // Mapping Historical Data dynamically
     expert.milestones_as_facilitator.forEach(m => {
        // Fallback or exact mapping natively
        const monthKey = monthNames[new Date().getMonth()]; // MVP simulation mapping current scale uniformly
        if (revenueMap[monthKey] !== undefined) revenueMap[monthKey] += Number(m.amount);
     });

     expert.time_entries.forEach(e => {
        const monthKey = monthNames[e.created_at.getMonth()];
        const calculatedRate = Number(e.hours) * Number(expert.hourly_rate); // Bounding hourly vectors safely
        if (revenueMap[monthKey] !== undefined) revenueMap[monthKey] += calculatedRate;
     });

     // Structure map correctly into Recharts format safely ensuring array limits
     const revenueData = Object.keys(revenueMap).map(k => ({
        name: k,
        revenue: revenueMap[k]
     }));

     return (
        <FacilitatorInsights 
           trustScore={expert.trust_score}
           totalSprints={expert.total_sprints_completed}
           avgAuditScore={expert.average_ai_audit_score}
           revenueData={revenueData}
        />
     );
  }

  // Fallback layout preserving Next router bounds
  return null;
}
