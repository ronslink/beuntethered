import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import BidModalClient from "@/components/marketplace/BidModalClient";

// Vercel server cache disable resolving dynamic queries natively
export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DEVELOPER") redirect("/dashboard");

  // Track OPEN_BIDDING filtering BYOC bypasses specifically
  const openProjects = await prisma.project.findMany({
    where: {
      status: "OPEN_BIDDING",
      is_byoc: false
    },
    include: {
      client: true,
      milestones: true,
      bids: true
    },
    orderBy: { id: 'desc' }
  });

  // Calculate totals mapping natively checking if Developer overlaps an existing map dynamically
  const projectsWithContext = openProjects.map(p => {
    const hasBid = p.bids.some(b => b.developer_id === user.id);
    const totalEst = p.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
    return { ...p, hasBid, totalEst };
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <main className="lg:p-6 min-h-full pb-20 relative overflow-hidden">
      <div className="absolute top-[-5%] right-[0%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="mb-10 px-4 lg:px-0 relative z-10">
        <p className="text-xs font-bold font-headline uppercase tracking-widest text-primary mb-2">Platform Network</p>
        <h2 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
          Expert <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Marketplace</span>
        </h2>
        <p className="text-on-surface-variant font-medium mt-4 max-w-2xl leading-relaxed">Review heavily vetted, AI-parsed Statement of Works formally mapped into Escrow bounds natively. Secure your technical operations bypassing endless negotiation loops continuously.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 px-4 lg:px-0 relative z-10 w-full max-w-6xl">
        {projectsWithContext.length === 0 ? (
           <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-16 text-center text-on-surface-variant flex flex-col items-center shadow-lg">
             <span className="material-symbols-outlined text-[80px] mb-6 opacity-30">hourglass_empty</span>
             <h3 className="text-2xl font-bold font-headline text-on-surface">No Open Bidding Parameters Found</h3>
             <p className="text-sm mt-3 max-w-sm leading-relaxed">Clients are actively scaffolding scopes via the AI Hub right now. Refresh slightly later mapping newly generated Escrows.</p>
           </div>
        ) : (
           projectsWithContext.map(project => (
             <div key={project.id} className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 hover:border-primary/40 hover:bg-surface-container/30 transition-all duration-300 shadow-xl shadow-surface-variant/5 group">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10">
                  
                  {/* Left Info Payload constraints */}
                  <div className="flex-1 space-y-6">
                     <div className="flex flex-wrap items-center gap-4">
                       <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-headline tracking-widest uppercase border border-primary/20 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]">Untether Network</span>
                       <span className="text-xs text-on-surface-variant font-bold uppercase tracking-widest flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/30">
                         <span className="material-symbols-outlined text-[14px]">group</span>
                         {project.client?.name || "Verified Client Node"}
                       </span>
                     </div>
                     
                     <h3 className="text-3xl lg:text-4xl font-extrabold font-headline text-on-surface tracking-tight leading-snug group-hover:text-primary transition-colors">{project.title}</h3>
                     <p className="text-sm text-on-surface-variant leading-loose w-full xl:max-w-4xl opacity-90 font-medium">{project.ai_generated_sow}</p>
                     
                     <div className="flex flex-wrap items-center gap-4 pt-4">
                        <div className="flex items-center gap-3 bg-surface-container-low px-6 py-3 rounded-2xl border border-outline-variant/30 shadow-inner">
                          <span className="material-symbols-outlined text-primary text-sm">payments</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-0.5">Est. Project Target:</span>
                          <span className="font-bold text-on-surface text-lg">{formatCurrency(project.totalEst)}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-surface-container-low px-6 py-3 rounded-2xl border border-outline-variant/30 shadow-inner">
                          <span className="material-symbols-outlined text-secondary text-sm">account_tree</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-0.5">Architecture:</span>
                          <span className="font-bold text-on-surface text-lg">{project.milestones.length} Milestones</span>
                        </div>
                     </div>
                  </div>

                  {/* Right CTA Boundaries */}
                  <div className="xl:shrink-0 flex flex-col justify-center border-t xl:border-t-0 xl:border-l border-outline-variant/20 pt-8 xl:pt-0 xl:pl-8">
                     {project.hasBid ? (
                       <div className="bg-surface-container-low border border-primary/20 text-on-surface-variant px-10 py-5 rounded-2xl flex flex-col items-center gap-2 justify-center cursor-not-allowed opacity-80 shadow-inner">
                         <span className="material-symbols-outlined text-primary text-3xl mb-1">check_circle</span>
                         <span className="font-bold font-headline text-xs tracking-widest uppercase text-primary">Proposal Registered</span>
                         <span className="text-[10px] font-medium opacity-60">Awaiting Client Parsing</span>
                       </div>
                     ) : (
                       <BidModalClient project={project} />
                     )}
                  </div>
                </div>
             </div>
           ))
        )}
      </div>
    </main>
  )
}
