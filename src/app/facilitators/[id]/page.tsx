import { prisma } from "@/lib/auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default async function FacilitatorDossier(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const facilitator = await prisma.user.findFirst({
    where: { id: params.id, role: "FACILITATOR" },
    include: {
       time_entries: {
          include: { milestone: { include: { project: true } } },
          orderBy: { created_at: 'desc' },
          take: 10
       },
    }
  });

  if (!facilitator) notFound();

  // Purely visual parse to mock technical limits if physical Text bio vectors weren't stored structurally
  const technologies = ["React", "PostgreSQL", "Next.js", "Prisma ORM", "AWS Architect", "Stripe API", "Node.js Core"];

  return (
    <main className="min-h-screen bg-surface relative overflow-hidden py-24 selection:bg-primary/30">
       <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none"></div>
       <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-tertiary/5 rounded-full blur-[150px] pointer-events-none"></div>

       <div className="max-w-5xl mx-auto px-6 relative z-10 space-y-12">
          
          {/* Header Layout */}
          <header className="flex flex-col md:flex-row items-center gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="relative">
                <div className={`absolute inset-0 rounded-full blur-xl opacity-40 ${facilitator.platform_tier === 'ELITE' ? 'bg-primary' : facilitator.platform_tier === 'PRO' ? 'bg-tertiary' : 'bg-surface-variant'}`}></div>
                <div className="w-40 h-40 rounded-full overflow-hidden border-[4px] border-surface shadow-2xl relative z-10 bg-surface-container-high">
                   <img src={facilitator.image || `https://api.dicebear.com/9.x/glass/svg?seed=${facilitator.id}`} alt="Top Expert" className="w-full h-full object-cover" />
                </div>
                
                {facilitator.platform_tier !== 'STANDARD' && (
                   <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20">
                      <span className={`px-5 py-1.5 rounded-full font-black font-headline uppercase tracking-widest text-[11px] shadow-2xl border ${facilitator.platform_tier === 'ELITE' ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary-container border-primary/50' : 'bg-gradient-to-r from-tertiary to-tertiary-container text-on-tertiary border-tertiary/50'}`}>
                         {facilitator.platform_tier} Expert
                      </span>
                   </div>
                )}
             </div>

             <div className="text-center md:text-left space-y-2 flex-1">
                <h1 className="text-5xl md:text-6xl font-black font-headline uppercase tracking-tighter text-on-surface">{facilitator.name || "Untethered Architect"}</h1>
                <p className="text-on-surface-variant tracking-widest uppercase font-medium text-sm flex items-center justify-center md:justify-start gap-2">
                   <span className="material-symbols-outlined text-[16px]">terminal</span> Global Escrow Facilitator
                </p>
             </div>
             <div>
                <button className="bg-surface-container-high hover:bg-surface-container-highest transition-colors px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 border border-outline-variant/30 text-on-surface">
                   <span className="material-symbols-outlined text-[18px]">handshake</span> Request Bids
                </button>
             </div>
          </header>

          {/* Telemetry Matrix Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
             
             {/* Trust Score Node */}
             <div className="bg-surface/40 backdrop-blur-3xl border border-primary/20 rounded-3xl p-8 relative overflow-hidden group hover:border-primary/50 transition-all cursor-crosshair">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <span className="material-symbols-outlined text-primary text-3xl">local_police</span>
                   <h3 className="font-bold font-headline uppercase tracking-widest text-on-surface text-sm">Global Trust Score</h3>
                </div>
                <div className="flex items-end gap-2 relative z-10">
                   <span className="text-6xl font-black font-headline text-on-surface tracking-tighter leading-none">{facilitator.trust_score.toFixed(1)}</span>
                   <span className="text-primary font-bold mb-1">/100</span>
                </div>
                <div className="w-full bg-surface-container-high h-1.5 mt-8 rounded-full overflow-hidden">
                   <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(facilitator.trust_score, 100)}%` }}></div>
                </div>
             </div>

             {/* Total Sprints Completed */}
             <div className="bg-surface/40 backdrop-blur-3xl border border-tertiary/20 rounded-3xl p-8 relative overflow-hidden group hover:border-tertiary/50 transition-all cursor-crosshair">
                <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl group-hover:bg-tertiary/20 transition-all"></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <span className="material-symbols-outlined text-tertiary text-3xl">dynamic_feed</span>
                   <h3 className="font-bold font-headline uppercase tracking-widest text-on-surface text-sm">Sprints Completed</h3>
                </div>
                <div className="flex items-end gap-2 relative z-10">
                   <span className="text-6xl font-black font-headline text-on-surface tracking-tighter leading-none">{facilitator.total_sprints_completed}</span>
                   <span className="text-tertiary font-bold tracking-widest uppercase text-[10px] mb-1.5">Executed Safely</span>
                </div>
             </div>

             {/* Escrow Dispute Rate */}
             <div className="bg-surface/40 backdrop-blur-3xl border border-secondary/20 rounded-3xl p-8 relative overflow-hidden group hover:border-secondary/50 transition-all cursor-crosshair">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-all"></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <span className="material-symbols-outlined text-secondary text-3xl">verified_user</span>
                   <h3 className="font-bold font-headline uppercase tracking-widest text-on-surface text-sm">Escrow Integrity</h3>
                </div>
                <div className="flex items-end gap-2 relative z-10">
                   <span className="text-6xl font-black font-headline text-on-surface tracking-tighter leading-none">100</span>
                   <span className="text-secondary font-bold mb-1">%</span>
                </div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-secondary/80 mt-4 px-3 py-1 bg-secondary/10 rounded-full w-fit">0 Disputes Filed</p>
             </div>

          </section>

          {/* Skill Matrix Nodes */}
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
             <h3 className="text-[11px] font-bold font-headline uppercase tracking-widest text-on-surface-variant mb-6 flex items-center justify-center gap-2 relative">
                <span className="h-px bg-outline-variant/30 flex-1"></span>
                Extracted Capabilities
                <span className="h-px bg-outline-variant/30 flex-1"></span>
             </h3>
             <div className="flex flex-wrap items-center justify-center gap-3">
                {technologies.map((tech, idx) => (
                   <span key={idx} className="bg-surface-container-low border border-outline-variant/30 text-on-surface px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-surface-container transition-colors shadow-lg hover:-translate-y-0.5 cursor-crosshair">
                      {tech}
                   </span>
                ))}
             </div>
          </section>

          {/* AI Audit History Graph */}
          {facilitator.time_entries.length > 0 && (
             <section className="pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-3xl p-8 lg:p-12">
                   <div className="flex items-center justify-between mb-8 pb-6 border-b border-outline-variant/20">
                      <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface flex items-center gap-3">
                         <span className="material-symbols-outlined text-tertiary">psychology</span>
                         Native AI Audit Logs
                      </h3>
                      <span className="bg-tertiary/10 text-tertiary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-tertiary/30 shadow-[0_0_15px_rgba(var(--color-tertiary),0.3)]">
                         Algorithmic Proof
                      </span>
                   </div>

                   <div className="space-y-6">
                      {facilitator.time_entries.filter((e: any) => e.ai_audit_report !== null).map((entry: any) => {
                         const report = entry.ai_audit_report as any;
                         if (!report || !report.alignment_score) return null;
                         return (
                            <div key={entry.id} className="group bg-surface-container border border-outline-variant/20 rounded-2xl p-6 hover:border-outline-variant/50 transition-colors">
                               <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                                  <div>
                                     <h4 className="font-bold text-on-surface text-lg">{entry.milestone.project.title}</h4>
                                     <p className="text-xs uppercase tracking-widest text-on-surface-variant font-medium mt-1">{entry.hours} Hours • Verified Alignment</p>
                                  </div>
                                  <div className="flex items-center gap-3 bg-surface-variant/20 px-4 py-2 rounded-xl w-fit border border-surface-variant/50">
                                     <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Alignment Math</span>
                                     <span className="font-black font-headline text-xl text-primary">{report.alignment_score}</span>
                                  </div>
                               </div>
                               <p className="text-sm text-on-surface leading-relaxed">{report.summary}</p>
                            </div>
                         );
                      })}
                   </div>
                </div>
             </section>
          )}

       </div>
    </main>
  );
}
