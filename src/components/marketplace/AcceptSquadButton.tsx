"use client";

import { useTransition } from "react";
import { acceptSquadProposal } from "@/app/actions/squads";

export default function AcceptSquadButton({ squadId }: { squadId: string, projectId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
       const res = await acceptSquadProposal(squadId);
       if (!res?.success) alert(res?.error || "Unable to accept squad proposal.");
    });
  };

  return (
    <button 
      onClick={handleAccept}
      disabled={isPending}
      className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold font-headline uppercase tracking-widest text-xs transition-all ${isPending ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-primary text-on-primary hover:shadow-[0_8px_30px_rgba(var(--color-primary),0.3)] hover:-translate-y-1 active:translate-y-0 active:scale-95'}`}
    >
      {isPending ? (
         <>
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          <span>Hiring squad...</span>
         </>
      ) : (
         <>
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
          <span>Hire Squad</span>
         </>
      )}
    </button>
  );
}
