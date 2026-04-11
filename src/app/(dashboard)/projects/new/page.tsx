"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postProjectToMarketplace } from "@/app/actions/marketplace";

export default function PostProjectPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sowData, setSowData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setSowData(null);

    try {
      const response = await fetch("/api/ai/generate-sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
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

  const handlePostToMarketplace = async () => {
    setIsSaving(true);
    
    const res = await postProjectToMarketplace(sowData);
    if (res.success) {
      setToastMessage("Project Posted to Marketplace Successfully.");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } else {
      setIsSaving(false);
      alert(res.error);
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <main className="lg:p-6 min-h-[calc(100vh-80px)] flex flex-col relative">
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
                 <p className="text-xs text-on-surface-variant">Redirecting to Dashboard...</p>
              </div>
           </div>
        </div>
      )}

      <header className="mb-6 lg:mb-10 px-4 lg:px-0">
        <h2 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
          Intake <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Project Requirements</span>
        </h2>
        <p className="text-on-surface-variant font-medium mt-2 max-w-2xl">Describe your project requirements. The Expert AI will generate an institutional-grade Statement of Work and automatically post it to the open Marketplace for Expert bids.</p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 lg:px-0 pb-10">
        
        {/* Left Pane - Conversational Loop / Input */}
        <section className="lg:col-span-5 flex flex-col justify-end min-h-[400px] lg:min-h-0 bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl overflow-hidden relative">
           
           <div className="flex-1 p-8 overflow-y-auto w-full custom-scrollbar">
              {!sowData && !isGenerating && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                    <span className="material-symbols-outlined text-6xl text-primary/40 mb-4 animate-pulse duration-1000" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Awaiting Context</h3>
                    <p className="text-sm text-on-surface-variant max-w-xs">Drop your raw technical constraints and pricing expectations into the module below.</p>
                 </div>
              )}

              {prompt && (isGenerating || sowData) && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
                  <div className="self-end bg-primary/10 border border-primary/20 p-4 rounded-2xl rounded-tr-none ml-8 max-w-[90%] relative shadow-lg shadow-primary/5">
                    <p className="text-sm text-on-surface leading-relaxed text-right">{prompt}</p>
                    <span className="absolute -right-2 top-0 w-3 h-3 bg-primary/20 rounded-bl-full"></span>
                  </div>
                  
                  {(isGenerating || sowData) && (
                     <div className="self-start bg-secondary/5 border border-secondary/20 p-4 rounded-2xl rounded-tl-none mr-8 max-w-[90%] relative shadow-lg shadow-secondary/5">
                       <p className="text-sm text-on-surface leading-relaxed w-full">
                         {isGenerating 
                           ? "Processing requirements. Modeling technical architecture constraints and parsing distinct payment vectors directly into the Vercel Edge compute matrix..." 
                           : "The execution map is formally generated. Please review the Statement of Work structure defined precisely in your right panel."}
                       </p>
                       <span className="absolute -left-2 top-0 w-3 h-3 bg-secondary/20 rounded-br-full"></span>
                     </div>
                  )}
                </div>
              )}
           </div>

           {/* Sleek Input Focus Box */}
           <div className="p-6 bg-surface-container-low/80 backdrop-blur-xl border-t border-outline-variant/20 relative z-10 w-full">
              <form onSubmit={handleGenerate} className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-2xl blur-lg transition duration-500 group-focus-within:from-primary/60 group-focus-within:to-secondary/60 opacity-0 group-focus-within:opacity-100"></div>
                 <div className="relative flex items-end gap-3 bg-surface border border-outline-variant/30 focus-within:border-primary/50 transition-colors rounded-2xl p-2 shadow-inner">
                   <textarea 
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     disabled={isGenerating}
                     placeholder="e.g. 'I need a full-stack Next.js app with Tailwind for 5k, split across two phases.'"
                     className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 resize-none min-h-[80px] p-3 text-sm focus:outline-none custom-scrollbar"
                   />
                   <button 
                     type="submit" 
                     disabled={isGenerating || !prompt.trim()}
                     className={`mb-2 mr-2 p-3 rounded-xl flex items-center justify-center transition-all ${isGenerating ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-lg shadow-primary/20 hover:-translate-y-0.5'}`}
                   >
                     {isGenerating ? (
                        <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                     ) : (
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                     )}
                   </button>
                 </div>
              </form>
           </div>
        </section>

        {/* Right Pane - Formal SoW Canvas Target */}
        <section className="lg:col-span-7 bg-white dark:bg-white/[0.02] border border-outline-variant/30 rounded-3xl p-8 lg:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-surface-variant/5 relative overflow-hidden flex flex-col min-h-[500px]">
           
           <div className="absolute top-8 right-8 text-outline-variant/40 select-none pointer-events-none">
             <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 0" }}>description</span>
           </div>

           {isGenerating ? (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-2xl transition-all duration-500">
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse delay-75"></div>
                  <div className="absolute w-32 h-32 bg-secondary/30 rounded-full blur-2xl animate-pulse delay-150"></div>
                  <span className="material-symbols-outlined text-6xl text-on-surface animate-spin" style={{ animationDuration: '4s' }}>model_training</span>
                </div>
                <h3 className="text-2xl font-bold font-headline text-on-surface bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent">
                  Synthesizing Contract Vectors...
                </h3>
                <p className="text-on-surface-variant text-sm mt-3 font-medium uppercase tracking-widest text-center max-w-xs">Applying Institutional Escrow Constraints</p>
             </div>
           ) : sowData ? (
             <div className="relative z-10 w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="border-b border-outline-variant/20 pb-6 mb-8 mt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">psychology</span> 
                    AI Generated SoW
                  </p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline leading-snug">{sowData.title}</h3>
                </div>
                
                <div className="space-y-8 flex-1 overflow-y-auto pr-4 custom-scrollbar">
                   <div className="space-y-4">
                     <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg inline-block border border-outline-variant/20 shadow-inner">Executive Summary</h4>
                     <p className="text-on-surface leading-loose text-sm md:text-base font-medium opacity-90">{sowData.executiveSummary}</p>
                   </div>
                   
                   <div className="space-y-4 pt-4 pb-4">
                     <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg inline-block border border-outline-variant/20 shadow-inner">Escrow Delivery Milestones</h4>
                     <div className="space-y-3">
                       {sowData.milestones.map((m: any, idx: number) => (
                         <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-outline-variant/30 bg-surface-container-low/30 backdrop-blur-sm hover:border-primary/30 transition-all hover:bg-surface-container-high/40 gap-4">
                           <div className="flex items-start gap-4">
                             <div className="w-10 h-10 mt-1 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-[0_0_10px_var(--color-primary)]">
                               <span className="text-primary font-bold">{idx + 1}</span>
                             </div>
                             <div>
                               <span className="font-bold text-on-surface text-sm md:text-base block mb-1">{m.title}</span>
                               <span className="text-[11px] md:text-xs text-on-surface-variant font-medium opacity-80 block max-w-lg">{m.description}</span>
                             </div>
                           </div>
                           <span className="font-black text-on-surface text-lg md:text-xl tracking-tight shrink-0">{formatCurrency(m.amount)}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>

                <div className="border-t border-outline-variant/20 pt-8 mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-30 bg-surface py-2 rounded-xl">
                   <div className="shrink-0">
                     <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Total Estimated Valuation</p>
                     <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-on-surface to-on-surface-variant tracking-tighter">{formatCurrency(sowData.totalAmount)}</p>
                   </div>
                   
                   <div className="flex flex-col xl:flex-row items-center justify-end w-full md:w-auto mt-4 md:mt-0">
                     <button 
                        onClick={handlePostToMarketplace}
                        disabled={isSaving}
                        className={`w-full xl:w-auto flex justify-center items-center gap-2 px-8 py-4 rounded-xl font-bold font-headline text-sm tracking-widest uppercase transition-all duration-300 ${isSaving ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-primary text-on-primary shadow-[0_8px_20px_rgba(var(--color-primary),0.3)] hover:shadow-primary/50 hover:-translate-y-1 active:translate-y-0 active:scale-95'}`}
                     >
                       {isSaving ? (
                          <>
                           <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                           <span>Posting...</span>
                          </>
                       ) : "Post to Marketplace"}
                     </button>
                   </div>
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-outline-variant/30 text-center select-none pt-12">
                <div className="w-full max-w-md space-y-6">
                  <div className="h-6 w-3/4 bg-current rounded-full mx-auto"></div>
                  <div className="space-y-3 mt-8">
                    <div className="h-3 w-full bg-current rounded-full"></div>
                    <div className="h-3 w-full bg-current rounded-full"></div>
                    <div className="h-3 w-5/6 bg-current rounded-full mx-auto"></div>
                  </div>
                  <div className="pt-8 space-y-4 w-full">
                     <div className="h-16 w-full border-2 border-dashed border-current rounded-2xl"></div>
                     <div className="h-16 w-full border-2 border-dashed border-current rounded-2xl"></div>
                  </div>
                </div>
                <p className="mt-12 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Drafting Canvas Empty</p>
             </div>
           )}
        </section>

      </div>
    </main>
  );
}
