"use client";

import { useState, useTransition, useEffect } from "react";
import { generateBYOCInvite } from "@/app/actions/byoc";

export default function BYOCDraftingHub() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sowData, setSowData] = useState<any>(null);
  
  // Validation loop
  const [isPending, startTransition] = useTransition();
  const [magicLinkUrl, setMagicLinkUrl] = useState("");
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    // Render boundary lock ensuring client-side variables evaluate mathematically
    setHostname(window.location.origin);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setSowData(null);
    setMagicLinkUrl("");

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

  const handleCreateMagicLink = () => {
    startTransition(async () => {
      const res = await generateBYOCInvite(sowData);
      if (res.success) {
        setMagicLinkUrl(`${hostname}/invite/${res.inviteToken}`);
      } else {
        alert(res.error || "Fatal Magic Link Generation Fault.");
      }
    });
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(magicLinkUrl);
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <main className="lg:p-6 min-h-[calc(100vh-80px)] flex flex-col relative">
      {/* Ambient light overlay across screen */}
      <div className="absolute top-[0%] left-[20%] w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="mb-6 lg:mb-10 px-4 lg:px-0">
        <h2 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
          BYOC <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">Magic Hub</span>
        </h2>
        <p className="text-on-surface-variant font-medium mt-2 max-w-2xl">Create a private project for your own client. Bypass the marketplace and work directly without platform fees.</p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 lg:px-0 pb-10">
        
        {/* Left Pane - Conversational Loop */}
        <section className="lg:col-span-5 flex flex-col justify-end min-h-[400px] lg:min-h-0 bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl overflow-hidden relative">
           
           <div className="flex-1 p-8 overflow-y-auto w-full custom-scrollbar">
              {!sowData && !isGenerating && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                    <span className="material-symbols-outlined text-6xl text-secondary/40 mb-4 animate-pulse duration-1000" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
                    <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Build The Hook</h3>
                    <p className="text-sm text-on-surface-variant max-w-xs">Enter your project details below. We will generate a detailed scope and pricing structure for your client.</p>
                 </div>
              )}

              {prompt && (isGenerating || sowData) && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
                  <div className="self-end bg-secondary/10 border border-secondary/20 p-4 rounded-2xl rounded-tr-none ml-8 max-w-[90%] relative shadow-lg shadow-secondary/5">
                    <p className="text-sm text-on-surface leading-relaxed text-right">{prompt}</p>
                    <span className="absolute -right-2 top-0 w-3 h-3 bg-secondary/20 rounded-bl-full"></span>
                  </div>
                  
                  {(isGenerating || sowData) && (
                     <div className="self-start bg-primary/5 border border-primary/20 p-4 rounded-2xl rounded-tl-none mr-8 max-w-[90%] relative shadow-lg shadow-primary/5">
                       <p className="text-sm text-on-surface leading-relaxed w-full">
                         {isGenerating 
                           ? "Generating your project scope..." 
                           : "Your project draft is ready. Review it and click Generate Magic Link when you are ready to send it to your client."}
                       </p>
                       <span className="absolute -left-2 top-0 w-3 h-3 bg-primary/20 rounded-br-full"></span>
                     </div>
                  )}
                </div>
              )}
           </div>

           {/* Sleek Input Tool */}
           <div className="p-6 bg-surface-container-low/80 backdrop-blur-xl border-t border-outline-variant/20 relative z-10 w-full">
              <form onSubmit={handleGenerate} className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-secondary/30 to-primary/30 rounded-2xl blur-lg transition duration-500 group-focus-within:from-secondary/60 group-focus-within:to-primary/60 opacity-0 group-focus-within:opacity-100"></div>
                 <div className="relative flex items-end gap-3 bg-surface border border-outline-variant/30 focus-within:border-secondary/50 transition-colors rounded-2xl p-2 shadow-inner">
                   <textarea 
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     disabled={isGenerating || !!magicLinkUrl}
                     placeholder="e.g., Building a React dashboard with user authentication. Total pricing $4500."
                     className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 resize-none min-h-[80px] p-3 text-sm focus:outline-none custom-scrollbar"
                   />
                   <button 
                     type="submit" 
                     disabled={isGenerating || !prompt.trim() || !!magicLinkUrl}
                     className={`mb-2 mr-2 p-3 rounded-xl flex items-center justify-center transition-all ${isGenerating ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-secondary text-on-primary hover:bg-secondary-container hover:text-on-secondary-container shadow-lg shadow-secondary/20 hover:-translate-y-0.5'}`}
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

        {/* Right Pane - Formal SoW Output Target */}
        <section className="lg:col-span-7 bg-white dark:bg-white/[0.02] border border-outline-variant/30 rounded-3xl p-8 lg:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-surface-variant/5 relative overflow-hidden flex flex-col min-h-[500px]">
           
           <div className="absolute top-8 right-8 text-outline-variant/40 select-none pointer-events-none">
             <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 0" }}>description</span>
           </div>

           {isGenerating ? (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-2xl transition-all duration-500">
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-75"></div>
                  <div className="absolute w-32 h-32 bg-primary/30 rounded-full blur-2xl animate-pulse delay-150"></div>
                  <span className="material-symbols-outlined text-6xl text-on-surface animate-spin" style={{ animationDuration: '4s' }}>model_training</span>
                </div>
                <h3 className="text-2xl font-bold font-headline text-on-surface">Locking Custom BYOC Grids</h3>
             </div>
           ) : sowData ? (
             <div className="relative z-10 w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="border-b border-outline-variant/20 pb-6 mb-8 mt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">psychology</span> 
                    Independent Facilitator Contract
                  </p>
                  <h3 className="text-3xl font-extrabold text-on-surface font-headline leading-snug">{sowData.title}</h3>
                </div>
                
                <div className="space-y-8 flex-1 overflow-y-auto pr-4 custom-scrollbar">
                   <div className="space-y-4">
                     <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg inline-block border border-outline-variant/20 shadow-inner">Executive Summary</h4>
                     <p className="text-on-surface leading-loose text-sm md:text-base font-medium opacity-90">{sowData.executiveSummary}</p>
                   </div>
                   
                   <div className="space-y-4 pt-4 pb-4">
                     <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg inline-block border border-outline-variant/20 shadow-inner">100% Retained Revenue Routing</h4>
                     <div className="space-y-3">
                       {sowData.milestones.map((m: any, idx: number) => (
                         <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-outline-variant/30 bg-surface-container-low/30 backdrop-blur-sm gap-4">
                           <div className="flex items-start gap-4">
                             <div className="w-10 h-10 mt-1 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 border border-secondary/20 shadow-[0_0_10px_var(--color-secondary)]">
                               <span className="text-secondary font-bold">{idx + 1}</span>
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
                   <div className="shrink-0 mb-4 md:mb-0">
                     <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Total Verified Revenue Target</p>
                     <p className="text-4xl font-black text-secondary tracking-tighter">{formatCurrency(sowData.totalAmount)}</p>
                   </div>
                   
                   {!magicLinkUrl ? (
                      <button 
                         onClick={handleCreateMagicLink}
                         disabled={isPending}
                         className={`w-full md:w-auto flex justify-center items-center gap-2 px-8 py-4 rounded-xl font-bold font-headline text-sm tracking-widest uppercase transition-all duration-300 ${isPending ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-80 shadow-none' : 'bg-primary text-on-primary shadow-[0_8px_20px_rgba(var(--color-primary),0.3)] hover:shadow-primary/50 hover:-translate-y-1'}`}
                      >
                       {isPending ? (
                          <>
                           <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                           <span>Deploying Secure Hash...</span>
                          </>
                       ) : "Generate Magic Link"}
                      </button>
                   ) : (
                      <div className="w-full md:max-w-md bg-surface-container-low border-2 border-primary/40 rounded-xl p-4 shadow-lg shadow-primary/10 animate-in fade-in zoom-in duration-500">
                         <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Secure Link Deployed</p>
                         <div className="flex items-center gap-2 bg-surface border border-outline-variant/50 rounded-lg p-2">
                            <input 
                              type="text" 
                              readOnly 
                              value={magicLinkUrl} 
                              className="w-full bg-transparent border-none text-xs text-on-surface font-mono focus:outline-none px-2 truncate"
                            />
                            <button 
                               onClick={handleCopy}
                               className="bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded-md transition-colors"
                            >
                               <span className="material-symbols-outlined text-sm">content_copy</span>
                            </button>
                         </div>
                      </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-outline-variant/30 text-center select-none pt-12">
                <span className="material-symbols-outlined text-[80px] mb-4">bolt</span>
                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-on-surface-variant/40">Launch A Private Delivery Graph Natively</p>
             </div>
           )}
        </section>

      </div>
    </main>
  );
}
