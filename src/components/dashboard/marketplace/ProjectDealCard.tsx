"use client";

import { useState, useTransition } from "react";
import { submitBid } from "@/app/actions/bids";

export default function ProjectDealCard({ 
  project, 
  matchScore, 
  totalValue 
}: { 
  project: any, 
  matchScore: number, 
  totalValue: number 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [bidAmount, setBidAmount] = useState<number>(totalValue);
  const [days, setDays] = useState<number>(14);
  const [approach, setApproach] = useState<string>("");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approach) return alert("Technical Approach is structurally required natively.");

    startTransition(async () => {
       const res = await submitBid({
          projectId: project.id,
          proposedAmount: bidAmount,
          estimatedDays: days,
          technicalApproach: approach
       });

       if (!res?.success) {
          alert(`Execution Fault: ${res?.error}`);
       } else {
          setIsModalOpen(false);
          alert("Bid safely logged! Escrow limits correctly processed natively.");
       }
    });
  };

  return (
    <>
      <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-8 hover:border-primary/40 focus-within:border-primary/40 transition-all duration-300 shadow-xl shadow-surface-variant/5 flex flex-col h-full relative overflow-hidden group">
         
         {/* Glowing Score Node */}
         <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl transition-all group-hover:scale-150 pointer-events-none -translate-y-4 translate-x-4 opacity-40 mix-blend-screen"
              style={{ backgroundColor: matchScore > 90 ? '#10b981' : '#f59e0b' }}></div>

         <div className="flex justify-between items-start mb-6 relative z-10">
            <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm" style={{ 
               color: matchScore > 90 ? '#10b981' : '#f59e0b',
               borderColor: matchScore > 90 ? '#10b98140' : '#f59e0b40',
               backgroundColor: matchScore > 90 ? '#10b98110' : '#f59e0b10'
            }}>
               {matchScore}% AI Match
            </span>
            <span className="px-3 py-1 rounded-md text-[10px] bg-surface-container-high border border-outline-variant/20 text-on-surface-variant font-bold uppercase tracking-widest">
               {project.billing_type === 'HOURLY_RETAINER' ? 'Hourly Cap' : 'Fixed Scope'}
            </span>
         </div>

         <div className="mb-8 flex-1 relative z-10">
            <h3 className="text-2xl font-black font-headline text-on-surface tracking-tight uppercase leading-tight mb-4 line-clamp-2">
               {project.title}
            </h3>
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4 group-hover:bg-primary/5 transition-colors duration-500">
               <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Total Allocation Value</p>
               <p className="text-3xl font-black tracking-tighter text-on-surface">{formatCurrency(totalValue)}</p>
            </div>
         </div>

         <button 
             onClick={() => setIsModalOpen(true)}
             className="w-full bg-surface-container-high hover:bg-primary text-on-surface hover:text-on-primary transition-colors border border-outline-variant/30 hover:border-primary px-6 py-4 rounded-xl font-bold font-headline uppercase tracking-widest text-xs flex items-center justify-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Review AI Scope & Bid
         </button>
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center px-4 custom-scrollbar overflow-y-auto pt-20 pb-20">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-surface border border-outline-variant/30 rounded-3xl w-full max-w-4xl relative z-10 shadow-2xl p-8 lg:p-12 overflow-hidden flex flex-col md:flex-row gap-12">
               
               <div className="flex-1 space-y-8">
                  <h2 className="text-3xl font-black font-headline text-on-surface uppercase tracking-tight leading-none">{project.title}</h2>
                  <div className="space-y-3">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Generated Statement of Work</p>
                     <div className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl max-h-[300px] overflow-y-auto custom-scrollbar">
                        <p className="text-on-surface text-sm leading-relaxed whitespace-pre-wrap">{project.ai_generated_sow}</p>
                     </div>
                  </div>
                  {project.milestones.length > 0 && (
                     <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Escrow Phasing Rules</p>
                        <div className="space-y-2">
                           {project.milestones.map((m: any) => (
                              <div key={m.id} className="flex justify-between items-center text-xs p-3 bg-surface-variant/20 rounded-lg border border-outline-variant/10">
                                 <span className="font-bold text-on-surface">{m.title}</span>
                                 <span className="font-black opacity-80">{formatCurrency(Number(m.amount))}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               <div className="w-full md:w-80 shrink-0 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 lg:p-8 relative">
                  <span className="material-symbols-outlined absolute top-4 right-4 text-on-surface-variant cursor-pointer hover:text-error transition-colors" onClick={() => setIsModalOpen(false)}>close</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-6 pb-4 border-b border-outline-variant/20">Execution Bid Logic</p>
                  
                  <form onSubmit={handleBidSubmit} className="space-y-5">
                     <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Total Bid Constraint (USD)</label>
                        <input type="number" required min="1" value={bidAmount} onChange={e => setBidAmount(Number(e.target.value))} className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-lg font-black text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Delivery SLA (Days)</label>
                        <input type="number" required min="1" value={days} onChange={e => setDays(Number(e.target.value))} className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-bold text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Architectural Approach</label>
                        <textarea required value={approach} onChange={e => setApproach(e.target.value)} rows={4} className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors custom-scrollbar" placeholder="Define exact AI matrices scaling this layout..."></textarea>
                     </div>
                     <button type="submit" disabled={isPending} className={`w-full font-bold uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isPending ? 'bg-surface-variant text-on-surface-variant' : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container hover:-translate-y-1 hover:shadow-primary/30'}`}>
                        {isPending ? 'Securing Array...' : 'Submit Execution Bid'}
                     </button>
                  </form>
               </div>
               
            </div>
         </div>
      )}
    </>
  );
}
