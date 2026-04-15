import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/auth";
import ArbitrationPanel from "@/components/dashboard/admin/ArbitrationPanel";

export default async function AdminDisputesHub() {
  const user = await getCurrentUser();
  if (!user || user.email !== (process.env.ADMIN_EMAIL || "admin@untether.network")) {
     redirect("/command-center");
  }

  // Extract all actively disputed milestones and historical logs
  const disputes = await prisma.dispute.findMany({
     orderBy: { created_at: "desc" },
     include: {
        project: true,
        milestone: true,
        client: true,
        facilitator: true
     }
  });

  return (
    <main className="lg:p-6 min-h-full flex flex-col relative pb-20">
       <div className="absolute top-0 left-[10%] w-[600px] h-[600px] bg-error/5 blur-[120px] rounded-full pointer-events-none" />

       <header className="mb-8 px-4 lg:px-0 relative z-10">
         <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full bg-error/10 text-error text-[10px] font-black tracking-widest uppercase border border-error/20 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
               Admin Only
            </span>
         </div>
         <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
           Dispute Arbitration
         </h1>
         <p className="text-on-surface-variant font-medium mt-2 text-sm">
           Review disputed Escrow payments, examine AI fact-finding reports, and issue resolution rulings.
         </p>
       </header>

       <section className="relative z-10 space-y-5 px-4 lg:px-0 max-w-[1200px]">
          {disputes.length === 0 ? (
             <div className="bg-surface border border-outline-variant/20 rounded-2xl p-16 text-center">
               <span className="material-symbols-outlined text-[56px] text-outline-variant/40 mb-4 block" style={{ fontVariationSettings: "'FILL' 0" }}>gavel</span>
               <h3 className="text-xl font-black font-headline text-on-surface mb-2 uppercase tracking-tight">No Active Disputes</h3>
               <p className="text-sm text-on-surface-variant max-w-sm mx-auto">All Escrow transactions are executing cleanly. No arbitration required at this time.</p>
             </div>
          ) : (
             disputes.map((dispute) => (
                <div key={dispute.id} className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
                   
                   {/* Dispute Header */}
                   <div className="bg-surface-container-low px-5 py-4 flex items-center justify-between border-b border-outline-variant/10 flex-wrap gap-4">
                      <div>
                         <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Case #{dispute.id.slice(0, 8)}</p>
                         <h3 className="text-base font-black text-on-surface">{dispute.project.title}</h3>
                         <p className="text-xs font-medium text-on-surface-variant mt-0.5">Milestone: {dispute.milestone.title} · ${dispute.milestone.amount.toString()}</p>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                         dispute.status === "OPEN" ? "bg-secondary/10 text-secondary border-secondary/30" :
                         "bg-tertiary/10 text-tertiary border-tertiary/30"
                      }`}>
                         {dispute.status.replace("_", " ")}
                      </span>
                   </div>

                   {/* Case Files */}
                   <div className="p-6 lg:p-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Client Issue */}
                          <div className="space-y-4">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                   <span className="material-symbols-outlined text-sm text-primary">person</span>
                                </div>
                                <div>
                                   <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Client Ledger</p>
                                   <p className="text-sm font-bold text-on-surface">{dispute.client.name || dispute.client.email}</p>
                                </div>
                             </div>
                             <div className="bg-surface-container p-4 rounded-2xl border border-error/20 border-l-[3px] border-l-error text-sm text-on-surface font-medium leading-relaxed">
                                {dispute.reason}
                             </div>
                          </div>

                          {/* Facilitator Context */}
                          <div className="space-y-4">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center border border-tertiary/20">
                                   <span className="material-symbols-outlined text-sm text-tertiary">code</span>
                                </div>
                                <div>
                                   <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Expert Bound</p>
                                   <p className="text-sm font-bold text-on-surface">{dispute.facilitator.name || dispute.facilitator.email}</p>
                                </div>
                             </div>
                             <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/30 text-sm text-on-surface font-medium leading-relaxed italic text-on-surface-variant">
                                Escrow payload delivery submitted via UI interface. Requesting release of ${dispute.milestone.amount.toString()} against contracted terms.
                             </div>
                          </div>
                       </div>

                       {dispute.status === "OPEN" && (
                          <ArbitrationPanel 
                             disputeId={dispute.id}
                             milestoneId={dispute.milestone_id}
                             appmapUrl={dispute.appmap_log_url}
                             aiReport={dispute.ai_fact_finding_report}
                          />
                       )}
                   </div>
                </div>
             ))
          )}
       </section>
    </main>
  );
}
