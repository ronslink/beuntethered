"use client";
import { useTransition } from "react";
import { acceptBid } from "@/app/actions/bids";
import { useRouter } from "next/navigation";

export default function AcceptBidButton({ bidId, projectId }: { bidId: string, projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAccept = () => {
     if (!confirm("Confirm execution formatting? This action logically limits all milestone proportions exactly mapping to Escrow and natively locks your architecture.")) return;
     
     startTransition(async () => {
       const res = await acceptBid(bidId);
       if (res.success) {
         router.push(`/command-center?id=${projectId}`);
       } else {
         alert(res.error);
       }
     });
  }

  return (
    <button 
      onClick={handleAccept}
      disabled={isPending}
      className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold font-headline uppercase tracking-widest text-xs transition-all duration-300 ${isPending ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-80 shadow-none' : 'bg-primary text-on-primary shadow-[0_8px_20px_rgba(var(--color-primary),0.3)] hover:-translate-y-1 hover:shadow-primary/50 active:translate-y-0 active:scale-95'}`}
    >
      {isPending ? (
         <>
           <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
           <span>Executing Loops...</span>
         </>
      ) : "Accept Structure Parameters"}
    </button>
  );
}
