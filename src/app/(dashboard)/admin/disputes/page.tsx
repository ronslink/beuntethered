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
    <main className="p-6 md:p-10 lg:p-14 min-h-[calc(100vh-80px)] flex flex-col relative">
       {/* Background structural glow */}
       <div className="absolute top-[0%] left-[10%] w-[600px] h-[600px] bg-error/5 blur-[120px] rounded-full pointer-events-none"></div>

       <header className="mb-10 lg:mb-16 max-w-4xl relative z-10">
         <div className="flex items-center gap-4 mb-4">
            <span className="bg-error/10 text-error px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-error/20 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse flex-shrink-0"></span>
               Admin Priority
            </span>
         </div>
         <h1 className="text-3xl md:text-5xl font-black font-headline tracking-tighter text-on-surface">
           Arbitration <span className="text-error">Matrix</span>
         </h1>
         <p className="text-on-surface-variant font-medium mt-3 text-lg">
           Review Escrow holds, examine AI Fact Finding logs, and physically override payment logic. 
         </p>
       </header>

       <section className="relative z-10 space-y-8 max-w-6xl">
          {disputes.length === 0 ? (
             <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-16 text-center shadow-lg">
               <span className="material-symbols-outlined text-6xl text-outline-variant/50 mb-6 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>gavel</span>
               <h3 className="text-2xl font-black font-headline text-on-surface mb-2">Platform Secure</h3>
               <p className="text-on-surface-variant max-w-md mx-auto">No Escrow milestones are currently frozen in structural conflict. All active transactions are executing flawlessly.</p>
             </div>
          ) : (
             disputes.map((dispute) => (
                <div key={dispute.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-lg">
                   
                   {/* Dispute Header */}
                   <div className="bg-surface-container-low p-6 lg:p-8 flex items-start justify-between border-b border-outline-variant/30 flex-wrap gap-4">
                      <div>
                         <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Conflict Zone ID: {dispute.id.slice(0, 8)}</p>
                         <h3 className="text-2xl font-black font-headline text-on-surface">{dispute.project.title}</h3>
                         <p className="text-sm font-medium text-on-surface-variant mt-1">Milestone: {dispute.milestone.title} (${dispute.milestone.amount.toString()})</p>
                      </div>

                      <span className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                         dispute.status === "OPEN" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                         "bg-green-500/10 text-green-500 border-green-500/30"
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
                                "{dispute.reason}"
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
