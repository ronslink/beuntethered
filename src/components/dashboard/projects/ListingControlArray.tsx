"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelOpenListing, editProjectSow } from "@/app/actions/listing";

export default function ListingControlArray({ 
   projectId, 
   initialSow 
}: { 
   projectId: string, 
   initialSow: string 
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [sowDraft, setSowDraft] = useState(initialSow);
  
  // States
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const handleCancel = async () => {
     if (!confirm("WARNING: Archiving this listing will permanently remove it from the Marketplace and instantly sever all Developer proposals. This action cannot be reversed. Proceed?")) return;
     
     setLoadingCancel(true);
     try {
        const res = await cancelOpenListing(projectId);
        if (res.success) {
           alert("Listing Archived. It has been securely removed from the Marketplace.");
           router.refresh();
           router.push("/dashboard");
        } else {
           alert("Failed to cancel listing: " + res.error);
        }
     } catch (e: any) {
        alert("Network fault attempting to terminate Escrow bounds.");
     }
     setLoadingCancel(false);
  };

  const handleSaveEdit = async () => {
     if (sowDraft === initialSow) {
        setIsEditing(false);
        return;
     }

     if (!confirm("WARNING: Modifying the Scope of Work (SOW) fundamentally changes the contract parameters. To protect developers, executing this action will instantly DELETE all currently submitted bids. Are you sure you want to alter the scope?")) return;

     setLoadingEdit(true);
     try {
        const res = await editProjectSow(projectId, sowDraft);
        if (res.success) {
           setIsEditing(false);
           router.refresh();
        } else {
           alert("Failed to edit scope: " + res.error);
        }
     } catch (e: any) {
        alert("Network fault attempting to execute SOW replacement.");
     }
     setLoadingEdit(false);
  };

  if (isEditing) {
     return (
        <div className="bg-surface/50 backdrop-blur-2xl border border-secondary/40 rounded-3xl p-8 shadow-[0_0_20px_rgba(var(--color-secondary),0.1)] relative overflow-hidden mb-12">
            <h3 className="text-xl font-bold font-headline mb-4 flex items-center gap-2 text-on-surface">
                 <span className="material-symbols-outlined text-secondary">edit_document</span>
                 Warning: Editing Contract Scope
            </h3>
            <p className="text-sm font-medium text-secondary mb-4 p-4 bg-secondary/10 border border-secondary/20 rounded-xl">Altering these base metrics will securely purge all pre-existing bids to ensure complete Escrow safety.</p>
            
            <textarea 
               className="w-full bg-surface-container-low text-sm font-medium text-on-surface p-6 rounded-2xl border border-outline-variant/30 min-h-[300px] mb-6 focus:ring-2 focus:ring-secondary focus:border-transparent outline-none custom-scrollbar"
               value={sowDraft}
               onChange={(e) => setSowDraft(e.target.value)}
            />

            <div className="flex gap-4 items-center">
               <button 
                  onClick={() => setIsEditing(false)}
                  disabled={loadingEdit}
                  className="px-6 py-2.5 rounded-xl text-on-surface-variant font-bold uppercase tracking-widest text-xs hover:bg-surface-variant transition-colors"
               >
                  Cancel Edit
               </button>
               <button 
                  onClick={handleSaveEdit}
                  disabled={loadingEdit || sowDraft.trim() === ""}
                  className={`bg-secondary text-secondary-container-on px-8 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-secondary/20 transition-all ${loadingEdit ? 'opacity-50' : 'hover:-translate-y-0.5'}`}
               >
                  {loadingEdit ? "Securing Limits..." : "Commit SOW Edit"}
               </button>
            </div>
        </div>
     );
  }

  return (
    <div className="flex gap-4 items-center bg-surface-container-low border border-outline-variant/30 p-4 rounded-2xl w-full justify-between lg:justify-start">
        <p className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Listing Controls:</p>
        <div className="flex gap-3 items-center w-full md:w-auto">
            <button 
                onClick={() => setIsEditing(true)}
                className="flex-1 md:flex-none border border-outline-variant/30 text-on-surface hover:text-on-surface px-5 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:border-primary/50 transition-all flex items-center justify-center gap-2 bg-surface"
            >
               <span className="material-symbols-outlined text-[14px]">edit_note</span> Edit Scope
            </button>
            
            <button 
                onClick={handleCancel}
                disabled={loadingCancel}
                className={`flex-1 md:flex-none border border-error/30 text-error hover:bg-error hover:text-error-container-on px-5 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 bg-error/5 ${loadingCancel ? 'opacity-50' : ''}`}
            >
               <span className="material-symbols-outlined text-[14px]">delete_forever</span> 
               {loadingCancel ? "Pulling..." : "Archive Listing"}
            </button>
        </div>
    </div>
  );
}
