"use client";

import { useState } from "react";
import { resolveDisputeForClient, resolveDisputeForFacilitator } from "@/app/actions/arbitration";

interface ArbitrationPanelProps {
  disputeId: string;
  milestoneId: string;
  appmapUrl?: string | null;
  aiReport?: string | null;
}

export default function ArbitrationPanel({ disputeId, milestoneId, appmapUrl, aiReport }: ArbitrationPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const executeRefund = async () => {
    if (!confirm("CRITICAL BOUNDS: Rejecting the expert forcefully executes a physical refund of Escrow funds back to the Client. Proceed?")) return;
    setIsExecuting(true);
    
    // Simulate triggering the actual stripe refund endpoint, then resolving the local db
    const edgeRes = await fetch("/api/stripe/refund", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ milestoneId })
    });
    
    if (!edgeRes.ok) {
       const j = await edgeRes.json();
       setErrorStatus("Stripe Refund Fault: " + j.error);
       setIsExecuting(false);
       return;
    }

    const res = await resolveDisputeForClient(disputeId);
    if (!res.success) setErrorStatus(res.error);
    setIsExecuting(false);
  };

  const executePayout = async () => {
    if (!confirm("CRITICAL BOUNDS: Overriding Client Rejection violently forces Escrow funds OUT to the Expert. Proceed?")) return;
    setIsExecuting(true);

    const edgeRes = await fetch("/api/stripe/release-escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId })
    });

    if (!edgeRes.ok) {
       const j = await edgeRes.json();
       setErrorStatus("Stripe Payout Fault: " + j.error);
       setIsExecuting(false);
       return;
    }

    const res = await resolveDisputeForFacilitator(disputeId);
    if (!res.success) setErrorStatus(res.error);
    setIsExecuting(false);
  };

  return (
    <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-8">
      <h3 className="text-xl font-bold font-headline text-on-surface mb-6 flex items-center gap-3 border-b border-outline-variant/20 pb-4">
        <span className="material-symbols-outlined text-error">gavel</span>
        Platform Arbitration Matrix
      </h3>

      {errorStatus && (
         <div className="bg-error/10 border border-error/50 p-4 rounded-xl mb-6 text-sm font-medium text-error">
            {errorStatus}
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
           <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Discovery Logs</h4>
           {appmapUrl ? (
              <a href={appmapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container transition-colors group cursor-pointer">
                  <span className="material-symbols-outlined text-primary">data_object</span>
                  <span className="text-sm font-medium text-on-surface">Inspect AppMap Trace</span>
                  <span className="material-symbols-outlined text-on-surface-variant ml-auto text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </a>
           ) : (
              <div className="p-4 rounded-xl border border-dashed border-outline-variant/50 text-sm italic text-on-surface-variant">No structural execution bounds provided by Facilitator.</div>
           )}
        </div>

        <div>
           <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">AI Fact Finding</h4>
           {aiReport ? (
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 max-h-48 overflow-y-auto">
                 <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{aiReport}</p>
              </div>
           ) : (
              <div className="p-4 rounded-xl border border-dashed border-outline-variant/50 text-sm italic text-tertiary">Daktari node did not generate an AI validation trace for this bounds conflict.</div>
           )}
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-outline-variant/20 pt-6">
        <button 
           onClick={executeRefund}
           disabled={isExecuting}
           className="flex-1 bg-surface-container-high text-on-surface hover:bg-error hover:text-white transition-all px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs border border-outline-variant/30 disabled:opacity-50"
        >
           {isExecuting ? "Locking..." : "Rule For Client (Refund)"}
        </button>

        <button 
           onClick={executePayout}
           disabled={isExecuting}
           className="flex-1 bg-primary text-on-primary hover:bg-primary/90 transition-all px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 disabled:opacity-50"
        >
           {isExecuting ? "Executing Escrow..." : "Rule For Expert (Release)"}
        </button>
      </div>
    </div>
  );
}
