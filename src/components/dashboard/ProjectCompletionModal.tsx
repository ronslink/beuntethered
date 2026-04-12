"use client";

import { useState, useTransition } from "react";
import { closeProject } from "@/app/actions/project";
import { useRouter } from "next/navigation";

export default function ProjectCompletionModal({ projectId, facilitatorId }: { projectId: string, facilitatorId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCloseProject = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
       const res = await closeProject({
          projectId,
          facilitatorId,
          rating,
          feedback
       });

       if (res.success) {
          alert("Project marked as complete!");
          setIsOpen(false);
          router.refresh();
       } else {
          alert(res.error);
       }
    });
  };

  return (
    <>
      <button 
         onClick={() => setIsOpen(true)}
         className="mt-12 w-full bg-gradient-to-r from-tertiary to-primary text-on-primary rounded-2xl py-6 font-black font-headline text-2xl tracking-tighter uppercase shadow-[0_15px_40px_rgba(var(--color-primary),0.3)] hover:shadow-[0_20px_50px_rgba(var(--color-primary),0.4)] transition-all hover:-translate-y-1 relative overflow-hidden group"
      >
         <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 rounded-2xl"></div>
         <span className="relative z-10 flex items-center justify-center gap-4">
            <span className="material-symbols-outlined text-4xl">task_alt</span>
            Complete Project & Leave Review
         </span>
      </button>

      {isOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-scrim/80 backdrop-blur-xl transition-opacity animate-in fade-in" onClick={() => !isPending && setIsOpen(false)}></div>
            
            <div className="bg-surface-container-high border border-outline-variant/30 rounded-3xl p-8 lg:p-12 w-full max-w-2xl relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
               <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>

               <h2 className="text-3xl font-black font-headline uppercase tracking-tighter text-on-surface">Algorithmic Project Closure</h2>
               <p className="text-sm text-on-surface-variant mt-2 font-medium">Your review helps other clients find great developers. The project will be marked as complete after submission.</p>

               <form onSubmit={handleCloseProject} className="mt-8 space-y-8">
                  
                  {/* Rating Selector */}
                  <div>
                     <label className="text-xs uppercase font-bold tracking-widest text-on-surface-variant block mb-4">Client Experience Evaluation</label>
                     <div className="flex items-center gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                           <button 
                              key={star} 
                              type="button" 
                              onClick={() => setRating(star)} 
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform ${rating >= star ? 'bg-tertiary/20 text-tertiary shadow-[0_0_20px_rgba(var(--color-tertiary),0.3)] scale-110' : 'bg-surface-variant/30 text-outline-variant hover:bg-surface-variant/50'}`}
                           >
                              <span className="material-symbols-outlined" style={{ fontVariationSettings: rating >= star ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                           </button>
                        ))}
                        <span className="ml-4 text-xl font-black text-on-surface">{rating}.0</span>
                     </div>
                  </div>

                  {/* Feedback Textarea */}
                  <div>
                     <label className="text-xs uppercase font-bold tracking-widest text-on-surface-variant block mb-2">Executive Feedback</label>
                     <textarea 
                        required
                        placeholder="Rate the developer on quality, communication, and speed..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full h-32 bg-surface-container border border-outline-variant/30 rounded-xl p-4 text-on-surface placeholder:text-outline-variant/50 focus:border-tertiary/50 focus:ring-1 focus:ring-tertiary/50 transition-all font-medium text-sm resize-none custom-scrollbar"
                     ></textarea>
                  </div>

                  <div className="flex items-center justify-end gap-4 pt-6 border-t border-outline-variant/30">
                     <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50">Cancel Null</button>
                     <button type="submit" disabled={isPending} className="bg-gradient-to-r from-tertiary to-tertiary-container hover:scale-105 transition-all text-on-tertiary rounded-xl px-8 py-3.5 font-black uppercase tracking-widest text-sm shadow-[0_8px_20px_rgba(var(--color-tertiary),0.3)] flex items-center gap-2">
                        {isPending ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Complete & Publish Review'}
                     </button>
                  </div>

               </form>
            </div>
         </div>
      )}
    </>
  );
}
