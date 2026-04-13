"use client";

import { useState } from "react";
import BidModal from "@/components/dashboard/marketplace/BidModal";

// Deterministic hash helper for stable mock metrics
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function DossierClient({ 
  project, 
  milestones, 
  matchScore, 
  totalValue,
  clientTrust
}: {
  project: any;
  milestones: any[];
  matchScore: number;
  totalValue: number;
  clientTrust: { totalSpend: number; avgRating: number; projectCount: number };
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "architecture" | "escrow">("overview");
  const [isBidOpen, setIsBidOpen] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: "dashboard" },
    { key: "architecture" as const, label: "Architecture", icon: "account_tree" },
    { key: "escrow" as const, label: "Payment & Approval", icon: "verified_user" },
  ];

  return (
    <>
      <main className="lg:p-6 relative min-h-full pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-tertiary/5 blur-[100px] rounded-full pointer-events-none z-0"></div>

        <div className="px-4 lg:px-0 relative z-10 max-w-6xl mx-auto w-full">
          
          {/* Header */}
          <header className="mb-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-widest uppercase border border-primary/20">Open Bidding</span>
                  <span className="px-3 py-1 rounded-md text-[10px] bg-surface-container-high border border-outline-variant/20 text-on-surface-variant font-bold uppercase tracking-widest">
                    {project.billing_type === "HOURLY_RETAINER" ? "Hourly Cap" : "Fixed Milestone"}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{
                    color: matchScore > 90 ? '#10b981' : '#f59e0b',
                    borderColor: matchScore > 90 ? '#10b98130' : '#f59e0b30',
                    backgroundColor: matchScore > 90 ? '#10b98110' : '#f59e0b10'
                  }}>
                    {matchScore}% Vector Match
                  </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-black font-headline tracking-tighter text-on-surface leading-[0.95] uppercase">
                  {project.title}
                </h1>
              </div>
              
              {/* Client Trust Metrics */}
              <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-2xl p-5 flex gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Client Spend</p>
                  <p className="text-xl font-black text-on-surface">{formatCurrency(clientTrust.totalSpend)}</p>
                </div>
                <div className="w-px bg-outline-variant/20"></div>
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Avg Rating</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <p className="text-xl font-black text-on-surface">{clientTrust.avgRating.toFixed(1)}</p>
                  </div>
                </div>
                <div className="w-px bg-outline-variant/20"></div>
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Projects</p>
                  <p className="text-xl font-black text-on-surface">{clientTrust.projectCount}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Tab Navigation */}
          <div className="flex border-b border-outline-variant/30 mb-8 overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-8 py-4 font-bold font-headline uppercase tracking-widest text-sm whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ================================================================= */}
          {/* TAB 1: OVERVIEW                                                   */}
          {/* ================================================================= */}
          {activeTab === "overview" && (
            <div className="animate-in fade-in duration-300 space-y-8 max-w-4xl">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg inline-block border border-outline-variant/20">Executive Summary</h3>
                <p className="text-on-surface leading-loose text-base font-medium opacity-90">
                  {project.ai_generated_sow}
                </p>
              </div>

              {/* Tech Stack Tags (Simulated from content) */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Detected Technology Vectors</h4>
                <div className="flex flex-wrap gap-2">
                  {["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Stripe", "Vercel", "AI/ML"].map((tag) => (
                    <span key={tag} className="px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-bold border border-outline-variant/20 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all cursor-default">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="bg-surface/50 border border-outline-variant/20 rounded-2xl p-5 text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-2">Milestones</p>
                  <p className="text-3xl font-black text-on-surface">{milestones.length}</p>
                </div>
                <div className="bg-surface/50 border border-outline-variant/20 rounded-2xl p-5 text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-2">Total Value</p>
                  <p className="text-3xl font-black text-on-surface">{formatCurrency(totalValue)}</p>
                </div>
                <div className="bg-surface/50 border border-outline-variant/20 rounded-2xl p-5 text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-2">Type</p>
                  <p className="text-xl font-black text-on-surface">{project.billing_type === "HOURLY_RETAINER" ? "Hourly" : "Fixed"}</p>
                </div>
                <div className="bg-surface/50 border border-outline-variant/20 rounded-2xl p-5 text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-2">Match</p>
                  <p className="text-3xl font-black" style={{ color: matchScore > 90 ? '#10b981' : '#f59e0b' }}>{matchScore}%</p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: ARCHITECTURE                                               */}
          {/* ================================================================= */}
          {activeTab === "architecture" && (
            <div className="animate-in fade-in duration-300 space-y-6 max-w-4xl">
              <p className="text-on-surface-variant text-sm font-medium">Deep milestone architecture breakdown with timeline estimates and technical summaries.</p>
              
              <div className="relative">
                {/* Timeline Spine */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-outline-variant/20"></div>
                
                <div className="space-y-6">
                  {milestones.map((m: any, idx: number) => (
                    <div key={m.id} className="relative pl-16 group">
                      {/* Timeline Node */}
                      <div className="absolute left-0 w-12 h-12 rounded-full border-2 border-primary/30 bg-surface flex items-center justify-center font-bold text-primary z-10 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(var(--color-primary),0.3)] transition-all">
                        {idx + 1}
                      </div>
                      
                      <div className="bg-surface/50 border border-outline-variant/30 rounded-2xl p-6 hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-lg font-black font-headline text-on-surface">{m.title}</h4>
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/20 shrink-0 ml-4">
                            {formatCurrency(Number(m.amount))}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {m.description || `Milestone phase ${idx + 1} of ${milestones.length}. Payment of {formatCurrency(Number(m.amount))} released upon your approval.`}
                        </p>
                        {m.estimated_duration_days && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                            <span className="text-xs font-bold text-primary">{m.estimated_duration_days} days estimated</span>
                          </div>
                        )}
                        {m.deliverables && m.deliverables.length > 0 && (
                          <div className="mt-4 space-y-1.5">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-secondary mb-2">Features & Deliverables</p>
                            {m.deliverables.map((d: string, dIdx: number) => (
                              <div key={dIdx} className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="material-symbols-outlined text-[12px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_small</span>
                                </span>
                                <p className="text-sm text-on-surface-variant leading-relaxed">{d}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: ESCROW & ACCEPTANCE CRITERIA                               */}
          {/* ================================================================= */}
          {activeTab === "escrow" && (
            <div className="animate-in fade-in duration-300 space-y-6 max-w-4xl">
              <p className="text-on-surface-variant text-sm font-medium">Clear acceptance criteria for each milestone payment.</p>
              
              <div className="space-y-6">
                {milestones.map((m: any, idx: number) => (
                  <div key={m.id} className="bg-surface/50 border border-outline-variant/30 rounded-2xl overflow-hidden">
                    {/* Milestone Header */}
                    <div className="flex justify-between items-center p-6 border-b border-outline-variant/20 bg-surface-container-low/30">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-tertiary/10 border border-tertiary/20 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface">{m.title}</h4>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Phase {idx + 1}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Milestone Status</p>
                        <p className="text-xl font-black text-on-surface">{formatCurrency(Number(m.amount))}</p>
                      </div>
                    </div>
                    
                    {/* Acceptance Criteria Checklist */}
                    <div className="p-6 space-y-3">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-secondary mb-3">Acceptance Criteria for Release</p>
                      {(m.acceptance_criteria && m.acceptance_criteria.length > 0 ? m.acceptance_criteria : [
                        `All deliverables for "${m.title}" deployed to staging environment`,
                        "Client sign-off received on functional requirements",
                        "Zero critical bugs in acceptance testing window",
                        "Code review passed with AI Audit score ≥ 85"
                      ]).map((criteria: string, cidx: number) => (
                        <div key={cidx} className="flex items-start gap-3 group">
                          <div className="w-5 h-5 rounded border border-outline-variant/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-tertiary/50 transition-colors">
                            <span className="material-symbols-outlined text-[12px] text-outline-variant/30">check</span>
                          </div>
                          <p className="text-sm text-on-surface-variant leading-relaxed">{criteria}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Escrow Summary */}
              <div className="bg-surface/60 border border-tertiary/20 rounded-2xl p-8 flex flex-col md:flex-row md:items-center justify-between mt-8">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Total Project Cost</p>
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-on-surface to-on-surface-variant tracking-tighter">{formatCurrency(totalValue)}</p>
                </div>
                <p className="text-xs text-on-surface-variant max-w-sm mt-4 md:mt-0">Funds are held securely and released only when you approve each milestone.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="hidden md:block">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Total Contract Value</p>
            <p className="text-2xl font-black text-on-surface tracking-tight">{formatCurrency(totalValue)}</p>
          </div>
          <button 
            onClick={() => setIsBidOpen(true)}
            className="bg-on-surface text-surface px-10 py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:-translate-y-1 transition-all shadow-[0_10px_25px_rgba(0,0,0,0.3)] active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            Submit Proposal
          </button>
        </div>
      </div>

      {/* Bid Modal */}
      {isBidOpen && (
        <BidModal 
          project={project} 
          totalValue={totalValue}
          originalMilestones={milestones}
          onClose={() => setIsBidOpen(false)} 
        />
      )}
    </>
  );
}
