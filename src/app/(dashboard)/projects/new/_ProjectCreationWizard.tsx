"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { postProjectToMarketplace } from "@/app/actions/marketplace";
import { fetchRecommendedSquad } from "@/app/actions/concierge";
import Link from 'next/link';

export default function ProjectCreationWizard() {
  const router = useRouter();
  
  // State Machine Arrays
  const [step, setStep] = useState<number>(1);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"EXECUTION" | "DISCOVERY">("EXECUTION");
  const [desiredTimeline, setDesiredTimeline] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sowData, setSowData] = useState<any>(null);
  
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState("");
  const [squad, setSquad] = useState<any[]>([]);
  const [selectedFacilitators, setSelectedFacilitators] = useState<string[]>([]);
  const [isSquadLoading, setIsSquadLoading] = useState(false);

  // Mutator to structurally lock down edits natively overwriting stream states
  const [editableSoW, setEditableSoW] = useState<any>(null);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [biddingClosesAt, setBiddingClosesAt] = useState<string>(() => {
    // Default: 7 days from today
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (sowData && !isGenerating) {
       // Normalize: ensure each milestone has a deliverables array
       const normalized = {
         ...sowData,
         milestones: (sowData.milestones || []).map((m: any) => ({
           ...m,
           estimated_duration_days: m.estimated_duration_days || 14,
           deliverables: m.deliverables && Array.isArray(m.deliverables) 
             ? m.deliverables 
             : m.description 
               ? m.description.split(/[.;]\s*/).filter((s: string) => s.trim().length > 3).slice(0, 4)
               : ['Core deliverable']
         }))
       };
       setEditableSoW(normalized);
    }
  }, [sowData, isGenerating]);

  // Tracking dynamic state maps
  useEffect(() => {
    if (isGenerating && !sowData) {
      setLoadingStatus("Agent 1: Brainstorming Architecture...");
      const timer = setTimeout(() => {
        setLoadingStatus("Agent 2: Creating payment milestones...");
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

  const updateSoWField = (field: string, value: string) => {
    if (!editableSoW) return;
    setEditableSoW({ ...editableSoW, [field]: value });
  };

  const updateMilestoneField = (index: number, field: string, value: string | number) => {
    if (!editableSoW) return;
    const newMilestones = [...editableSoW.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    
    // Recalc total if amount changed
    if (field === 'amount') {
      const newTotal = newMilestones.reduce((acc: number, m: any) => acc + (Number(m.amount) || 0), 0);
      setEditableSoW({ ...editableSoW, milestones: newMilestones, totalAmount: newTotal });
    } else {
      setEditableSoW({ ...editableSoW, milestones: newMilestones });
    }
  };

  const updateDeliverable = (milestoneIdx: number, deliverableIdx: number, value: string) => {
    if (!editableSoW) return;
    const newMilestones = [...editableSoW.milestones];
    const newDeliverables = [...newMilestones[milestoneIdx].deliverables];
    newDeliverables[deliverableIdx] = value;
    newMilestones[milestoneIdx] = { ...newMilestones[milestoneIdx], deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const addDeliverable = (milestoneIdx: number) => {
    if (!editableSoW) return;
    const newMilestones = [...editableSoW.milestones];
    const newDeliverables = [...newMilestones[milestoneIdx].deliverables, ""];
    newMilestones[milestoneIdx] = { ...newMilestones[milestoneIdx], deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const removeDeliverable = (milestoneIdx: number, deliverableIdx: number) => {
    if (!editableSoW) return;
    const newMilestones = [...editableSoW.milestones];
    const newDeliverables = newMilestones[milestoneIdx].deliverables.filter((_: any, i: number) => i !== deliverableIdx);
    newMilestones[milestoneIdx] = { ...newMilestones[milestoneIdx], deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setSowData(null);
    setEditableSoW(null);
    setActivePhaseIndex(0);

    try {
      const response = await fetch("/api/ai/generate-sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode, desiredTimeline }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSowData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadConciergeSquad = async () => {
    setIsSquadLoading(true);
    setStep(4);
    
    // Call server action explicitly matching vectors
    const res = await fetchRecommendedSquad(editableSoW?.executiveSummary || "General project summary.");
    if (res.success && res.matchData) {
      setSquad(res.matchData);
    }
    
    setIsSquadLoading(false);
  };

  const handleSkipAndPostToMarketplace = () => {
    startTransition(async () => {
      const finalPayload = {
         ...(editableSoW || sowData),
         mode,
         selected_facilitators: [],
         biddingClosesAt,
      };
      
      const res = await postProjectToMarketplace(finalPayload);
      if (res.success) {
        setToastMessage("Creating project and redirecting to payment...");
        setTimeout(() => {
          router.push(`/stripe/checkout?projectId=${res.projectId}`);
        }, 2000);
      } else {
        alert(res.error);
      }
    });
  }

  const handlePostToMarketplace = () => {
    startTransition(async () => {
      // Package the data mapping dynamically
      const finalPayload = {
         ...(editableSoW || sowData),
         mode,
         selected_facilitators: selectedFacilitators,
         biddingClosesAt,
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
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-5rem)] flex flex-col relative overflow-hidden">
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

      <div className="flex-1 w-full mx-auto pb-32 relative z-10">
         
         {/* ========================================================== */}
         {/* STEP 1: INTAKE & MODE TOGGLE                               */}
         {/* ========================================================== */}
         {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
               <header className="mb-10 text-center">
                 <h2 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
                   Autonomous <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Project Inception</span>
                 </h2>
                 <p className="text-on-surface-variant font-medium mt-3 max-w-2xl mx-auto">Enter your project requirements below. Our AI will create a detailed project scope for you.</p>
               </header>

               <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 shadow-xl relative overflow-hidden max-w-4xl mx-auto min-h-[500px]">
                  
                  {isGenerating && (
                     <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-md transition-all duration-500">
                        <div className="relative flex items-center justify-center mb-8">
                          <div className="absolute w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse delay-75"></div>
                          {loadingStatus.includes("Agent 1") ? (
                            <span className="material-symbols-outlined text-6xl text-primary animate-pulse shadow-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                          ) : (
                            <span className="material-symbols-outlined text-6xl text-secondary animate-bounce shadow-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
                          )}
                        </div>
                        <h3 className="text-2xl font-bold font-headline mt-4 text-on-surface bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent px-8 text-center leading-relaxed">
                          {loadingStatus}
                        </h3>
                     </div>
                  )}

                  <form onSubmit={handleGenerate} className={`space-y-6 transition-all duration-500 ${isGenerating ? 'opacity-0 scale-95 blur-md select-none pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
                        <div className="flex bg-surface-container rounded-xl p-1 w-full max-w-md mx-auto mb-6">
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
                             className="w-full h-[400px] bg-surface border border-outline-variant/30 focus-within:border-primary/50 rounded-2xl p-8 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 resize-none text-lg lg:text-xl focus:outline-none relative z-10 custom-scrollbar shadow-inner leading-relaxed"
                           />
                        </div>

                        {/* Timeline / Deadline Input */}
                        <div className="flex flex-col md:flex-row gap-4">
                           <div className="flex-1 relative">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">schedule</span> Desired Timeline</span>
                              </label>
                              <input 
                                 type="text" 
                                 value={desiredTimeline}
                                 onChange={(e) => setDesiredTimeline(e.target.value)}
                                 placeholder="e.g. '2 weeks', '30 days', 'by June 15th'"
                                 className="w-full bg-surface border border-outline-variant/30 focus:border-primary/50 rounded-xl p-4 text-on-surface text-sm focus:ring-0 focus:outline-none relative z-10 shadow-inner placeholder:text-on-surface-variant/40"
                              />
                           </div>
                           {mode === "DISCOVERY" && (
                              <div className="flex-1 flex items-end">
                                 <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4">
                                    <p className="text-xs text-primary font-bold">Discovery Mode locks to a 7-day architecture sprint at $1,000.</p>
                                 </div>
                              </div>
                           )}
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
               </div>
            </div>
         )}


         {/* ========================================================== */}
         {/* STEP 2: INTERACTIVE TIMELINE & MODULAR FEATURE CANVAS       */}
         {/* ========================================================== */}
         {step === 2 && editableSoW && (() => {
            const milestones = editableSoW.milestones?.filter((m: any) => m && m.title) || [];
            const totalDays = milestones.reduce((acc: number, m: any) => acc + (Number(m.estimated_duration_days) || 0), 0);
            const phaseColors = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-tertiary)', '#f59e0b', '#10b981', '#8b5cf6'];

            return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-28">
               {/* Elastic Scrolling Container */}
               <div className="w-full min-h-[600px] max-h-[80vh] overflow-y-auto custom-scrollbar pr-4 space-y-8">
                  {/* Header â€” Editable Title & Summary */}
                  <div className="border-b border-outline-variant/20 pb-6 text-center max-w-3xl mx-auto space-y-3">
                 <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2 flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-[14px]">calendar_clock</span> 
                   {activePhaseIndex < milestones.length ? `Phase ${activePhaseIndex + 1} Editor` : 'Master Timeline Canvas'}
                 </p>
                 <input 
                    type="text" 
                    value={editableSoW.title || ''}
                    onChange={(e) => updateSoWField('title', e.target.value)}
                    className="text-3xl font-extrabold text-on-surface font-headline leading-snug bg-transparent border-b-2 border-transparent hover:border-outline-variant/30 focus:border-primary/50 text-center w-full focus:outline-none transition-colors"
                    placeholder="Project Title"
                 />
                 <textarea 
                    value={editableSoW.executiveSummary || ''}
                    onChange={(e) => updateSoWField('executiveSummary', e.target.value)}
                    rows={6}
                    className="text-base text-slate-200 leading-loose w-full bg-transparent border border-transparent hover:border-outline-variant/20 focus:border-primary/30 rounded-lg p-2 text-center resize-none focus:outline-none focus:ring-0 transition-colors custom-scrollbar"
                    placeholder="Executive summary..."
                 />
               </div>

               {activePhaseIndex === milestones.length ? (
                 <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
                   {/* ===== MASTER TIMELINE REVIEW (GANTT CHART) ===== */}
                   <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl p-8 relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/5 blur-3xl rounded-full pointer-events-none"></div>
                      
                      <div className="flex items-center justify-between mb-8 relative z-10">
                         <div>
                           <h3 className="text-xl font-bold font-headline text-on-surface">Timeline Aggregate Review</h3>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{milestones.length} Phases Parsed</p>
                         </div>
                         <div className="text-right">
                           <p className="text-3xl font-black text-secondary">{totalDays} <span className="text-sm text-on-surface-variant font-bold">Days</span></p>
                         </div>
                      </div>

                      <div className="space-y-3 relative z-10">
                         {(() => {
                            let currentStartDays = 0;
                            return milestones.map((m: any, idx: number) => {
                               const days = Number(m.estimated_duration_days) || 0;
                               const widthPct = totalDays > 0 ? (days / totalDays) * 100 : 100 / milestones.length;
                               const leftOffsetPct = totalDays > 0 ? (currentStartDays / totalDays) * 100 : idx * (100 / milestones.length);
                               const color = phaseColors[idx % phaseColors.length];
                               
                               currentStartDays += days;
                               
                               return (
                                  <div key={idx} className="flex items-center gap-4 group">
                                     <span className="text-xs font-bold text-on-surface-variant w-8 shrink-0 text-right">P{idx + 1}</span>
                                     <div className="flex-1 h-12 bg-surface-container-low rounded-xl relative border border-outline-variant/10 shadow-inner overflow-hidden">
                                        <div 
                                           className="h-full rounded-xl flex items-center px-4 transition-all duration-500 ease-out absolute top-0 bottom-0 min-w-fit z-10 hover:z-20 hover:scale-[1.01] shadow-md cursor-default"
                                           style={{ left: `${leftOffsetPct}%`, width: `${widthPct}%`, backgroundColor: color, opacity: 0.9 }}
                                        >
                                           <span className="text-xs font-black text-white whitespace-nowrap drop-shadow-md">
                                              {m.title} â€” {days}d
                                           </span>
                                        </div>
                                     </div>
                                  </div>
                               );
                            });
                         })()}
                      </div>

                      {/* Day markers */}
                      <div className="flex justify-between mt-6 px-12 relative z-10">
                         <span className="text-[10px] text-on-surface-variant font-bold">Day 0</span>
                         {totalDays > 0 && <span className="text-[10px] text-on-surface-variant font-bold">Day {Math.round(totalDays / 2)}</span>}
                         <span className="text-[10px] text-on-surface-variant font-bold">Day {totalDays}</span>
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
                   {/* ===== FOCUS PHASE EDITOR ===== */}
                   {(() => {
                      const idx = activePhaseIndex;
                      const m = milestones[idx] || {};
                      const color = phaseColors[idx % phaseColors.length];
                      return (
                        <div className="bg-surface/50 border border-outline-variant/30 rounded-3xl overflow-hidden shadow-xl">
                           <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 p-8 border-b border-outline-variant/20 relative" style={{ borderTopWidth: '4px', borderTopColor: color }}>
                              <div className="absolute top-0 right-0 w-32 h-32 blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: color }}></div>
                              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-inner z-10 border border-white/5" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                                 {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0 space-y-3 z-10">
                                 <input 
                                    type="text" 
                                    value={m.title || ''}
                                    onChange={(e) => updateMilestoneField(idx, 'title', e.target.value)}
                                    className="text-2xl lg:text-3xl font-black font-headline text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary/50 w-full focus:outline-none transition-colors"
                                    placeholder="Phase title"
                                 />
                                 <textarea 
                                    value={m.description || ''}
                                    onChange={(e) => updateMilestoneField(idx, 'description', e.target.value)}
                                    rows={2}
                                    className="w-full resize-none overflow-hidden text-wrap break-words text-sm text-slate-300 leading-relaxed bg-transparent border-b border-transparent hover:border-outline-variant/20 focus:border-primary/30 py-1 focus:outline-none transition-colors"
                                    placeholder="Phase description..."
                                 />
                              </div>
                              <div className="shrink-0 w-32 md:w-40 z-10">
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Duration Extent</label>
                                 <div className="flex items-center relative">
                                    <input 
                                       type="number" min={1}
                                       value={m.estimated_duration_days || ''} 
                                       onChange={(e) => updateMilestoneField(idx, 'estimated_duration_days', Number(e.target.value))}
                                       className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 text-on-surface focus:border-primary/50 focus:ring-0 text-xl font-black shadow-inner pr-12 transition-colors"
                                    />
                                    <span className="absolute right-4 text-sm font-bold text-on-surface-variant pointer-events-none">Days</span>
                                 </div>
                              </div>
                           </div>
                        
                           <div className="p-8 space-y-6 bg-surface-container-lowest">
                              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                                 <span className="material-symbols-outlined text-[18px]">rule_folder</span>
                                 Deliverables & Features Space ({m.deliverables?.length || 0})
                              </p>
                              
                              <div className="space-y-4">
                                 {m.deliverables?.map((d: string, dIdx: number) => (
                                    <div key={dIdx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 group/item animate-in fade-in slide-in-from-bottom-2 duration-300 p-2 rounded-xl hover:bg-surface-container-low transition-colors">
                                       <span className="w-8 h-8 rounded-lg bg-surface border border-outline-variant/20 flex items-center justify-center shrink-0 shadow-sm">
                                          <span className="material-symbols-outlined text-[16px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>done_all</span>
                                       </span>
                                       <textarea 
                                          value={d}
                                          onChange={(e) => updateDeliverable(idx, dIdx, e.target.value)}
                                          rows={2}
                                          placeholder="Describe this feature output..."
                                          className="flex-1 w-full resize-none overflow-hidden text-wrap break-words bg-transparent border border-transparent hover:border-outline-variant/30 focus:border-primary/50 focus:bg-surface rounded-xl p-3 text-base text-slate-200 focus:ring-0 focus:outline-none transition-all shadow-sm placeholder:text-on-surface-variant/40"
                                       />
                                       <button 
                                          onClick={() => removeDeliverable(idx, dIdx)}
                                          className="w-10 h-10 rounded-xl flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity bg-error/10 text-error hover:bg-error hover:text-white"
                                          title="Remove feature"
                                       >
                                          <span className="material-symbols-outlined text-[20px]">delete</span>
                                       </button>
                                    </div>
                                 ))}
                              </div>
                              
                              <button 
                                 onClick={() => addDeliverable(idx)}
                                 className="w-full mt-4 py-4 rounded-xl border-2 border-dashed border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                              >
                                 <span className="material-symbols-outlined text-[20px]">add</span>
                                 Add Dedicated Feature Vector
                              </button>
                           </div>

                           <div className="p-8 border-t border-outline-variant/20 bg-surface/30">
                              <div className="bg-surface-container p-5 rounded-2xl border border-secondary/20 shadow-inner">
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">verified_user</span> Milestone Review Matrix</p>
                                 <textarea 
                                    value={m.acceptance_criteria || ''}
                                    onChange={(e) => updateMilestoneField(idx, 'acceptance_criteria', e.target.value)}
                                    rows={3}
                                    className="w-full text-sm text-slate-300 leading-relaxed bg-transparent border border-transparent hover:border-outline-variant/20 focus:border-secondary/40 focus:bg-surface rounded-xl p-3 focus:outline-none resize-none transition-all shadow-sm"
                                    placeholder="Define acceptance criteria for this milestone..."
                                 />
                              </div>
                           </div>
                        </div>
                      );
                   })()}
                 </div>
               )}
            </div>
          </div>
        );
      })()}


         {/* ========================================================== */}
         {/* STEP 3: FINANCIAL LEDGER                                   */}
         {/* ========================================================== */}
         {step === 3 && (editableSoW || sowData) && (() => {
            const milestones = (editableSoW || sowData).milestones || [];
            const totalEscrow = milestones.reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

            return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-28">
               <div className="max-w-4xl mx-auto space-y-8">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-tertiary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                    <h3 className="text-4xl font-extrabold text-on-surface font-headline leading-snug">Financial Ledger</h3>
                    <p className="text-on-surface-variant mt-3 text-lg">Adjust milestone amounts. These values represent the payment for each phase.</p>
                  </div>

                  <div className="bg-surface/50 border border-tertiary/20 rounded-3xl p-8 relative overflow-hidden shadow-xl">
                     <div className="absolute top-0 right-0 w-96 h-96 bg-tertiary/5 blur-3xl rounded-full pointer-events-none"></div>
                     
                     <div className="space-y-6 relative z-10">
                        {milestones.map((m: any, idx: number) => (
                           <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-colors">
                              <div className="flex-1 space-y-2">
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
                                      <span className="text-primary font-black text-xs">{idx + 1}</span>
                                   </div>
                                   <p className="font-black text-lg text-on-surface">{m.title}</p>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface border border-outline-variant/20 px-2 py-1 rounded hidden sm:block">{m.estimated_duration_days || 0} Days</span>
                                 </div>
                                 <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 md:pl-11 opacity-80">{m.description || 'No technical summary provided.'}</p>
                              </div>
                              <div className="relative w-full md:w-56 shrink-0 md:pl-0 pl-11">
                                 <label className="text-[10px] uppercase font-bold tracking-widest text-secondary block mb-2">AI Recommended Price</label>
                                 <div className="relative">
                                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-lg pointer-events-none">$</span>
                                   <input 
                                      type="number"
                                      value={m.amount || ''}
                                      onChange={(e) => updateMilestoneField(idx, 'amount', Number(e.target.value))}
                                      className="w-full bg-surface border-2 border-outline-variant/20 hover:border-primary/40 focus:border-primary rounded-xl py-4 pl-10 pr-4 text-on-surface font-black text-right shadow-inner text-xl transition-all outline-none focus:ring-4 focus:ring-primary/10"
                                   />
                                 </div>
                              </div>
                           </div>
                        ))}


                        {/* Bidding Window Deadline */}
                        <div className={mt-6 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5}>
                          <div className={lex flex-col md:flex-row md:items-center gap-4}>
                            <div className={lex items-center gap-2}>
                              <span className={material-symbols-outlined text-primary text-[20px]}>timer</span>
                              <div>
                                <p className={	ext-[10px] font-black uppercase tracking-widest text-on-surface}>Bidding Window</p>
                                <p className={	ext-xs text-on-surface-variant font-medium mt-0.5}>Facilitators must submit proposals before this date</p>
                              </div>
                            </div>
                            <div className={lex items-center gap-2 ml-auto flex-wrap}>
                              {[3, 7, 14].map(n => {
                                const d = new Date(); d.setDate(d.getDate() + n);
                                const val = d.toISOString().split('T')[0];
                                return (
                                  <button key={n} type='button' onClick={() => setBiddingClosesAt(val)}
                                    className={px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors  + (biddingClosesAt === val ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-primary')}>{n}d</button>
                                );
                              })}
                              <input type='date' value={biddingClosesAt}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setBiddingClosesAt(e.target.value)}
                                className='bg-surface border border-outline-variant/30 rounded-xl px-3 py-2 text-sm font-bold text-on-surface outline-none focus:border-primary transition-colors cursor-pointer' />
                            </div>
                          </div>
                        </div>

                        <div className="pt-8 mt-8 border-t border-outline-variant/20 flex flex-col items-center bg-surface-container-lowest -mx-8 -mb-8 p-10">
                           <p className="text-sm text-secondary uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">verified_user</span> Total Project Cost
                           </p>
                           <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-on-surface to-on-surface-variant tracking-tighter">
                              {formatCurrency(totalEscrow)}
                           </p>
                        </div>
                     </div>
                   </div>
                </div>
             </div>
             );
          })()}


         {/* ========================================================== */}
         {/* STEP 4: SQUAD CONCIERGE MATCH ENGINE                       */}
         {/* ========================================================== */}
         {step === 4 && (editableSoW || sowData) && (
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
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-4 inline-block ${squad.length > 0 ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-surface-variant/20 text-on-surface-variant border-outline-variant/30'}`}>pgvector MATCH COMPLETE</span>
                       <h3 className="text-4xl font-extrabold text-on-surface font-headline leading-snug">
                         {squad.length > 0 ? 'Elite Facilitators Located' : 'No Immediate Match Found'}
                       </h3>
                       <p className="text-on-surface-variant mt-3 text-sm">
                         {squad.length > 0 
                           ? `We've found recommended developers that match your project.`
                           : `Your unique constraint matrix returned no available matching Elite engineers in the exclusive pool. You can still dispatch this to the Open Marketplace to gather external bids.`}
                       </p>
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
                  </div>
               )}
            </div>
         )}
      </div>

      {/* ===== UNIVERSAL STICKY FOOTER ===== */}
      {step > 1 && (
         <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md border-t border-outline-variant/30 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
               <button 
                  onClick={() => {
                     if (step === 2 && activePhaseIndex > 0) setActivePhaseIndex(activePhaseIndex - 1);
                     else setStep(step - 1);
                  }} 
                  className="text-on-surface-variant font-bold text-sm uppercase tracking-widest hover:text-on-surface transition-colors flex items-center gap-1.5"
               >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span> 
                  {step === 2 && activePhaseIndex > 0 ? "Previous Phase" : "Go Back"}
               </button>
               
               <div className="flex items-center gap-4">
                  {step === 2 && activePhaseIndex < (editableSoW?.milestones?.length || 0) && (
                     <button 
                        onClick={() => setActivePhaseIndex(activePhaseIndex + 1)} 
                        className="bg-primary text-on-primary px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:-translate-y-1 transition-all shadow-lg active:scale-95"
                     >
                        {activePhaseIndex === (editableSoW?.milestones?.length || 0) - 1 ? 'Review Master Timeline' : 'Next Phase'} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                     </button>
                  )}
                  {step === 2 && activePhaseIndex === (editableSoW?.milestones?.length || 0) && (
                     <button 
                        onClick={() => setStep(3)} 
                        className="bg-on-surface text-surface px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:-translate-y-1 transition-all shadow-lg active:scale-95"
                     >
                        Approve Timeline & Set Pricing <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                     </button>
                  )}
                  {step === 3 && (
                     <>
                        <button 
                           onClick={handleSkipAndPostToMarketplace}
                           disabled={isPending}
                           className={`bg-transparent border-2 border-outline-variant/30 text-on-surface-variant px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-2 ${isPending ? 'opacity-80 cursor-not-allowed' : 'hover:border-primary/50 hover:text-primary hover:bg-primary/5 active:scale-95'}`}
                        >
                           Skip & Post to Open Market
                        </button>
                        <button 
                           onClick={() => {
                              // Wrap loadConciergeSquad trigger via setStep proxy
                              setStep(4);
                              loadConciergeSquad();
                           }} 
                           className="bg-primary text-on-primary px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:-translate-y-1 transition-all shadow-[0_15px_30px_rgba(var(--color-primary),0.3)] active:scale-95"
                        >
                           Next: AI Squad Assembly <span className="material-symbols-outlined text-[18px]">group_add</span>
                        </button>
                     </>
                  )}
                  {step === 4 && (
                     <button 
                        onClick={handlePostToMarketplace}
                        disabled={isPending}
                        className={`px-8 py-4 rounded-xl flex items-center gap-3 font-black text-sm uppercase tracking-widest transition-all shadow-[0_15px_30px_rgba(var(--color-primary),0.3)] ${isPending ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-80 shadow-none' : 'bg-on-surface text-surface hover:-translate-y-1 active:scale-95'}`}
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
                  )}
               </div>
            </div>
         </div>
      )}
    </main>
  );
}
