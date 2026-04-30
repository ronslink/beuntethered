"use client";

import { useEffect, useState, useTransition } from "react";
import { submitBid } from "@/app/actions/bids";
import { markProjectInviteViewed, respondToProjectInvite } from "@/app/actions/project-invites";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMilestoneProofPlan } from "@/lib/milestone-proof";

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
  const [inviteStatus, setInviteStatus] = useState<string | null>(project.inviteStatus ?? null);
  const [invitePending, startInviteTransition] = useTransition();

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
  const inviteId = project.invites?.[0]?.id as string | undefined;
  const fit = project.opportunityFit;

  useEffect(() => {
    if (!inviteId || inviteStatus !== "SENT") return;
    let cancelled = false;
    markProjectInviteViewed(inviteId).then((res) => {
      if (!cancelled && res.success) setInviteStatus("VIEWED");
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [inviteId, inviteStatus]);

  const handleInviteResponse = (status: "ACCEPTED" | "DECLINED") => {
    if (!inviteId) return;
    startInviteTransition(async () => {
      const res = await respondToProjectInvite(inviteId, status);
      if (res.success) {
        setInviteStatus(status);
        router.refresh();
      } else {
        alert(res.error || "Could not update invite.");
      }
    });
  };

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
            {inviteStatus && (
              <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">Invited Opportunity</p>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                      Status: <span className="text-on-surface font-bold">{inviteStatus.toLowerCase()}</span>
                    </p>
                  </div>
                  {(inviteStatus === "SENT" || inviteStatus === "VIEWED") && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleInviteResponse("DECLINED")}
                        disabled={invitePending}
                        className="rounded-lg border border-outline-variant/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:border-error/40 hover:text-error"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleInviteResponse("ACCEPTED")}
                        disabled={invitePending}
                        className="rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <h2 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight leading-tight">
              {project.title}
            </h2>
            {project.organization?.name && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                <span className="inline-flex items-center gap-1 rounded-md border border-outline-variant/20 bg-surface-container-low px-2.5 py-1">
                  <span className="material-symbols-outlined text-[12px]">domain</span>
                  {project.organization.name}
                </span>
                {project.organization.type && (
                  <span className="rounded-md border border-outline-variant/20 bg-surface-container-low px-2.5 py-1">
                    {project.organization.type}
                  </span>
                )}
                {project.organization.website && (
                  <a
                    href={project.organization.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-outline-variant/20 bg-surface-container-low px-2.5 py-1 hover:border-primary/40 hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                    Website
                  </a>
                )}
              </div>
            )}
            {fit?.reasons?.length > 0 && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary">Why this fits your profile</p>
                </div>
                <div className="space-y-1">
                  {fit.reasons.slice(0, 4).map((reason: string) => (
                    <p key={reason} className="flex gap-2 text-xs font-medium leading-5 text-on-surface-variant">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-on-surface tracking-tighter">{formatCurrency(totalValue)}</p>
            <p className="text-[10px] text-on-surface-variant font-medium">{project.milestones?.length} phases</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-surface-container-low rounded-lg p-1 border border-outline-variant/20">
          {(["brief", "bid"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-md text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab
                  ? "bg-surface text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{tab === "brief" ? "assignment" : "send"}</span>
              {tab === "brief" ? "Project Brief" : "Submit Bid"}
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
                  {project.milestones.map((m: any, idx: number) => {
                    const proofPlan = getMilestoneProofPlan(m);
                    return (
                      <div
                        key={m.id}
                        className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-black text-primary">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate">{m.title}</p>
                            {m.estimated_duration_days && (
                              <p className="text-[10px] text-on-surface-variant font-medium">{m.estimated_duration_days} days est. · {proofPlan.summary}</p>
                            )}
                          </div>
                          <span className="text-sm font-black text-on-surface shrink-0">{formatCurrency(Number(m.amount))}</span>
                        </div>

                        {(proofPlan.deliverables.length > 0 || proofPlan.reviewChecks.length > 0) && (
                          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-outline-variant/10 pt-3">
                            {proofPlan.deliverables.length > 0 && (
                              <div>
                                <p className="mb-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                                  Outputs
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {proofPlan.deliverables.slice(0, 3).map((deliverable) => (
                                    <span key={deliverable} className="rounded-md border border-outline-variant/20 bg-surface px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                                      {deliverable}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                              <p className="mb-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary">
                                <span className="material-symbols-outlined text-[12px]">rule</span>
                                Proof Required
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {proofPlan.requiredArtifacts.slice(0, 4).map((artifact) => (
                                  <p key={artifact.key} className="flex items-start gap-1.5 text-[10px] font-medium leading-4 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[12px] text-primary mt-0.5">task_alt</span>
                                    {artifact.label}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                      : "bg-on-surface text-surface hover:bg-on-surface/90 active:scale-95"
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
