"use client";

import { useState, useTransition } from "react";
import { acceptBid } from "@/app/actions/bids";
import { useRouter } from "next/navigation";

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

type Bid = {
  id: string;
  proposed_amount: any;
  estimated_days: number;
  technical_approach: string;
  created_at?: Date | string;
  developer: { id: string; name: string | null; email: string; trust_score?: number; total_sprints_completed?: number };
};

function BidListRow({
  bid,
  isSelected,
  isPriceLow,
  onClick,
}: {
  bid: Bid;
  isSelected: boolean;
  isPriceLow: boolean;
  onClick: () => void;
}) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const initials = (bid.developer.name ?? bid.developer.email)
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`w-full text-left group relative transition-all duration-200 rounded-2xl border px-4 py-4 flex gap-4 items-center ${
        isSelected
          ? "bg-primary/5 border-primary/50 shadow-sm shadow-primary/10"
          : "bg-surface border-outline-variant/20 hover:border-outline-variant/50 hover:bg-surface-container-low/50"
      }`}
    >
      {isSelected && <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary" />}

      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black border ${
        isSelected ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface-container-high border-outline-variant/30 text-on-surface-variant"
      }`}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`font-bold text-sm truncate ${isSelected ? "text-primary" : "text-on-surface"}`}>
            {bid.developer.name || "Anonymous Expert"}
          </p>
          <p className="text-sm font-black text-on-surface shrink-0">{formatCurrency(Number(bid.proposed_amount))}</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-on-surface-variant font-medium">{bid.estimated_days} days</span>
          {isPriceLow && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-tertiary/10 text-tertiary border border-tertiary/20">
              Lowest
            </span>
          )}
          {bid.developer.total_sprints_completed && bid.developer.total_sprints_completed > 0 ? (
            <span className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
              {bid.developer.total_sprints_completed} completed
            </span>
          ) : null}
          {bid.created_at && (
            <span className="text-[10px] text-on-surface-variant font-medium ml-auto">{timeAgo(bid.created_at)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function BidDetailPane({
  bid,
  projectId,
  projectBudget,
  isProjectOpen,
}: {
  bid: Bid;
  projectId: string;
  projectBudget: number;
  isProjectOpen: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const priceDelta = Number(bid.proposed_amount) - projectBudget;
  const pricePct = projectBudget > 0 ? ((Number(bid.proposed_amount) / projectBudget) * 100).toFixed(0) : "N/A";

  const initials = (bid.developer.name ?? bid.developer.email)
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleAccept = () => {
    startTransition(async () => {
      const res = await acceptBid(bid.id);
      if (res.success) {
        router.push(`/command-center/${projectId}`);
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Candidate Header */}
      <div className="p-6 border-b border-outline-variant/20 shrink-0">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-black text-primary shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black font-headline text-on-surface uppercase tracking-tight">
              {bid.developer.name || "Anonymous Expert"}
            </h2>
            <p className="text-xs text-on-surface-variant font-medium">{bid.developer.email}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {bid.developer.total_sprints_completed !== undefined && bid.developer.total_sprints_completed > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-tertiary">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  {bid.developer.total_sprints_completed} sprints completed
                </span>
              )}
              {bid.developer.trust_score !== undefined && bid.developer.trust_score > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <span className="material-symbols-outlined text-[12px]">star</span>
                  {bid.developer.trust_score.toFixed(1)} trust
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price vs Budget */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/20 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Proposed</p>
            <p className="text-base font-black text-on-surface">{formatCurrency(Number(bid.proposed_amount))}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/20 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Delivery</p>
            <p className="text-base font-black text-on-surface">{bid.estimated_days}d</p>
          </div>
          <div className={`rounded-xl p-3 border text-center ${priceDelta <= 0 ? "bg-tertiary/5 border-tertiary/20" : "bg-surface-container-low border-outline-variant/20"}`}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">vs Budget</p>
            <p className={`text-base font-black ${priceDelta <= 0 ? "text-tertiary" : "text-on-surface"}`}>
              {priceDelta <= 0 ? `↓${Math.abs(priceDelta).toLocaleString()}` : `↑${priceDelta.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Proposal Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Technical Approach</p>
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4">
            <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap font-medium">
              {bid.technical_approach}
            </p>
          </div>
        </div>

        {/* Trust Callout */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
            If you hire this developer, <strong className="text-on-surface">your funds are held in Escrow</strong> and only released when you approve each milestone. You can dispute any delivery within the review window.
          </p>
        </div>
      </div>

      {/* CTA Footer */}
      {isProjectOpen && (
        <div className="p-5 border-t border-outline-variant/20 shrink-0 bg-surface">
          {!confirmed ? (
            <button
              onClick={() => setConfirmed(true)}
              className="w-full py-4 rounded-xl bg-on-surface text-surface font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.3)] active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
              Hire This Developer
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-center text-on-surface-variant font-medium">
                You are about to hire <strong className="text-on-surface">{bid.developer.name || "this developer"}</strong>. This will close all other proposals.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmed(false)}
                  className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:border-outline-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isPending}
                  className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${
                    isPending
                      ? "bg-surface-container-high text-on-surface-variant cursor-not-allowed"
                      : "bg-primary text-on-primary shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95"
                  }`}
                >
                  {isPending ? (
                    <><span className="material-symbols-outlined animate-spin text-[14px]">refresh</span> Hiring...</>
                  ) : (
                    <>Confirm Hire</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BidReviewShell({
  bids,
  projectId,
  projectBudget,
  isProjectOpen,
}: {
  bids: Bid[];
  projectId: string;
  projectBudget: number;
  isProjectOpen: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(bids[0]?.id ?? null);
  const selectedBid = bids.find(b => b.id === selectedId);
  const lowestAmount = bids.length > 0 ? Math.min(...bids.map(b => Number(b.proposed_amount))) : 0;

  if (bids.length === 0) return null;

  return (
    <div className="flex gap-5 items-start">
      {/* Left: Candidate List */}
      <div className="w-full lg:w-[38%] shrink-0 space-y-2">
        {bids.map((bid, idx) => (
          <div
            key={bid.id}
            className="animate-in fade-in slide-in-from-left-4"
            style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
          >
            <BidListRow
              bid={bid}
              isSelected={selectedId === bid.id}
              isPriceLow={Number(bid.proposed_amount) === lowestAmount}
              onClick={() => setSelectedId(bid.id)}
            />
          </div>
        ))}
      </div>

      {/* Right: Detail Pane */}
      {selectedBid && (
        <div className="hidden lg:flex flex-col flex-1 sticky top-6 h-[calc(100vh-120px)] bg-surface border border-outline-variant/30 rounded-3xl overflow-hidden shadow-xl shadow-surface-variant/10 animate-in fade-in slide-in-from-right-4 duration-300">
          <BidDetailPane
            key={selectedBid.id}
            bid={selectedBid}
            projectId={projectId}
            projectBudget={projectBudget}
            isProjectOpen={isProjectOpen}
          />
        </div>
      )}
    </div>
  );
}
