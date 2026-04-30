"use client";

import { useState, useTransition } from "react";
import { updateUserAIKeys } from "@/app/actions/user";

export default function BYOKSettingsClient({
   initialPreferred,
   hasOpenAI,
   hasAnthropic,
   hasGoogle,
   serverGemmaReady
}: {
   initialPreferred: string,
   hasOpenAI: string,
   hasAnthropic: string,
   hasGoogle: string,
   serverGemmaReady: boolean
}) {
  const [isPending, startTransition] = useTransition();
  const [preferredLlm, setPreferredLlm] = useState(initialPreferred);
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
       const res = await updateUserAIKeys({
          preferred_llm: preferredLlm,
          openai_key: openaiKey,
          anthropic_key: anthropicKey,
          google_key: googleKey
       });

       if (res.success) {
          setMessage({ text: "AI routing preferences updated.", type: 'success' });
          setOpenaiKey("");
          setAnthropicKey("");
          setGoogleKey("");
       } else {
          setMessage({ text: res.error || "Could not update AI keys.", type: 'error' });
       }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between mb-6 border-b border-outline-variant/20 pb-4">
         <div>
            <h3 className="text-xl font-bold text-on-surface font-headline flex items-center gap-2">
               <span className="material-symbols-outlined text-primary text-xl">vpn_key</span>
               AI Model Preferences & API Keys
            </h3>
            <p className="text-xs text-on-surface-variant font-medium mt-1 uppercase tracking-widest">Optional BYOK routing for model-specific workloads.</p>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
         {message && (
            <div className={`p-4 rounded-lg text-sm font-bold border ${message.type === 'error' ? 'bg-error/10 text-error border-error/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
               {message.text}
            </div>
         )}

         <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Preferred AI Router</label>
            <select
               value={preferredLlm}
               onChange={(e) => setPreferredLlm(e.target.value)}
               className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface font-bold focus:border-primary/50 outline-none transition-colors appearance-none"
            >
               <option value="minimax">Platform Default (MiniMax-M2.7)</option>
               <option value="gpt-4o">Premium Architect (GPT-4o) - Requires Key</option>
               <option value="claude-3-5-sonnet">Premium Reasoning (Claude 3.5 Sonnet) - Requires Key</option>
               <option value="gemini-1.5-pro">Google Gemini (1.5 Pro) - Requires Key</option>
               <option value="gemma-4-server">Self-hosted Gemma 4 - {serverGemmaReady ? "Server Ready" : "Needs Server Config"}</option>
            </select>
            <p className="mt-2 text-[11px] font-medium text-on-surface-variant">
               This preference controls trusted generation workloads. Basic triage and classification use the platform-configured low-cost lane.
            </p>
         </div>

         <div className="grid grid-cols-1 gap-6">
            <div>
               <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-2">
                  OpenAI Key
                  {hasOpenAI && <span className="px-2 py-0.5 rounded-md bg-surface-variant text-on-surface-variant text-[10px] tracking-normal border border-outline-variant/30">Active: {hasOpenAI}</span>}
               </label>
               <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-.................."
                  className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface font-medium focus:border-primary/50 outline-none transition-colors font-mono text-sm placeholder:text-on-surface-variant/30"
               />
               <p className="text-[11px] text-on-surface-variant mt-2 opacity-80">Your API key is encrypted when submitted and stored securely.</p>
            </div>

            <div>
               <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-2">
                  Anthropic Key
                  {hasAnthropic && <span className="px-2 py-0.5 rounded-md bg-surface-variant text-on-surface-variant text-[10px] tracking-normal border border-outline-variant/30">Active: {hasAnthropic}</span>}
               </label>
               <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-.................."
                  className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface font-medium focus:border-primary/50 outline-none transition-colors font-mono text-sm placeholder:text-on-surface-variant/30"
               />
            </div>

            <div>
               <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-2">
                  Google Gemini Key
                  {hasGoogle && <span className="px-2 py-0.5 rounded-md bg-surface-variant text-on-surface-variant text-[10px] tracking-normal border border-outline-variant/30">Active: {hasGoogle}</span>}
               </label>
               <input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="AIza.................."
                  className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface font-medium focus:border-primary/50 outline-none transition-colors font-mono text-sm placeholder:text-on-surface-variant/30"
               />
            </div>
         </div>

         <div className="pt-4 flex justify-end">
             <button
                type="submit"
                disabled={isPending}
                className="bg-primary text-on-primary font-bold px-8 py-3 rounded-lg uppercase tracking-widest text-xs disabled:opacity-50 hover:bg-primary/90 transition-all"
             >
                {isPending ? 'Saving...' : 'Save AI Routing'}
             </button>
         </div>
      </form>
    </div>
  );
}
