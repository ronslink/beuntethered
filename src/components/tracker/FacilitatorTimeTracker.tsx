"use client";

import { useState, useTransition } from "react";
import { logTimeEntry } from "@/app/actions/time";

export default function FacilitatorTimeTracker({ 
   milestoneId, 
   pendingHours, 
   limitHours 
}: { 
   milestoneId: string, 
   pendingHours: number, 
   limitHours: number 
}) {
  const [hours, setHours] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofDescription, setProofDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const isLocked = pendingHours >= limitHours;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    startTransition(async () => {
      const res = await logTimeEntry({
         milestoneId,
         hours: Number(hours),
         proofUrl,
         proofDescription
      });

      if (res.success) {
         setHours("");
         setProofUrl("");
         setProofDescription("");
      } else {
         alert(res.error);
      }
    });
  };

  return (
    <div className="bg-surface/50 backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold font-headline flex items-center gap-2">
           <span className="material-symbols-outlined text-primary">timer</span>
           Time & Proof Logging
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border ${isLocked ? 'bg-error/10 text-error border-error/20' : 'bg-surface-variant text-on-surface-variant border-outline-variant/20'}`}>
          Limit: {pendingHours} / {limitHours}h
        </div>
      </div>

      {isLocked ? (
         <div className="bg-error/5 border border-error/20 p-5 rounded-xl flex items-start gap-4 animate-in zoom-in duration-300">
            <span className="material-symbols-outlined text-error">lock</span>
            <div>
              <p className="text-error font-bold text-sm mb-1 uppercase tracking-widest">Sprint Limit Reached</p>
              <p className="text-error/80 text-xs leading-relaxed">
                You have reached your {limitHours}-hour unreviewed execution sprint limit. You must map your Proof of Work URL arrays securely so the Client can formally execute Escrow release logic before logging additional limits natively.
              </p>
            </div>
         </div>
      ) : (
         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Hours Tracked</label>
                 <input 
                    type="number" 
                    step="0.25"
                    min="0.25"
                    required
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                    placeholder="e.g. 4.5" 
                 />
              </div>
              <div>
                 <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Proof URL link (Github / Loom / Figma)</label>
                 <input 
                    type="url" 
                    value={proofUrl}
                    onChange={e => setProofUrl(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors text-primary placeholder:text-on-surface-variant/40"
                    placeholder="https://..." 
                 />
              </div>
            </div>

            <div>
               <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 block">Proof of Work Architecture Description (Required)</label>
               <textarea 
                  required
                  value={proofDescription}
                  onChange={e => setProofDescription(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors min-h-[80px] custom-scrollbar placeholder:text-on-surface-variant/40"
                  placeholder="Mapped the strict UI arrays tracking standard checkout limits natively across all nodes..."
               ></textarea>
            </div>

            <div className="flex justify-end pt-2">
               <button 
                  type="submit" 
                  disabled={isPending || !hours || !proofDescription}
                  className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
               >
                  {isPending ? 'Logging Vectors...' : 'Log Time Entry'}
               </button>
            </div>
         </form>
      )}
    </div>
  );
}
