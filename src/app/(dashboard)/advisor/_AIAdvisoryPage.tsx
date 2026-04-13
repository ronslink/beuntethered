"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProjectFromSoW } from "@/app/actions/project";

export default function AIAdvisoryPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sowData, setSowData] = useState<any>(null);
  
  // Validation loop
  const [clientEmail, setClientEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (isGenerating && !sowData) {
      setLoadingStatus("Agent 1: Architecting baseline structure...");
      const timer = setTimeout(() => {
        setLoadingStatus("Agent 2: Creating payment milestones...");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, sowData]);

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

  const handleApproveProject = () => {
    if (!clientEmail || !clientEmail.includes('@')) return;
    
    startTransition(async () => {
      const res = await createProjectFromSoW({ sowData, clientEmail });
      if (res.success) {
        setToastMessage("Project Created. Magic Link generated for client.");
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
    <main className="lg:p-6 min-h-full flex flex-col relative pb-20">
      <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-surface/90 backdrop-blur-2xl border border-tertiary/30 shadow-2xl p-4 rounded-2xl flex items-center gap-3 min-w-[320px]">
            <div className="w-9 h-9 rounded-full bg-tertiary/15 flex items-center justify-center shrink-0 border border-tertiary/30">
              <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <p className="text-on-surface font-bold text-sm">{toastMessage}</p>
              <p className="text-xs text-on-surface-variant">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      )}

      <header className="mb-6 px-4 lg:px-0 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">AI Advisor</p>
        <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
          SoW Generator
        </h1>
        <p className="text-on-surface-variant font-medium mt-2 text-sm max-w-2xl">Describe your project. The AI generates a professional Scope of Work with milestones and pricing — ready to send to your client.</p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 lg:px-0 pb-10">
        
        {/* Left Pane - Conversational Loop / Input */}
        <section className="lg:col-span-5 flex flex-col justify-end min-h-[400px] lg:min-h-0 bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl overflow-hidden relative">
           
           <div className="flex-1 p-8 overflow-y-auto w-full custom-scrollbar">
              {!sowData && !isGenerating && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                    <span className="material-symbols-outlined text-6xl text-primary/40 mb-4 animate-pulse duration-1000" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Awaiting Context</h3>
                    <p className="text-sm text-on-surface-variant max-w-xs">Enter your project requirements and what you are looking to build below.</p>
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
                           ? "Processing your requirements and creating project milestones..." 
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
              <div className="flex flex-wrap gap-2 mb-4">
                 <button type="button" onClick={() => setPrompt("I am building a new web application. The core features I need are: [List features here]. My rough budget is [Budget] and I need it by [Timeline].")} className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full bg-surface/50 border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors">API Integration</button>
                 <button type="button" onClick={() => setPrompt("I am building a new web application. The core features I need are: [List features here]. My rough budget is [Budget] and I need it by [Timeline].")} className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full bg-surface/50 border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors">New App MVP</button>
                 <button type="button" onClick={() => setPrompt("I am building a new web application. The core features I need are: [List features here]. My rough budget is [Budget] and I need it by [Timeline].")} className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full bg-surface/50 border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors">Figma to Code</button>
              </div>
              <form onSubmit={handleGenerate} className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-2xl blur-lg transition duration-500 group-focus-within:from-primary/60 group-focus-within:to-secondary/60 opacity-0 group-focus-within:opacity-100"></div>
                 <div className="relative flex items-end gap-3 bg-surface border border-outline-variant/30 focus-within:border-primary/50 transition-colors rounded-2xl p-2 shadow-inner">
                   <textarea 
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     disabled={isGenerating}
                     placeholder="e.g., I need a Next.js landing page with Stripe checkout. I have Figma designs ready. Budget is around $2k."
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

           {!sowData && isGenerating ? (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-2xl transition-all duration-500">
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse delay-75"></div>
                  <div className="absolute w-32 h-32 bg-secondary/30 rounded-full blur-2xl animate-pulse delay-150"></div>
                  
                  {loadingStatus.includes("Agent 1") ? (
                    <span className="material-symbols-outlined text-6xl text-primary animate-pulse shadow-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  ) : (
                    <span className="material-symbols-outlined text-6xl text-secondary animate-bounce shadow-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
                  )}
                </div>
                
                {/* Glowing neon UI skeleton during initial loading state */}
                <div className="w-full max-w-sm px-8">
                   <div className="h-6 w-3/4 bg-primary/20 rounded-full mx-auto animate-pulse mb-6 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                   </div>
                   <div className="space-y-4">
                     <div className="h-3 w-full bg-secondary/10 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                     </div>
                     <div className="h-3 w-5/6 bg-secondary/10 rounded-full mx-auto relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite_0.5s]"></div>
                     </div>
                   </div>
                </div>

                <h3 className="text-2xl font-bold font-headline mt-8 text-on-surface bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent">
                  {loadingStatus}
                </h3>
                <p className="text-on-surface-variant text-[10px] mt-3 font-bold uppercase tracking-widest text-center max-w-xs animate-pulse opacity-70">
                  Executing Double-Pass Architectural Synthesis
                </p>
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
                     <p className="text-on-surface leading-loose text-sm md:text-base font-medium opacity-90">{sowData.executiveSummary || 'Structuring...'}</p>
                   </div>
                   
                   <div className="space-y-4 pt-4 pb-4">
                     <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg inline-block border border-outline-variant/20 shadow-inner">Project Milestones</h4>
                     <div className="space-y-3">
                       {sowData.milestones?.filter((m: any) => m && m.title).map((m: any, idx: number) => (
                         <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-outline-variant/30 bg-surface-container-low/30 backdrop-blur-sm hover:border-primary/30 transition-all hover:bg-surface-container-high/40 gap-4">
                           <div className="flex items-start gap-4">
                             <div className="w-10 h-10 mt-1 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-[0_0_10px_var(--color-primary)]">
                               <span className="text-primary font-bold">{idx + 1}</span>
                             </div>
                             <div>
                               <span className="font-bold text-on-surface text-sm md:text-base block mb-1">{m.title}</span>
                               <span className="text-[11px] md:text-xs text-on-surface-variant font-medium opacity-80 block max-w-lg mb-2">{m.description || '...'}</span>
                               {m.acceptance_criteria && (
                                 <div className="bg-surface/50 border border-outline-variant/20 rounded-lg p-2 max-w-lg">
                                   <p className="text-[9px] uppercase font-bold tracking-widest text-secondary mb-1">Acceptance Criteria</p>
                                   <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{m.acceptance_criteria}</p>
                                 </div>
                               )}
                             </div>
                           </div>
                           <span className="font-black text-on-surface text-lg md:text-xl tracking-tight shrink-0">{m.amount ? formatCurrency(m.amount) : 'Parsing...'}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>

                <div className="border-t border-outline-variant/20 pt-8 mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-30 bg-surface py-2 rounded-xl">
                   <div className="shrink-0">
                     <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Total Verified Valuation</p>
                     <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-on-surface to-on-surface-variant tracking-tighter">{sowData.totalAmount ? formatCurrency(sowData.totalAmount) : 'Pending...'}</p>
                   </div>
                   
                   <div className="flex flex-col xl:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                     <input 
                        type="email" 
                        required
                        value={clientEmail}
                        onChange={e => setClientEmail(e.target.value)}
                        placeholder="Client Email (e.g. hello@ceoo.com)"
                        className="w-full xl:w-56 bg-surface-container-low border border-outline-variant/50 focus:border-primary px-4 py-4 rounded-xl text-sm focus:outline-none transition-colors"
                     />
                     <button 
                        onClick={handleApproveProject}
                        disabled={isPending || !clientEmail.includes('@')}
                        className={`w-full xl:w-auto flex justify-center items-center gap-2 px-8 py-4 rounded-xl font-bold font-headline text-sm tracking-widest uppercase transition-all duration-300 ${isPending || !clientEmail.includes('@') ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-80 shadow-none' : 'bg-primary text-on-primary shadow-[0_8px_20px_rgba(var(--color-primary),0.3)] hover:shadow-primary/50 hover:-translate-y-1 active:translate-y-0 active:scale-95'}`}
                     >
                       {isPending ? (
                          <>
                           <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                           <span>Deploying...</span>
                          </>
                       ) : "Approve & Send to Client"}
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
