"use client";

import { useState } from "react";
import { submitMilestonePayload } from "@/app/actions/milestones";
import { useRouter } from "next/navigation";

export function FacilitatorSubmitGateway({ milestoneId }: { milestoneId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (formData: FormData) => {
    setLoading(true);
    const res = await submitMilestonePayload(formData);
    if (!res.success) {
      alert("Submission Failed: " + res.error);
    }
    setLoading(false);
  };

  return (
    <form action={handleAction} className="flex flex-col sm:flex-row items-center gap-3 bg-surface-container-low p-4 rounded-2xl border border-primary/20 w-full max-w-2xl">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input 
        type="url" 
        name="previewUrl" 
        placeholder="https://preview.vercel.app" 
        required 
        className="flex-1 px-4 py-2 bg-surface-variant/50 text-on-surface border-none rounded-xl focus:ring-2 focus:ring-primary text-sm" 
      />
      
      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
        <label className="relative cursor-pointer bg-surface-variant/30 hover:bg-surface-variant text-on-surface-variant px-5 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-colors shrink-0 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">folder_zip</span>
            Payload
            <input type="file" name="payloadZip" accept=".zip,.tar.gz" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </label>
        
        <button 
            type="submit" 
            disabled={loading}
            className={`bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-primary/20 transition-all shrink-0 ${loading ? 'opacity-50' : 'hover:-translate-y-0.5'}`}
        >
            {loading ? "Vaulting..." : "Submit Code"}
        </button>
      </div>
    </form>
  );
}

export function ClientReviewGateway({ milestoneId, previewUrl }: { milestoneId: string, previewUrl: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    if (!confirm("By approving, the Escrow funds will instantly transfer to the Facilitator, and your Encrypted Payload will permanently unlock. Proceed?")) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/release-escrow", {
        method: "POST",
        body: JSON.stringify({ milestoneId }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        alert("Escrow Released Successfully. Download URL unlocked.");
        router.refresh();
      } else {
        alert("Escrow failed: " + data.error);
      }
    } catch (e) {
      alert("Network error processing atomic swap.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-tertiary/10 p-5 rounded-2xl border border-tertiary/30 w-full max-w-2xl">
        <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-1">Staging Ready</p>
            <p className="text-sm font-medium text-on-surface">The facilitator has deployed the application. Test it thoroughly.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <a 
                href={previewUrl} 
                target="_blank" 
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all border border-outline-variant/30 shrink-0"
            >
                <span className="material-symbols-outlined text-[16px]">captive_portal</span> 
                Test App
            </a>
            
            <button 
                onClick={handleApprove}
                disabled={loading}
                className={`bg-secondary text-secondary-container-on px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-secondary/20 transition-all shrink-0 ${loading ? 'opacity-50' : 'hover:-translate-y-0.5'}`}
            >
                {loading ? "Swapping..." : "Approve & Pay"}
            </button>
        </div>
    </div>
  );
}
