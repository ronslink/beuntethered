import { prisma } from "@/lib/auth";
import Link from "next/link";

export default async function TopTalentDirectory() {
  const elites = await prisma.user.findMany({
    where: { 
       role: 'FACILITATOR',
       platform_tier: { in: ['ELITE', 'PRO'] }
    },
    orderBy: { trust_score: 'desc' },
    select: {
       id: true,
       name: true,
       email: true,
       platform_tier: true,
       trust_score: true,
       total_sprints_completed: true,
       image: true
    }
  });

  return (
    <main className="min-h-screen bg-[#07090F] relative overflow-hidden py-24 selection:bg-tertiary/30">
       <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-tertiary/5 rounded-full blur-[150px] pointer-events-none"></div>
       <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none"></div>

       <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-16">
          <header className="text-center max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <span className="font-headline font-black tracking-widest uppercase text-tertiary text-sm px-6 py-2 rounded-full border border-tertiary/30 bg-tertiary/10 shadow-[0_0_20px_rgba(var(--color-tertiary),0.2)]">
                Top-Rated Freelancers
             </span>
             <h1 className="text-6xl md:text-7xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.9]">
                Execute With <br />
                <span className="bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent">Algorithmic Proof</span>
             </h1>
             <p className="text-on-surface-variant text-lg font-medium max-w-2xl mx-auto">
                Our platform reviews developer work and ensures safe payments. Hire confidently with built-in escrow protection.
             </p>
          </header>

          {/* Directory Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {elites.map((expert, idx) => (
                <div key={expert.id} className="group relative animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
                   
                   {/* Card Background & Glow */}
                   <div className={`absolute -inset-0.5 rounded-3xl blur opacity-20 transition-all group-hover:opacity-60 group-hover:blur-md ${expert.platform_tier === 'ELITE' ? 'bg-gradient-to-br from-primary to-primary-container' : 'bg-gradient-to-br from-tertiary to-tertiary-container'}`}></div>
                   
                   <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/20 rounded-3xl p-8 relative h-full flex flex-col hover:border-outline-variant/40 transition-colors z-10 overflow-hidden">
                      
                      {/* Internal Accent Glow */}
                      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 transition-all group-hover:scale-150 ${expert.platform_tier === 'ELITE' ? 'bg-primary' : 'bg-tertiary'}`}></div>

                      <header className="flex justify-between items-start mb-8 relative z-10">
                         <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-surface-container bg-surface-container-high shrink-0 shadow-xl">
                            <img src={expert.image || `https://api.dicebear.com/9.x/glass/svg?seed=${expert.id}`} alt={expert.name || "Expert"} className="w-full h-full object-cover" />
                         </div>
                         <span className={`px-4 py-1 rounded-full font-black font-headline uppercase tracking-widest text-[10px] shadow-lg border ${expert.platform_tier === 'ELITE' ? 'bg-primary/20 text-primary border-primary/50' : 'bg-tertiary/20 text-tertiary border-tertiary/50'}`}>
                            {expert.platform_tier}
                         </span>
                      </header>

                      <div className="mb-8 relative z-10 flex-1">
                         <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface mb-1">
                            {expert.name || expert.email.split('@')[0]}
                         </h3>
                         <p className="text-on-surface-variant font-bold text-xs uppercase tracking-widest">Platform Facilitator</p>
                      </div>

                      {/* Mini Telemetry Matrix */}
                      <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                         <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-4 group-hover:border-outline-variant/40 transition-colors">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Trust Score</p>
                            <div className="flex items-end gap-1">
                               <span className="font-black font-headline text-3xl leading-none text-on-surface">{expert.trust_score.toFixed(1)}</span>
                               <span className="text-xs font-bold text-on-surface-variant mb-0.5">/ 100</span>
                            </div>
                         </div>
                         <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-4 group-hover:border-outline-variant/40 transition-colors">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Sprints Done</p>
                            <div className="flex items-end gap-1">
                               <span className="font-black font-headline text-3xl leading-none text-on-surface">{expert.total_sprints_completed}</span>
                               <span className="text-xs font-bold text-on-surface-variant mb-0.5">Locks</span>
                            </div>
                         </div>
                      </div>

                      <Link href={`/facilitators/${expert.id}`} className={`w-full group/btn block border border-outline-variant/20 rounded-xl p-4 text-center transition-all hover:-translate-y-1 relative z-10 ${expert.platform_tier === 'ELITE' ? 'hover:bg-primary hover:border-primary text-on-surface hover:text-on-primary' : 'hover:bg-tertiary hover:border-tertiary text-on-surface hover:text-on-tertiary'}`}>
                         <span className="font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                            View Executive Dossier
                            <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                         </span>
                      </Link>

                   </div>
                </div>
             ))}
             
             {elites.length === 0 && (
                 <div className="col-span-full py-24 text-center">
                    <span className="material-symbols-outlined text-border text-6xl mb-4">search_off</span>
                    <h3 className="text-on-surface font-black uppercase tracking-tight text-xl">No Experts Found</h3>
                    <p className="text-on-surface-variant text-sm mt-2">The AI Algorithm hasn't verified any Elite talent yet.</p>
                 </div>
             )}
          </section>

       </div>
    </main>
  );
}
