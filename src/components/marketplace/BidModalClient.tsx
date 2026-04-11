"use client";
import { useState, useTransition } from "react";
import { submitBid } from "@/app/actions/bids";

export default function BidModalClient({ project }: { project: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  const [proposedAmount, setProposedAmount] = useState<number | string>(project.totalEst);
  const [estimatedDays, setEstimatedDays] = useState<number | string>(14);
  const [technicalApproach, setTechnicalApproach] = useState("");
  const [errorStatus, setErrorStatus] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedAmount || !estimatedDays || !technicalApproach.trim()) {
      setErrorStatus("All parameters require distinct resolution before structural maps are submitted.");
      return;
    }

    setErrorStatus("");
    
    startTransition(async () => {
      const res = await submitBid({
        projectId: project.id,
        proposedAmount: Number(proposedAmount),
        estimatedDays: Number(estimatedDays),
        technicalApproach
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        setErrorStatus(res.error || "Failed to execute bid limits.");
      }
    });
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-primary text-on-primary px-10 py-5 rounded-2xl font-bold font-headline text-sm tracking-widest uppercase shadow-[0_8px_20px_rgba(var(--color-primary),0.3)] hover:shadow-primary/50 hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all text-center"
      >
        Submit Technical Bid
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl transition-opacity animate-in fade-in" onClick={() => setIsOpen(false)}></div>
          <div className="bg-surface border border-outline-variant/30 rounded-3xl w-full max-w-2xl relative z-10 shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            <div className="p-6 lg:p-8 border-b border-outline-variant/20 flex justify-between items-start bg-surface-container-low/50">
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">bolt</span> Execute Proposal Parameters</p>
                 <h2 className="text-3xl font-extrabold font-headline text-on-surface line-clamp-1 tracking-tight">{project.title}</h2>
               </div>
               <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-surface hover:bg-surface-container-high border border-outline-variant/20 flex items-center justify-center shadow-sm transition-colors">
                 <span className="material-symbols-outlined text-on-surface-variant text-sm">close</span>
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 lg:p-8 overflow-y-auto space-y-8 custom-scrollbar">
              {errorStatus && (
                <div className="bg-secondary/10 border border-secondary/30 text-secondary px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined">warning</span>
                  {errorStatus}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-focus-within:opacity-100 rounded-xl blur-lg transition duration-500 pointer-events-none"></div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm">payments</span>
                     Total Milestone Map ($)
                  </label>
                  <input type="number" required value={proposedAmount} onChange={e => setProposedAmount(e.target.value)} className="w-full bg-surface-container border border-outline-variant/30 focus:border-primary px-5 py-4 rounded-xl font-bold text-lg focus:outline-none transition-colors relative z-10 shadow-inner" />
                  <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest absolute -bottom-5 left-1">AI Verified Baseline: ${project.totalEst}</p>
                </div>
                <div className="space-y-3 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-focus-within:opacity-100 rounded-xl blur-lg transition duration-500 pointer-events-none"></div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm">schedule</span>
                     Target Velocity (Days)
                  </label>
                  <input type="number" required value={estimatedDays} onChange={e => setEstimatedDays(e.target.value)} className="w-full bg-surface-container border border-outline-variant/30 focus:border-primary px-5 py-4 rounded-xl font-bold text-lg focus:outline-none transition-colors relative z-10 shadow-inner" />
                </div>
              </div>

              <div className="space-y-3 relative group mt-10">
                 <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-focus-within:opacity-100 rounded-xl blur-lg transition duration-500 pointer-events-none"></div>
                 <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">architecture</span>
                    Technical Architectural Strategy
                 </label>
                 <textarea required value={technicalApproach} onChange={e => setTechnicalApproach(e.target.value)} placeholder="Describe your operational stack, execution velocity, and how you will overcome the Escrow variables formally via API configurations..." className="w-full bg-surface-container border border-outline-variant/30 focus:border-primary px-5 py-5 rounded-xl text-sm focus:outline-none min-h-[160px] resize-none transition-colors custom-scrollbar leading-relaxed relative z-10 shadow-inner"></textarea>
              </div>

              <div className="pt-6 flex justify-end">
                 <button 
                   type="submit" 
                   disabled={isPending}
                   className={`px-10 py-5 flex items-center justify-center gap-2 rounded-xl font-bold font-headline text-sm tracking-widest uppercase transition-all shadow-[0_8px_20px_rgba(var(--color-primary),0.3)] hover:shadow-primary/50 ${isPending ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-80 shadow-none' : 'bg-primary text-on-primary hover:-translate-y-1 active:translate-y-0 active:scale-95'}`}
                 >
                   {isPending ? (
                     <>
                        <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                        <span>Routing Block...</span>
                     </>
                   ) : "Lock Structural Bid"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
