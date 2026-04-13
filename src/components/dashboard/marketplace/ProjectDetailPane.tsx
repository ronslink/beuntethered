"use client";

import { useState, useTransition } from "react";
import { submitBid } from "@/app/actions/bids";
import Link from "next/link";
import { useRouter } from "next/navigation";

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? "s" : ""} ago`;
}

export default function ProjectDetailPane({
  project,
  totalValue,
  matchScore,
}: {
  project: any;
  totalValue: number;
  matchScore: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bidAmount, setBidAmount] = useState<number>(totalValue);
  const [days, setDays] = useState<number>(14);
  const [approach, setApproach] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"brief" | "bid">("brief");

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approach.trim()) return;

    startTransition(async () => {
      const res = await submitBid({
        projectId: project.id,
        proposedAmount: bidAmount,
        estimatedDays: days,
        technicalApproach: approach,
      });

      if (res?.success) {
        setSuccess(true);
        setTimeout(() => router.refresh(), 1500);
      } else {
        alert(`Error: ${res?.error}`);
      }
    });
  };

  const isHighMatch = matchScore >= 90;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Pane Header */}
      <div className="p-6 border-b border-outline-variant/20 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
                style={{
                  color: isHighMatch ? "#10b981" : "#f59e0b",
                  borderColor: isHighMatch ? "#10b98130" : "#f59e0b30",
                  backgroundColor: isHighMatch ? "#10b98108" : "#f59e0b08",
                }}>
                {matchScore}% match
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                project.billing_type === "HOURLY_RETAINER"
                  ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                  : "bg-surface-container-high text-on-surface-variant border-outline-variant/20"
              }`}>
                {project.billing_type === "HOURLY_RETAINER" ? "Hourly" : "Fixed Scope"}
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium ml-auto">{timeAgo(project.created_at)}</span>
            </div>
            <h2 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight leading-tight">
              {project.title}
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-on-surface tracking-tighter">{formatCurrency(totalValue)}</p>
            <p className="text-[10px] text-on-surface-variant font-medium">{project.milestones?.length} phases</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 border border-outline-variant/20">
          {(["brief", "bid"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? "bg-surface text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab === "brief" ? "📋 Project Brief" : "⚡ Submit Bid"}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* ── BRIEF TAB ── */}
        {activeTab === "brief" && (
          <div className="p-6 space-y-6 animate-in fade-in duration-200">

            {/* Executive Summary */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Executive Summary</p>
              <p className="text-sm text-on-surface leading-relaxed font-medium">
                {project.ai_generated_sow}
              </p>
            </div>

            {/* Milestone Breakdown */}
            {project.milestones?.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">
                  Milestone Breakdown
                </p>
                <div className="space-y-2">
                  {project.milestones.map((m: any, idx: number) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/20"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-black text-primary">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{m.title}</p>
                        {m.estimated_duration_days && (
                          <p className="text-[10px] text-on-surface-variant font-medium">{m.estimated_duration_days} days est.</p>
                        )}
                      </div>
                      <span className="text-sm font-black text-on-surface shrink-0">{formatCurrency(Number(m.amount))}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mt-3 px-3 pt-3 border-t border-outline-variant/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Contract Value</span>
                  <span className="text-base font-black text-on-surface">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            )}

            {/* Escrow Trust Callout */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Escrow Protected</p>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                  Funds are held securely and released only when each milestone is approved. IP transfers to the client on final payout.
                </p>
              </div>
            </div>

            {/* Link to Full Dossier */}
            <Link
              href={`/marketplace/project/${project.id}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all text-[11px] font-bold uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              View Full Dossier
            </Link>
          </div>
        )}

        {/* ── BID TAB ── */}
        {activeTab === "bid" && (
          <div className="p-6 animate-in fade-in duration-200">
            {success ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-tertiary/10 border border-tertiary/30 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface">Bid Submitted!</h3>
                <p className="text-sm text-on-surface-variant mt-2">The client will be notified of your proposal.</p>
              </div>
            ) : (
              <form onSubmit={handleBidSubmit} className="space-y-5">
                {/* Client Budget Reference */}
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Client Budget</span>
                  <span className="text-base font-black text-on-surface">{formatCurrency(totalValue)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Your Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">$</span>
                      <input
                        type="number" required min={1} value={bidAmount}
                        onChange={e => setBidAmount(Number(e.target.value))}
                        className="w-full bg-surface border border-outline-variant/30 rounded-xl pl-7 pr-3 py-3 text-lg font-black text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Delivery (Days)</label>
                    <input
                      type="number" required min={1} value={days}
                      onChange={e => setDays(Number(e.target.value))}
                      className="w-full bg-surface border border-outline-variant/30 rounded-xl px-3 py-3 text-lg font-black text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Technical Approach</label>
                  <textarea
                    required value={approach} onChange={e => setApproach(e.target.value)}
                    rows={6} placeholder="Describe your approach, tech stack, and why you're the right fit..."
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors custom-scrollbar resize-none"
                  />
                </div>

                <button
                  type="submit" disabled={isPending || !approach.trim()}
                  className={`w-full font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    isPending || !approach.trim()
                      ? "bg-surface-container-high text-on-surface-variant cursor-not-allowed"
                      : "bg-on-surface text-surface hover:-translate-y-0.5 shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.3)] active:scale-95"
                  }`}
                >
                  {isPending ? (
                    <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Submitting...</>
                  ) : (
                    <>Submit Proposal <span className="material-symbols-outlined text-[16px]">send</span></>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
