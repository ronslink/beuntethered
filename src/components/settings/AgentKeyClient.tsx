"use client";

import { useState } from "react";
import { generateAgentKey, revokeAgentKey } from "@/app/actions/agent-keys";

interface AgentKeyClientProps {
  hasKeyBound: boolean;
}

export default function AgentKeyClient({ hasKeyBound }: AgentKeyClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setNewKey(null);
    const res = await generateAgentKey();
    if (res.success && res.key) {
      setNewKey(res.key);
    } else {
      alert("Execution fault: " + res.error);
    }
    setIsLoading(false);
  };

  const handleRevoke = async () => {
    if (!confirm("Are you sure? Any autonomous scripts relying on this key will instantly fail.")) return;
    setIsLoading(true);
    const res = await revokeAgentKey();
    if (!res.success) alert("Revocation fault: " + res.error);
    setNewKey(null);
    setIsLoading(false);
  };

  const currentStatus = hasKeyBound || newKey !== null;

  return (
    <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-6 border-b border-outline-variant/20 pb-4">
        <h3 className="text-xl font-bold text-on-surface font-headline flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">smart_toy</span>
          Autonomous Agent Settings
        </h3>
        {currentStatus ? (
          <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-green-500/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Active
          </span>
        ) : (
          <span className="bg-outline-variant/10 text-outline-variant px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-outline-variant/20">
            Inactive
          </span>
        )}
      </div>

      <p className="text-on-surface-variant text-sm mb-6 max-w-2xl leading-relaxed">
        Issue a secure API credential allowing an automated AI Agent or CI/CD runner to act on your behalf. Bots holding this key can instantly submit milestone completions directly into the pipeline without your physical intervention.
      </p>

      {newKey ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-6">
           <h4 className="text-green-500 font-bold uppercase tracking-widest text-xs mb-2">Key Generated Successfully</h4>
           <p className="text-on-surface-variant text-sm mb-4">Please copy this credential now. For extreme security, we will never show you this string again.</p>
           
           <div className="flex items-center gap-4 bg-surface-container-highest p-4 rounded-xl border border-outline-variant/10">
              <code className="text-on-surface font-mono tracking-tight flex-1 font-medium">{newKey}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(newKey)}
                className="bg-surface-container text-on-surface-variant p-2 rounded-lg hover:text-on-surface transition-all active:scale-95"
              >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
           </div>
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        {currentStatus ? (
           <div className="flex items-center gap-4 w-full">
              <button 
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30 px-6 py-3 rounded-xl uppercase tracking-widest text-xs font-bold transition-all disabled:opacity-50"
              >
                {isLoading ? "Executing..." : "Cycle Key"}
              </button>
              <button 
                onClick={handleRevoke}
                disabled={isLoading}
                className="bg-error/10 text-error hover:bg-error/20 border border-error/20 px-6 py-3 rounded-xl uppercase tracking-widest text-xs font-bold transition-all disabled:opacity-50"
              >
                {isLoading ? "Executing..." : "Revoke"}
              </button>
           </div>
        ) : (
           <button 
             onClick={handleGenerate}
             disabled={isLoading}
             className="bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-lg shadow-primary/20 px-6 py-3 rounded-xl uppercase tracking-widest text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-2"
           >
             <span className="material-symbols-outlined text-sm">vpn_key</span>
             {isLoading ? "Executing..." : "Generate Agent Key"}
           </button>
        )}
      </div>
    </div>
  );
}
