import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AcceptBidButton from "@/components/marketplace/AcceptBidButton";
import AcceptSquadButton from "@/components/marketplace/AcceptSquadButton";

export const dynamic = 'force-dynamic';

export default async function ProjectReviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") redirect("/dashboard");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      bids: {
         include: { developer: true },
         orderBy: { proposed_amount: 'asc' }
      },
      milestones: true,
      squad_proposals: {
         include: {
            members: {
               include: { facilitator: true, milestone: true }
            }
         }
      }
    }
  });

  if (!project || project.client_id !== user.id) redirect("/dashboard");

  // If project is active, redirect to the command center
  if (project.status === "ACTIVE") {
     redirect(`/command-center/${project.id}`);
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };
  
  const totalEst = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);

  return (
    <main className="lg:p-6 min-h-full pb-20 relative overflow-hidden">
      <div className="absolute top-[-5%] left-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="mb-10 px-4 lg:px-0 relative z-10 w-full max-w-6xl">
        <div className="flex items-center gap-2 mb-4">
           <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors flex items-center text-xs font-bold uppercase tracking-widest gap-1"><span className="material-symbols-outlined text-[14px]">arrow_back</span> Back to Dashboard</Link>
        </div>
        <div className="flex justify-between items-end gap-6 flex-wrap">
          <div>
            <p className="text-xs font-bold font-headline uppercase tracking-widest text-primary mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">gavel</span> Review Proposals</p>
            <h2 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface line-clamp-2">
              {project.title}
            </h2>
            <p className="text-on-surface-variant font-medium mt-3 max-w-2xl leading-relaxed text-sm lg:text-base">Review developer proposals and hire the best fit for your project. Funds are held safely until you approve the work.</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/30 px-6 py-4 rounded-2xl text-right shrink-0">
             <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Project Value</p>
             <p className="text-2xl lg:text-3xl font-black text-on-surface tracking-tighter">{formatCurrency(totalEst)}</p>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-0 relative z-10 w-full max-w-6xl mb-12 space-y-6">
        {/* SOW Payload */}
        <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-lg relative overflow-hidden">
           <div className="relative z-10">
              <h3 className="text-xl font-bold font-headline mb-4 flex items-center gap-2 border-b border-outline-variant/20 pb-4">
                 <span className="material-symbols-outlined text-primary border border-primary/20 bg-primary/10 p-1.5 rounded-lg text-sm">article</span>
                 Scope of Work (SOW)
              </h3>
              <div className="text-sm font-medium text-on-surface-variant leading-relaxed whitespace-pre-wrap bg-surface-container-low/50 p-6 rounded-2xl border border-outline-variant/20">
                 {project.ai_generated_sow}
              </div>
           </div>
        </div>

        {/* Milestone Constraints */}
        <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-lg relative overflow-hidden">
           <h3 className="text-xl font-bold font-headline mb-6 flex items-center gap-2 border-b border-outline-variant/20 pb-4">
               <span className="material-symbols-outlined text-secondary border border-secondary/20 bg-secondary/10 p-1.5 rounded-lg text-sm">map</span>
               Escrow Sprints
           </h3>
           <div className="space-y-4">
               {project.milestones.map((m, idx) => (
                  <div key={m.id} className="bg-surface-container-low border border-outline-variant/20 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center font-bold text-on-surface-variant shrink-0 shadow-inner">
                           {idx + 1}
                        </div>
                        <div>
                           <p className="font-bold text-on-surface mb-1 text-base">{m.title}</p>
                           <p className="text-xs text-on-surface-variant max-w-2xl line-clamp-2">{m.description || "No specific sprint details available."}</p>
                        </div>
                     </div>
                     <div className="bg-surface-container-high px-4 py-2 rounded-xl text-center shrink-0 border border-outline-variant/30 shadow-inner">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-0.5">Budget</p>
                        <p className="text-sm font-black text-on-surface">{formatCurrency(Number(m.amount))}</p>
                     </div>
                  </div>
               ))}
           </div>
        </div>
      </div>

      <div className="px-4 lg:px-0 relative z-10 w-full max-w-6xl">
         {project.squad_proposals.map(squad => (
            <div key={squad.id} className="bg-surface-container-low border-2 border-primary/40 rounded-3xl p-8 shadow-[0_10px_40px_rgba(var(--color-primary),0.1)] relative overflow-hidden mb-8 group animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
               
               <div className="flex items-center gap-3 mb-6 relative z-10">
                 <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                 <h3 className="text-xl md:text-2xl font-black font-headline text-on-surface tracking-tight uppercase">AI Assembled Dream Team</h3>
               </div>
               
               <div className="bg-surface/50 backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-6 mb-8 relative z-10">
                 <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Architectural Pitch</p>
                 <p className="text-sm font-medium leading-relaxed text-on-surface opacity-90">{squad.pitch_to_client}</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 relative z-10">
                 {squad.members.map(member => (
                    <div key={member.id} className="bg-surface border border-outline-variant/20 rounded-2xl p-5 flex items-start gap-4 hover:border-primary/30 transition-colors">
                       <div className="w-12 h-12 rounded-full lg:w-14 lg:h-14 bg-surface-variant flex items-center justify-center shrink-0 border border-outline-variant/30 overflow-hidden text-on-surface-variant">
                          <span className="material-symbols-outlined text-[24px]">person</span>
                       </div>
                       <div className="flex-1 overflow-hidden">
                         <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1 opacity-80 truncate">{member.milestone.title}</p>
                         <p className="text-sm font-bold text-on-surface leading-tight mb-1 truncate">{member.facilitator.name || "Untether Expert"}</p>
                         <p className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-md inline-block uppercase tracking-widest border border-primary/20">{formatCurrency(Number(member.milestone.amount))}</p>
                       </div>
                    </div>
                 ))}
               </div>
               
               <div className="max-w-md relative z-10">
                 {project.status === 'OPEN_BIDDING' && (
                    <AcceptSquadButton squadId={squad.id} projectId={project.id} />
                 )}
               </div>
            </div>
         ))}

        {project.bids.length === 0 && project.squad_proposals.length === 0 ? (
           <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-16 text-center text-on-surface-variant flex flex-col items-center shadow-lg">
             <span className="material-symbols-outlined text-[80px] mb-6 opacity-30 text-primary/50">radar</span>
             <h3 className="text-2xl font-bold font-headline text-on-surface">No Expert Connects Validated Yet</h3>
             <p className="text-sm mt-3 max-w-sm leading-relaxed">No proposals yet — check back soon as developers submit bids.</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
             {project.bids.map(bid => (
                <div key={bid.id} className="bg-surface/60 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-6 lg:p-8 hover:border-primary/40 focus-within:border-primary/40 transition-all duration-300 shadow-xl shadow-surface-variant/5 flex flex-col h-full relative overflow-hidden group">
                   
                   <div className="flex items-center gap-4 mb-6 relative z-10">
                      <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]">
                         <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                      </div>
                      <div>
                         <span className="block text-sm lg:text-base font-bold text-on-surface leading-tight mb-1">{bid.developer.name || "Freelancer"}</span>
                         <span className="block text-[10px] text-on-surface-variant uppercase tracking-widest font-bold bg-surface-container-high rounded-lg px-2 py-0.5 inline-block border border-outline-variant/20 shadow-inner">Verified Developer</span>
                      </div>
                   </div>

                   <div className="space-y-4 mb-8 flex-1 relative z-10">
                      <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20 relative group-hover:bg-primary/5 transition-colors duration-500">
                         <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Proposed Execution Map</p>
                         <p className="text-3xl font-black text-on-surface text-transparent bg-clip-text bg-gradient-to-r from-on-surface to-on-surface-variant tracking-tighter">{formatCurrency(Number(bid.proposed_amount))}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 flex-1">
                           <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Velocity Limits</p>
                           <p className="text-sm font-bold text-on-surface">{bid.estimated_days} Delivery Target</p>
                        </div>
                      </div>
                      <div className="pt-2">
                         <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-2">Technical Implementation Matrix</p>
                         <p className="text-xs text-on-surface leading-relaxed opacity-90 custom-scrollbar overflow-y-auto w-full min-h-[140px] max-h-[180px] bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/10 whitespace-pre-wrap">
                           {bid.technical_approach}
                         </p>
                      </div>
                   </div>

                   <div className="relative z-10 mt-auto pt-4">
                     {project.status === 'OPEN_BIDDING' && (
                        <AcceptBidButton bidId={bid.id} projectId={project.id} />
                     )}
                   </div>
                </div>
             ))}
           </div>
        )}
      </div>
    </main>
  );
}
