"use client";

import { useState, useTransition } from "react";
import { approveTimesheet, disputeTimeEntry } from "@/app/actions/time";

export default function ClientTimeTracker({ entries }: { entries: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [acknowledged, setAcknowledged] = useState(false);

  const pendingEntries = entries.filter(e => e.status === "PENDING");
  const unreviewedHoursSum = pendingEntries.reduce((acc, e) => acc + Number(e.hours), 0);
  
  if (entries.length === 0) {
    return (
       <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 rounded-2xl p-8 text-center text-on-surface-variant flex flex-col items-center">
          <span className="material-symbols-outlined text-4xl mb-3 opacity-40 text-primary">hourglass_empty</span>
          <p className="text-sm font-bold uppercase tracking-widest">No Execution Metrics Logged</p>
          <p className="text-xs mt-2 max-w-sm">The expert has not logged any Time entries mapped against this Escrow milestone phase natively.</p>
       </div>
    )
  }

  const handleApprove = () => {
    if (!acknowledged) return;
    startTransition(async () => {
       const ids = pendingEntries.map(e => e.id);
       const res = await approveTimesheet(ids);
       if (res.success) {
          alert(`Successfully Approved and Payout Initiated! Limit cleared securely.`);
          setAcknowledged(false);
       } else {
          alert(res.error);
       }
    });
  }

  const handleDispute = (id: string) => {
    startTransition(async () => {
       const res = await disputeTimeEntry(id);
       if (res.success) {
          alert("Time Entry mathematically locked and mapped to Admin Arbitration grids.");
       } else {
          alert(res.error);
       }
    });
  };

  return (
    <div className="bg-surface/50 backdrop-blur-xl border border-outline-variant/30 rounded-2xl overflow-hidden shadow-lg shadow-surface-variant/5">
       <div className="p-6 border-b border-outline-variant/20 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold font-headline flex items-center gap-2 text-primary">
               <span className="material-symbols-outlined">gavel</span>
               Client Governance Audit
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">Review Proof of Work explicitly before executing Escrow loops natively.</p>
          </div>
          <div className="bg-surface-container px-4 py-2 rounded-lg border border-outline-variant/20 text-center">
             <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Pending Payload</p>
             <p className="text-lg font-black text-on-surface">{unreviewedHoursSum} h</p>
          </div>
       </div>

       <div className="p-0">
         <div className="divide-y divide-outline-variant/10 max-h-[400px] overflow-y-auto custom-scrollbar">
           {entries.map(e => (
             <div key={e.id} className="p-5 flex flex-col xl:flex-row xl:items-start justify-between gap-6 hover:bg-surface-container-low/30 transition-colors">
                <div className="flex-1 space-y-3">
                   
                   <div className="flex items-center gap-3">
                     <span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded border ${e.status === 'PENDING' ? 'bg-primary/10 text-primary border-primary/20' : e.status === 'APPROVED' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-error/10 text-error border-error/20'}`}>
                        {e.status}
                     </span>
                     <span className="text-sm font-black text-on-surface tracking-tight bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/10">{Number(e.hours)} Hours</span>
                     
                     {/* The Risk Flag Warning Icon */}
                     {e.status === "PENDING" && !e.proof_url && (
                        <div className="text-error flex items-center gap-1 group relative cursor-pointer">
                           <span className="material-symbols-outlined text-lg animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                           <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-error text-on-primary text-[10px] p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">Caution: Expert did not attach a mathematical Proof link pointing natively evaluating their execution vector.</span>
                        </div>
                     )}
                   </div>

                   <p className="text-sm text-on-surface opacity-90 leading-relaxed font-medium">{e.proof_description}</p>
                   
                   {e.proof_url && (
                      <a href={e.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary hover:text-primary-container bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-md transition-colors w-fit">
                         <span className="material-symbols-outlined text-[14px]">link</span> Review Link
                      </a>
                   )}
                </div>

                <div className="shrink-0 flex xl:flex-col gap-2 w-full xl:w-auto">
                   {e.status === "PENDING" && (
                     <button onClick={() => handleDispute(e.id)} disabled={isPending} className="flex-1 xl:flex-none flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-error hover:text-error-container hover:bg-error/10 border border-error/30 px-4 py-2 rounded-lg transition-colors">
                       <span className="material-symbols-outlined text-sm">flag</span> Dispute
                     </button>
                   )}
                </div>
             </div>
           ))}
         </div>
       </div>

       {pendingEntries.length > 0 && (
          <div className="p-6 border-t border-outline-variant/20 bg-surface-container-low/50">
             <div className="flex items-start gap-4 mb-6">
                <input 
                   type="checkbox" 
                   id="ack" 
                   checked={acknowledged}
                   onChange={e => setAcknowledged(e.target.checked)}
                   className="mt-1 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface bg-surface shadow-inner"
                />
                <label htmlFor="ack" className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-xl cursor-pointer">
                  I formally acknowledge I have evaluated the listed Proof of Work structural arrays completely natively. Releasing Escrow formally transfers platform checkout limits bypassing dispute windows globally accurately.
                </label>
             </div>
             
             <div className="flex justify-end gap-3">
                <button
                   onClick={handleApprove}
                   disabled={!acknowledged || isPending}
                   className={`bg-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-3.5 rounded-xl transition-all shadow-[0_8px_20px_rgba(var(--color-primary),0.2)] hover:-translate-y-0.5 hover:shadow-primary/40 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center gap-2`}
                >
                   {isPending ? 'Releasing Arrays...' : 'Approve Timesheet & Release Funds'}
                   <span className="material-symbols-outlined text-sm">lock_open</span>
                </button>
             </div>
          </div>
       )}
    </div>
  );
}
