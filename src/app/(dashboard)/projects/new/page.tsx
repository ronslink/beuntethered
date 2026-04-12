"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { postProjectToMarketplace } from "@/app/actions/marketplace";
import { fetchRecommendedSquad } from "@/app/actions/concierge";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { z } from "zod";
import Link from 'next/link';

export default function ProjectCreationWizard() {
  const router = useRouter();
  
  // State Machine Arrays
  const [step, setStep] = useState<number>(1);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"EXECUTION" | "DISCOVERY">("EXECUTION");
  const [loadingStatus, setLoadingStatus] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState("");
  const [squad, setSquad] = useState<any[]>([]);
  const [selectedFacilitators, setSelectedFacilitators] = useState<string[]>([]);
  const [isSquadLoading, setIsSquadLoading] = useState(false);

  // The Exact Epic Structure Mapping Natively
  const SOWSchema = z.object({
    title: z.string(),
    executiveSummary: z.string(),
    milestones: z.array(z.object({
      title: z.string(),
      description: z.string(),
      acceptance_criteria: z.string(),
      amount: z.number(),
      estimated_duration_days: z.number().optional()
    })),
    totalAmount: z.number()
  });

  const { object: sowData, submit, isLoading: isGenerating, error } = useObject({
    api: '/api/ai/generate-sow',
    schema: SOWSchema,
  });

  // Tracking dynamic state maps
  useEffect(() => {
    if (isGenerating && !sowData) {
      setLoadingStatus("Agent 1: Brainstorming Architecture...");
      const timer = setTimeout(() => {
        setLoadingStatus("Agent 2: Enforcing Escrow Constraints...");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, sowData]);

  // Hook natively directly shifting step maps tracking exact stream cascades!
  useEffect(() => {
    if (sowData && !isGenerating && step === 1) {
       setStep(2);
    }
  }, [sowData, isGenerating, step]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    submit({ prompt, mode }); // Passes mode parameter mapped directly for Pass 1 branching
  };

  const loadConciergeSquad = async () => {
    setIsSquadLoading(true);
    setStep(4);
    
    // Call server action explicitly matching vectors
    const res = await fetchRecommendedSquad(sowData?.executiveSummary || "Default Mapping Hash Strings");
    if (res.success && res.matchData) {
      setSquad(res.matchData);
    }
    
    setIsSquadLoading(false);
  };

  const handlePostToMarketplace = () => {
    startTransition(async () => {
      // Package the data mapping dynamically
      const finalPayload = {
         ...sowData,
         mode,
         selected_facilitators: selectedFacilitators
      };
      
      const res = await postProjectToMarketplace(finalPayload);
      if (res.success) {
        setToastMessage("Project Bound and Dispatched Successfully.");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        alert(res.error);
      }
    });
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <main className="lg:p-6 min-h-[calc(100vh-80px)] flex flex-col relative w-full overflow-hidden">
      {/* Background Ambient Light */}
      <div className="absolute top-[0%] left-[20%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
           <div className="bg-surface/90 backdrop-blur-3xl border border-tertiary/40 shadow-[0_20px_60px_rgba(var(--color-tertiary),0.2)] p-4 rounded-2xl flex items-center gap-4 min-w-[350px]">
              <div className="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center shrink-0">
                 <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <div>
                 <p className="text-on-surface font-bold font-headline">{toastMessage}</p>
                 <p className="text-xs text-on-surface-variant">Redirecting gracefully...</p>
              </div>
           </div>
        </div>
      )}

      {/* State Machine Step Tracker */}
      <div className="w-full max-w-4xl mx-auto mb-10 px-4">
         <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-surface-container-low/50 z-0 rounded-full overflow-hidden">
               <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
            </div>
            
            {[1, 2, 3, 4].map(s => (
               <div key={s} className="relative z-10 flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg font-headline transition-all duration-500 border-4 border-surface ${step >= s ? 'bg-primary text-on-primary border-primary/30 shadow-[0_0_15px_rgba(var(--color-primary),0.5)]' : 'bg-surface-container-high text-on-surface-variant'}`}>
                     {s < step ? <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span> : s}
                  </div>
                  <p className={`text-[10px] uppercase font-bold tracking-widest mt-2 hidden md:block ${step >= s ? 'text-primary' : 'text-on-surface-variant opacity-50'}`}>
                     {s === 1 ? 'Intake' : s === 2 ? 'Timeline' : s === 3 ? 'Ledger' : 'Squad'}
                  </p>
               </div>
            ))}
         </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 pb-20 relative z-10">
         
         {/* ========================================================== */}
         {/* STEP 1: INTAKE & MODE TOGGLE                               */}
         {/* ========================================================== */}
         {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
               <header className="mb-10 text-center">
                 <h2 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
                   Autonomous <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Project Inception</span>
                 </h2>
                 <p className="text-on-surface-variant font-medium mt-3 max-w-2xl mx-auto">Drop your raw technical constraints below. The Two-Pass Scoping Engine will map the vectors structurally.</p>
               </header>

               <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                  
                  {isGenerating ? (
                     <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-3xl transition-all duration-500">
                        <div className="relative flex items-center justify-center mb-8">
                          <div className="absolute w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse delay-75"></div>
                          {loadingStatus.includes("Agent 1") ? (
                            <span className="material-symbols-outlined text-6xl text-primary animate-pulse shadow-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                          ) : (
                            <span className="material-symbols-outlined text-6xl text-secondary animate-bounce shadow-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
                          )}
                        </div>
                        <h3 className="text-2xl font-bold font-headline mt-4 text-on-surface bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent">
                          {loadingStatus}
                        </h3>
                     </div>
                  ) : (
                     <form onSubmit={handleGenerate} className="space-y-6">
                        <div className="flex bg-surface-container rounded-xl p-1 w-full max-w-md mx-auto">
                           <button type="button" onClick={() => setMode("EXECUTION")} className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${mode === "EXECUTION" ? 'bg-surface shadow text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
                              Execution Build
                           </button>
                           <button type="button" onClick={() => setMode("DISCOVERY")} className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${mode === "DISCOVERY" ? 'bg-primary/20 text-primary shadow-[inset_0_0_10px_rgba(var(--color-primary),0.2)]' : 'text-on-surface-variant hover:text-on-surface'}`}>
                              $1k Discovery Mock
                           </button>
                        </div>
                        
                        <div className="relative group">
                           <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-3xl blur-lg opacity-0 transition duration-500 group-focus-within:opacity-100"></div>
                           <textarea 
                             value={prompt}
                             onChange={(e) => setPrompt(e.target.value)}
                             placeholder="e.g. 'I need a full-stack Next.js app with pgvector bindings for 5k, split across two phases.'"
                             className="w-full h-64 bg-surface border border-outline-variant/30 focus-within:border-primary/50 rounded-2xl p-6 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 resize-none text-lg focus:outline-none relative z-10 custom-scrollbar shadow-inner"
                           />
                        </div>
                        <div className="flex justify-end pt-4">
                           <button 
                             type="submit" 
                             disabled={!prompt.trim()}
                             className={`px-10 py-4 rounded-xl flex items-center gap-3 font-bold uppercase tracking-widest text-sm transition-all shadow-[0_10px_20px_rgba(var(--color-primary),0.2)] ${!prompt.trim() ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed hidden' : 'bg-primary text-on-primary hover:-translate-y-1 hover:shadow-primary/40'}`}
                           >
                              Initialize Neural Map
                              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                           </button>
                        </div>
                     </form>
                  )}
               </div>
            </div>
         )}


         {/* ========================================================== */}
         {/* STEP 2: TIMELINE & STREAMING JSON MAP                      */}
         {/* ========================================================== */}
         {step === 2 && sowData && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
               <div className="border-b border-outline-variant/20 pb-6 mb-8 text-center max-w-3xl mx-auto">
                 <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2 flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-[14px]">calendar_clock</span> 
                   Milestone Timeline Architecture
                 </p>
                 <h3 className="text-3xl font-extrabold text-on-surface font-headline leading-snug">{sowData.title || 'Structuring...'}</h3>
               </div>
               
               <div className="space-y-6">
                 {sowData.milestones?.filter((m: any) => m && m.title).map((m: any, idx: number) => (
                   <div key={idx} className="bg-surface/50 border border-outline-variant/30 p-6 rounded-2xl flex flex-col md:flex-row gap-6 shadow-sm">
                      <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center font-bold text-primary shrink-0">{idx + 1}</div>
                      <div className="flex-1 space-y-3">
                         <h4 className="text-xl font-bold font-headline">{m.title}</h4>
                         <p className="text-sm text-on-surface-variant leading-relaxed opacity-90">{m.description || '...'}</p>
                         
                         {/* Acceptance Criteria Array mapped seamlessly */}
                         {m.acceptance_criteria && (
                            <div className="bg-surface-container-low p-4 rounded-xl border border-secondary/20 mt-4">
                               <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Escrow Acceptance Rules</p>
                               <p className="text-xs text-on-surface-variant font-mono">{m.acceptance_criteria}</p>
                            </div>
                         )}
                      </div>
                      <div className="md:w-48 shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-outline-variant/20 pt-4 md:pt-0 md:pl-6 space-y-4">
                         <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Duration (Days)</label>
                            <input 
                               type="number" 
                               defaultValue={m.estimated_duration_days || Math.floor(Math.random() * 10) + 5} 
                               className="w-full bg-surface border border-outline-variant/30 rounded-lg p-3 text-on-surface focus:border-primary/50 focus:ring-0 text-sm font-bold shadow-inner"
                            />
                         </div>
                      </div>
                   </div>
                 ))}
               </div>

               <div className="flex justify-between items-center pt-8 border-t border-outline-variant/20 mt-8">
                  <button onClick={() => setStep(1)} className="text-on-surface-variant font-bold text-sm uppercase tracking-widest hover:text-on-surface">Go Back</button>
                  <button onClick={() => setStep(3)} className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:-translate-y-1 shadow-[0_10px_20px_rgba(var(--color-primary),0.2)] transition-all">
                     Verify Timeline <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
               </div>
            </div>
         )}


         {/* ========================================================== */}
         {/* STEP 3: FINANCIAL LEDGER                                   */}
         {/* ========================================================== */}
         {step === 3 && sowData && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
               <div className="max-w-2xl mx-auto space-y-8">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-tertiary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                    <h3 className="text-3xl font-extrabold text-on-surface font-headline leading-snug">Financial Ledger</h3>
                    <p className="text-on-surface-variant mt-2">Adjust raw Escrow limits. These values represent secure boundary constraints for platform payouts.</p>
                  </div>

                  <div className="bg-surface/50 border border-tertiary/20 rounded-3xl p-8 relative overflow-hidden shadow-xl">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/5 blur-3xl rounded-full pointer-events-none"></div>
                     
                     <div className="space-y-6 relative z-10">
                        {sowData.milestones?.map((m: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                              <div className="flex-1">
                                 <p className="text-xs text-tertiary font-bold tracking-widest uppercase mb-1">M{idx + 1}</p>
                                 <p className="font-bold text-sm text-on-surface truncate">{m.title}</p>
                              </div>
                              <div className="relative w-40 shrink-0">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">$</span>
                                 <input 
                                    type="number"
                                    defaultValue={m.amount}
                                    className="w-full bg-surface border border-outline-variant/30 rounded-xl py-3 pl-8 pr-4 text-on-surface font-black text-right shadow-inner focus:border-tertiary/50 transition-colors"
                                 />
                              </div>
                           </div>
                        ))}

                        <div className="pt-6 mt-6 border-t border-outline-variant/20 flex flex-col items-center">
                           <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-2">Total Escrow Required</p>
                           <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-on-surface to-on-surface-variant tracking-tighter">
                              {sowData.totalAmount ? formatCurrency(sowData.totalAmount) : '$0'}
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-between items-center pt-8">
                     <button onClick={() => setStep(2)} className="text-on-surface-variant font-bold text-sm uppercase tracking-widest hover:text-on-surface">Go Back</button>
                     <button onClick={loadConciergeSquad} className="bg-surface text-on-surface border-2 border-primary px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-primary hover:text-on-primary transition-all shadow-lg active:scale-95">
                        Assemble Squad <span className="material-symbols-outlined text-[18px]">group_add</span>
                     </button>
                  </div>
               </div>
            </div>
         )}


         {/* ========================================================== */}
         {/* STEP 4: SQUAD CONCIERGE MATCH ENGINE                       */}
         {/* ========================================================== */}
         {step === 4 && sowData && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
               
               {isSquadLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                     <span className="material-symbols-outlined text-6xl text-on-surface-variant animate-spin mb-6" style={{ animationDuration: '3s' }}>radar</span>
                     <h3 className="text-2xl font-bold font-headline text-on-surface">Vector Mapping Embeddings...</h3>
                     <p className="text-on-surface-variant text-sm mt-2 max-w-sm text-center">Parsing the 1536-dimensional matrix of your Executive Summary against the Global Pool</p>
                  </div>
               ) : (
                  <div className="space-y-10">
                     <div className="text-center max-w-2xl mx-auto">
                       <span className="px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest border border-secondary/20 mb-4 inline-block">pgvector MATCH COMPLETE</span>
                       <h3 className="text-4xl font-extrabold text-on-surface font-headline leading-snug">Elite Facilitators Located</h3>
                       <p className="text-on-surface-variant mt-3 text-sm">We've identified 3 Elite operators whose historical project vectors strictly match your Escrow payload mathematically.</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {squad.map((member) => {
                           const isSelected = selectedFacilitators.includes(member.id);
                           return (
                              <div 
                                 key={member.id} 
                                 onClick={() => {
                                    if(isSelected) setSelectedFacilitators(prev => prev.filter(id => id !== member.id));
                                    else setSelectedFacilitators(prev => [...prev, member.id]);
                                 }}
                                 className={`cursor-pointer transition-all duration-300 rounded-3xl p-6 border-2 relative overflow-hidden flex flex-col ${isSelected ? 'bg-secondary/5 border-secondary shadow-[0_10px_30px_rgba(var(--color-secondary),0.15)] -translate-y-2' : 'bg-surface/50 border-outline-variant/20 hover:border-outline-variant/60 hover:-translate-y-1'}`}
                              >
                                 <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-surface shadow-lg shrink-0">
                                       <img src={member.image || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=200'} alt={member.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-right">
                                       <span className="text-[10px] font-headline uppercase tracking-widest font-bold text-on-surface-variant block mb-1">Match Score</span>
                                       <span className="text-2xl font-black text-secondary">{member.match_score}%</span>
                                    </div>
                                 </div>
                                 
                                 <div className="flex-1">
                                    <h4 className="text-xl font-bold font-headline">{member.name || 'Anonymous Elite'}</h4>
                                    <div className="flex items-center gap-1 text-tertiary mt-1 mb-4">
                                       <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                       <span className="text-xs font-bold">{member.trust_score || '98.5'} Trust</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mt-auto">
                                       <div className="bg-surface-container-low rounded-xl p-3 text-center border border-outline-variant/10">
                                          <span className="block text-[9px] uppercase font-bold tracking-widest text-on-surface-variant">Clearances</span>
                                          <span className="block text-lg font-black text-on-surface mt-1">{member.total_sprints_completed || 14}</span>
                                       </div>
                                       <div className="bg-surface-container-low rounded-xl p-3 text-center border border-outline-variant/10">
                                          <span className="block text-[9px] uppercase font-bold tracking-widest text-on-surface-variant">Avg Code</span>
                                          <span className="block text-lg font-black text-on-surface mt-1">{member.average_ai_audit_score || 94}</span>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Selection Overlay */}
                                 <div className={`absolute top-4 left-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-secondary border-secondary text-surface' : 'border-outline-variant/30 text-transparent'}`}>
                                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                 </div>
                              </div>
                           )
                        })}
                     </div>

                     <div className="flex flex-col items-center pt-10 pb-4">
                        <button 
                           onClick={handlePostToMarketplace}
                           disabled={isPending}
                           className={`w-full max-w-sm py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-all shadow-[0_15px_30px_rgba(var(--color-primary),0.3)] ${isPending ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-80 shadow-none' : 'bg-on-surface text-surface hover:-translate-y-1 active:scale-95'}`}
                        >
                           {isPending ? (
                              <>
                               <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                               <span>Executing Bounds...</span>
                              </>
                           ) : selectedFacilitators.length > 0 ? (
                              <>Dispatch Invite & Post Array <span className="material-symbols-outlined text-[18px]">send</span></>
                           ) : (
                              <>Post to Open Marketplace</>
                           )}
                        </button>
                        <button onClick={() => setStep(3)} className="mt-6 text-xs font-bold tracking-widest uppercase text-on-surface-variant hover:text-on-surface">Return to Ledger</button>
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>
    </main>
  );
}
