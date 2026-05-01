"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BidModal from "@/components/dashboard/marketplace/BidModal";
import { markProjectInviteViewed, respondToProjectInvite } from "@/app/actions/project-invites";
import type { ProposalAdvisorPacket } from "@/lib/proposal-advisor";
import { ScopeValidationReportCard } from "@/components/dashboard/projects/ScopeValidationReportCard";
import type { SowGuardrailReport } from "@/lib/sow-guardrails";

type DossierProject = {
  id: string;
  title: string;
  ai_generated_sow: string;
  billing_type: string;
};

type DossierMilestone = {
  id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string[];
  deliverables: string[];
  estimated_duration_days: number | null;
  amount: number;
  status: string;
};

type ClientTrust = {
  totalSpend: number;
  avgRating: number | null;
  reviewCount: number;
  projectCount: number;
};

type AwardReadiness =
  | { ok: true }
  | { ok: false; code: string; message: string };

type InviteStatus = "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED";

type ProjectInviteState = {
  id: string;
  status: InviteStatus;
} | null;

type ExistingProposal = {
  id: string;
  status: string;
  proposedAmount: number;
  estimatedDays: number;
  createdAt: string;
} | null;

export default function DossierClient({
  project,
  milestones,
  matchScore,
  matchReasons,
  technologyTags,
  totalValue,
  clientTrust,
  awardReadiness,
  invite,
  existingProposal,
  advisorPacket,
  scopeValidationReport,
}: {
  project: DossierProject;
  milestones: DossierMilestone[];
  matchScore: number;
  matchReasons: string[];
  technologyTags: string[];
  totalValue: number;
  clientTrust: ClientTrust;
  awardReadiness: AwardReadiness;
  invite: ProjectInviteState;
  existingProposal: ExistingProposal;
  advisorPacket?: ProposalAdvisorPacket | null;
  scopeValidationReport?: SowGuardrailReport | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "architecture" | "escrow">("overview");
  const [isBidOpen, setIsBidOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus | null>(invite?.status ?? null);
  const [isInvitePending, startInviteTransition] = useTransition();

  useEffect(() => {
    if (!invite?.id || inviteStatus !== "SENT") return;
    let cancelled = false;
    markProjectInviteViewed(invite.id)
      .then((result) => {
        if (!cancelled && result.success) setInviteStatus("VIEWED");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [invite?.id, inviteStatus]);

  const handleInviteResponse = (status: "ACCEPTED" | "DECLINED") => {
    if (!invite?.id) return;
    startInviteTransition(async () => {
      const result = await respondToProjectInvite(invite.id, status);
      if (result.success) {
        setInviteStatus(status);
        router.refresh();
      } else {
        alert(result.error || "Could not update invite.");
      }
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: "dashboard" },
    { key: "architecture" as const, label: "Architecture", icon: "account_tree" },
    { key: "escrow" as const, label: "Payment & Approval", icon: "verified_user" },
  ];

  return (
    <>
      <main className="lg:p-6 relative min-h-full pb-32 overflow-hidden">
        <div className="px-4 lg:px-0 relative z-10 max-w-6xl mx-auto w-full">

          {/* Header */}
          <header className="mb-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-3 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-black tracking-widest uppercase border border-primary/20">Open Bidding</span>
                  <span className="px-3 py-1 rounded-md text-[10px] bg-surface-container-high border border-outline-variant/20 text-on-surface-variant font-bold uppercase tracking-widest">
                    {project.billing_type === "HOURLY_RETAINER" ? "Hourly Cap" : "Fixed Milestone"}
                  </span>
                  <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border" style={{
                    color: matchScore > 90 ? '#10b981' : '#f59e0b',
                    borderColor: matchScore > 90 ? '#10b98130' : '#f59e0b30',
                    backgroundColor: matchScore > 90 ? '#10b98110' : '#f59e0b10'
                  }}>
                    {matchScore}% Profile Fit
                  </span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-black font-headline tracking-tight text-on-surface leading-tight uppercase">
                  {project.title}
                </h1>
              </div>

              {/* Client Trust Metrics */}
              <div className="bg-surface border border-outline-variant/30 rounded-lg p-5 flex gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Client Spend</p>
                  <p className="text-xl font-black text-on-surface">{formatCurrency(clientTrust.totalSpend)}</p>
                </div>
                <div className="w-px bg-outline-variant/20"></div>
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Avg Rating</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <p className="text-xl font-black text-on-surface">{clientTrust.avgRating ? clientTrust.avgRating.toFixed(1) : "New"}</p>
                  </div>
                  {clientTrust.reviewCount > 0 && (
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {clientTrust.reviewCount} reviews
                    </p>
                  )}
                </div>
                <div className="w-px bg-outline-variant/20"></div>
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Projects</p>
                  <p className="text-xl font-black text-on-surface">{clientTrust.projectCount}</p>
                </div>
              </div>
            </div>
          </header>

          {invite && inviteStatus && (
            <section className="mb-8 rounded-lg border border-primary/20 bg-primary/5 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">mail</span>
                  <div>
                    <p className="text-sm font-black text-on-surface">Invited opportunity</p>
                    <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                      Status: <span className="font-black text-on-surface">{inviteStatus.toLowerCase()}</span>
                    </p>
                  </div>
                </div>
                {(inviteStatus === "SENT" || inviteStatus === "VIEWED") && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleInviteResponse("DECLINED")}
                      disabled={isInvitePending}
                      className="rounded-lg border border-outline-variant/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:border-error/40 hover:text-error disabled:opacity-40"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInviteResponse("ACCEPTED")}
                      disabled={isInvitePending}
                      className="rounded-lg bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      Accept
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {!awardReadiness.ok && (
            <section className="mb-8 rounded-lg border border-secondary/30 bg-secondary/10 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">verified_user</span>
                  <div>
                    <p className="text-sm font-black text-on-surface">Award readiness incomplete</p>
                    <p className="mt-1 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
                      {awardReadiness.message} You can still submit a proposal, but buyers cannot accept it for paid marketplace work until this is complete.
                    </p>
                  </div>
                </div>
                <a
                  href="/settings"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-secondary transition-opacity hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                  Finish verification
                </a>
              </div>
            </section>
          )}

          {existingProposal && (
            <section className="mb-8 rounded-lg border border-tertiary/30 bg-tertiary/10 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary text-[22px] mt-0.5">task_alt</span>
                  <div>
                    <p className="text-sm font-black text-on-surface">Proposal already submitted</p>
                    <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                      {formatCurrency(existingProposal.proposedAmount)} · {existingProposal.estimatedDays} days · {existingProposal.status.toLowerCase().replace(/_/g, " ")} · submitted {formatDate(existingProposal.createdAt)}
                    </p>
                  </div>
                </div>
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary/30 bg-surface px-4 py-3 text-[10px] font-black uppercase tracking-widest text-tertiary transition-colors hover:bg-tertiary/10"
                >
                  <span className="material-symbols-outlined text-[16px]">dashboard</span>
                  Track proposal
                </a>
              </div>
            </section>
          )}

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

              {scopeValidationReport && (
                <ScopeValidationReportCard
                  report={scopeValidationReport}
                  eyebrow="Scope evidence"
                  titlePassed="Buyer scope checks passed."
                  titleAttention="Buyer scope has review items."
                  description="Captured when the project entered the marketplace so your proposal can preserve buyer constraints and price only after any needed clarification."
                  gridClassName="md:grid-cols-2"
                />
              )}

              {/* Scope signal tags */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Detected Scope Signals</h4>
                <div className="flex flex-wrap gap-2">
                  {(technologyTags.length ? technologyTags : ["Scope", "Delivery", "Milestones"]).map((tag) => (
                    <span key={tag} className="px-3 py-2 rounded-md bg-surface-container-low text-on-surface-variant text-xs font-bold border border-outline-variant/20 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all cursor-default">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {matchReasons.length > 0 && (
                <div className="rounded-lg border border-outline-variant/20 bg-surface p-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Profile Fit Evidence</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {matchReasons.map((reason) => (
                      <div key={reason} className="flex items-start gap-2 rounded-md bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="bg-surface border border-outline-variant/20 rounded-lg p-5 text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-2">Milestones</p>
                  <p className="text-3xl font-black text-on-surface">{milestones.length}</p>
                </div>
                <div className="bg-surface border border-outline-variant/20 rounded-lg p-5 text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-2">Total Value</p>
                  <p className="text-3xl font-black text-on-surface">{formatCurrency(totalValue)}</p>
                </div>
                <div className="bg-surface border border-outline-variant/20 rounded-lg p-5 text-center">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-2">Type</p>
                  <p className="text-xl font-black text-on-surface">{project.billing_type === "HOURLY_RETAINER" ? "Hourly" : "Fixed"}</p>
                </div>
                <div className="bg-surface border border-outline-variant/20 rounded-lg p-5 text-center">
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
                  {milestones.map((m, idx) => (
                    <div key={m.id} className="relative pl-16 group">
                      {/* Timeline Node */}
                      <div className="absolute left-0 w-12 h-12 rounded-lg border border-primary/30 bg-surface flex items-center justify-center font-bold text-primary z-10 group-hover:border-primary transition-all">
                        {idx + 1}
                      </div>

                      <div className="bg-surface border border-outline-variant/30 rounded-lg p-6 hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-lg font-black font-headline text-on-surface">{m.title}</h4>
                          <span className="text-xs font-bold px-3 py-1 rounded-md bg-surface-container-high text-on-surface-variant border border-outline-variant/20 shrink-0 ml-4">
                            {formatCurrency(Number(m.amount))}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {m.description || `Milestone phase ${idx + 1} of ${milestones.length}. Payment of ${formatCurrency(Number(m.amount))} released upon client approval.`}
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
                {milestones.map((m, idx) => (
                  <div key={m.id} className="bg-surface border border-outline-variant/30 rounded-lg overflow-hidden">
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
              <div className="bg-surface border border-outline-variant/30 rounded-lg p-8 flex flex-col md:flex-row md:items-center justify-between mt-8">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Total Project Cost</p>
                  <p className="text-2xl font-black text-on-surface tracking-tight">{formatCurrency(totalValue)}</p>
                </div>
                <p className="text-xs text-on-surface-variant max-w-sm mt-4 md:mt-0">Funds are held securely and released only when you approve each milestone.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="hidden md:block">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Total Contract Value</p>
            <p className="text-2xl font-black text-on-surface tracking-tight">{formatCurrency(totalValue)}</p>
          </div>
          {existingProposal ? (
            <div className="rounded-lg border border-tertiary/30 bg-tertiary/10 px-5 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">Proposal submitted</p>
              <p className="text-xs font-bold text-on-surface-variant">
                {existingProposal.status.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setIsBidOpen(true)}
              className="bg-on-surface text-surface px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-on-surface/90 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              Submit Proposal
            </button>
          )}
        </div>
      </div>

      {/* Bid Modal */}
      {isBidOpen && (
        <BidModal
          project={project}
          totalValue={totalValue}
          awardReadiness={awardReadiness}
          originalMilestones={milestones.map((milestone) => ({
            title: milestone.title,
            amount: milestone.amount,
            estimated_duration_days: milestone.estimated_duration_days ?? undefined,
            description: milestone.description ?? undefined,
            deliverables: milestone.deliverables,
            acceptance_criteria: milestone.acceptance_criteria,
          }))}
          advisorPacket={advisorPacket}
          onClose={() => setIsBidOpen(false)}
        />
      )}
    </>
  );
}
