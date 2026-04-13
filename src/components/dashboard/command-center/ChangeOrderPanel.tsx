"use client";

import { useState, useTransition } from "react";
import { proposeChangeOrder, approveChangeOrder } from "@/app/actions/change-order";

export default function ChangeOrderPanel({ projectId, role, changeOrders }: { projectId: string; role: "CLIENT" | "FACILITATOR", changeOrders: any[] }) {
  const [description, setDescription] = useState("");
  const [addedCost, setAddedCost] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePropose = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
       const res = await proposeChangeOrder(projectId, description, Number(addedCost));
       if (res.success) {
          setDescription("");
          setAddedCost("");
          alert("Change Order physically pushed to Escrow boundaries.");
       } else {
          alert(res.error);
       }
    });
  };

  const handleApprove = (orderId: string) => {
     startTransition(async () => {
        const res = await approveChangeOrder(orderId);
        if (res.success) {
           alert("Change Order fully bound to Active Scope!");
        } else {
           alert(res.error);
        }
     });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-6 lg:p-8 mt-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
       <h3 className="text-xl font-bold font-headline mb-6 flex items-center gap-2 border-b border-outline-variant/20 pb-4">
          <span className="material-symbols-outlined text-tertiary">swap_horiz</span>
          Escrow Expansion (Change Orders)
       </h3>

       {changeOrders.length > 0 && (
         <div className="space-y-4 mb-8">
            {changeOrders.map(order => (
               <div key={order.id} className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                     <p className="font-bold text-sm text-on-surface mb-1">{order.description}</p>
                     <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${order.status === 'PROPOSED' ? 'bg-primary animate-pulse' : 'bg-tertiary'}`}></span>
                        {order.status}
                     </p>
                  </div>
                  <div className="flex items-center gap-6">
                     <p className="text-xl font-black text-tertiary">{formatCurrency(Number(order.added_cost))}</p>
                     {(role === "CLIENT" && order.status === "PROPOSED") && (
                        <button
                          onClick={() => handleApprove(order.id)}
                          disabled={isPending}
                          className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
                        >
                           {isPending ? "Locking..." : "Approve Scope"}
                        </button>
                     )}
                  </div>
               </div>
            ))}
         </div>
       )}

       {role === "FACILITATOR" && (
         <form onSubmit={handlePropose} className="bg-surface-container/50 border border-outline-variant/20 rounded-2xl p-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Propose Scope Pivot</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="md:col-span-2">
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe expanded technical requirement..."
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary/50 outline-none transition-colors"
                  />
               </div>
               <div className="flex gap-4">
                  <input
                    type="number"
                    required
                    min="1"
                    value={addedCost}
                    onChange={e => setAddedCost(e.target.value)}
                    placeholder="Cost (USD)"
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface font-black focus:border-primary/50 outline-none transition-colors"
                  />
                  <button type="submit" disabled={isPending} className="bg-surface-container-highest hover:bg-surface-variant rounded-xl px-4 flex items-center justify-center transition-colors">
                     <span className="material-symbols-outlined text-on-surface">send</span>
                  </button>
               </div>
            </div>
         </form>
       )}
       {role === "CLIENT" && changeOrders.length === 0 && (
          <div className="text-center py-6 text-sm text-on-surface-variant bg-surface-container-low/50 rounded-2xl border border-outline-variant/20 border-dashed">
             No expanded scope tracking detected. Escrow constraints strictly maintained.
          </div>
       )}
    </div>
  );
}
