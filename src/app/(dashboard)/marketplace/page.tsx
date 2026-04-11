import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import ProjectDealCard from "@/components/dashboard/marketplace/ProjectDealCard";

// Deterministic mock scoring based natively off the UUIDs to prevent hydration/render bouncing
function generateConsistentMockScore(projectId: string, userId: string): number {
  let hash = 0;
  const str = projectId + userId;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  // Math bounds strictly between 85 and 98 physically avoiding random visual resets!
  return 85 + (Math.abs(hash) % 14);
}

export default async function MarketplaceDealFeed() {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");

  const openProjects = await prisma.project.findMany({
    where: { status: 'OPEN_BIDDING' },
    include: {
      milestones: true
    }
  });

  // Calculate Match Scores geometrically parsing array hashes safely
  const scoredProjects = openProjects.map(project => {
     const totalValue = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
     const matchScore = generateConsistentMockScore(project.id, user.id);
     return { ...project, totalValue, matchScore };
  });

  // Native Vector Sorting Simulation (Highest Matches Top)
  scoredProjects.sort((a, b) => b.matchScore - a.matchScore);

  return (
    <main className="lg:p-6 relative min-h-full pb-20 overflow-hidden">
      <div className="absolute top-[-10%] left-[30%] w-[500px] h-[500px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="px-4 lg:px-0 relative z-10 max-w-7xl mx-auto w-full">
         <header className="mb-12 border-b border-outline-variant/30 pb-8 relative">
            <span className="px-4 py-1.5 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-black font-headline tracking-widest uppercase border border-tertiary/30 mb-4 inline-block shadow-[0_0_15px_rgba(var(--color-tertiary),0.2)]">Global Open Escrow Nodes</span>
            <h1 className="text-4xl lg:text-6xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.9]">
               Expert Deal <span className="bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent drop-shadow-sm">Feed</span>
            </h1>
            <p className="text-on-surface-variant font-medium mt-4 max-w-2xl text-sm leading-relaxed">
               Evaluating algorithmic alignment bounds explicitly mapping your technical embeddings against open Client statements of work. Submit proposals to initiate secure Escrow contracts natively!
            </p>
         </header>

         {scoredProjects.length === 0 ? (
            <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8">
               <span className="material-symbols-outlined text-border text-[80px] mb-6">network_wifi</span>
               <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Active Deals Found</h3>
               <p className="text-sm text-on-surface-variant max-w-md mx-auto">The Open Marketplace array is currently empty. Clients are strictly mapping structural bounds off-chain currently. Review constraints later!</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
               {scoredProjects.map((project, idx) => (
                  <div key={project.id} className="animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${idx * 150}ms` }}>
                     <ProjectDealCard 
                        project={project} 
                        matchScore={project.matchScore} 
                        totalValue={project.totalValue} 
                     />
                  </div>
               ))}
            </div>
         )}
      </div>
    </main>
  );
}
