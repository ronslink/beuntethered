"use client";

import { useState, useTransition } from "react";
import { submitBid } from "@/app/actions/bids";
import { useRouter } from "next/navigation";

export default function BidModal({ 
  project, 
  totalValue, 
  onClose 
}: { 
  project: any; 
  totalValue: number; 
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bidAmount, setBidAmount] = useState<number>(totalValue);
  const [days, setDays] = useState<number>(14);
  const [approach, setApproach] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approach.trim()) return;

    startTransition(async () => {
      const res = await submitBid({
        projectId: project.id,
        proposedAmount: bidAmount,
        estimatedDays: days,
        technicalApproach: approach,
      });

      if (res?.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/marketplace");
        }, 2000);
      } else {
        alert(`Execution Fault: ${res?.error}`);
      }
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="bg-surface border border-outline-variant/30 rounded-3xl w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {success ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-tertiary/10 border border-tertiary/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--color-tertiary),0.3)]">
              <span className="material-symbols-outlined text-4xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h3 className="text-2xl font-black font-headline uppercase tracking-tight">Bid Secured</h3>
            <p className="text-sm text-on-surface-variant mt-2">Routing you back to the Deal Feed...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-8 pb-0 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Draft Escrow Bid</span>
                <h3 className="text-xl font-black font-headline text-on-surface mt-1 leading-tight">{project.title}</h3>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-error/20 hover:text-error transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Bid Reference */}
            <div className="px-8 pt-4 pb-2">
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Client Budget</span>
                <span className="text-lg font-black tracking-tight text-on-surface">{formatCurrency(totalValue)}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleBidSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Your Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">$</span>
                    <input 
                      type="number" required min={1} value={bidAmount} 
                      onChange={(e) => setBidAmount(Number(e.target.value))} 
                      className="w-full bg-surface border border-outline-variant/30 rounded-xl pl-8 pr-4 py-3 text-lg font-black text-on-surface focus:border-primary focus:ring-0 outline-none transition-colors shadow-inner" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Delivery (Days)</label>
                  <input 
                    type="number" required min={1} value={days} 
                    onChange={(e) => setDays(Number(e.target.value))} 
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-lg font-black text-on-surface focus:border-primary focus:ring-0 outline-none transition-colors shadow-inner" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Technical Approach</label>
                <textarea 
                  required value={approach} onChange={(e) => setApproach(e.target.value)} rows={4} 
                  placeholder="Outline your exact architecture, tooling, and execution methodology..."
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary focus:ring-0 outline-none transition-colors custom-scrollbar resize-none shadow-inner" 
                />
              </div>
              <button 
                type="submit" disabled={isPending || !approach.trim()} 
                className={`w-full font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${isPending ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-on-surface text-surface hover:-translate-y-1 shadow-[0_10px_25px_rgba(0,0,0,0.3)] active:scale-95'}`}
              >
                {isPending ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Securing Escrow Proposal...</>
                ) : (
                  <>Submit Bid <span className="material-symbols-outlined text-[16px]">send</span></>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
