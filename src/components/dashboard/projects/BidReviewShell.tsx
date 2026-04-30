"use client";

import { useState, useTransition } from "react";
import { acceptBid, counterBid, enterNegotiation, rejectBid, reopenBidding, shortlistBid } from "@/app/actions/bids";
import { useRouter } from "next/navigation";
import { getFacilitatorAwardReadiness } from "@/lib/bid-award-rules";

type Bid = {
  id: string;
  proposed_amount: number;
  estimated_days: number;
  technical_approach: string;
  proposed_tech_stack?: string | null;
  tech_stack_reason?: string | null;
  proposed_milestones?: any;
  counter_amount?: number | null;
  counter_reason?: string | null;
  counter_milestones?: any;
  last_action_by?: string | null;
  negotiation_rounds?: number;
  required_escrow_pct?: number;
  counter_escrow_pct?: number | null;
  status: string;
  ai_score_card?: any;
  developer: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    trust_score?: number | null;
    platform_tier?: string | null;
    total_sprints_completed?: number | null;
    average_ai_audit_score?: number | null;
    skills?: string[];
    ai_agent_stack?: string[];
    portfolio_url?: string | null;
    availability?: string | null;
    stripe_account_id?: string | null;
    verifications?: { type: string; status: string }[];
  };
};

const RECOMMENDATION_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  TOP_PICK: { label: "Top Pick", dot: "bg-[#059669]", text: "text-[#059669]" },
  STRONG: { label: "Strong", dot: "bg-primary", text: "text-primary" },
  REVIEW: { label: "Review", dot: "bg-secondary", text: "text-secondary" },
  CAUTION: { label: "Caution", dot: "bg-error", text: "text-error" },
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-surface-container-high text-on-surface-variant border-outline-variant/30",
  SHORTLISTED: "bg-tertiary/10 text-tertiary border-tertiary/30",
  UNDER_NEGOTIATION: "bg-primary/10 text-primary border-primary/30",
  ACCEPTED: "bg-[#059669]/10 text-[#059669] border-[#059669]/30",
  REJECTED: "bg-error/10 text-error border-error/30",
};

function safeMilestones(value: any): Array<{ title?: string; amount?: number; days?: number; description?: string }> | null {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function verificationSummary(verifications?: { type: string; status: string }[]) {
  const verified = (verifications ?? []).filter((v) => v.status === "VERIFIED");
  const pending = (verifications ?? []).filter((v) => v.status === "PENDING");
  return {
    verified,
    pending,
    label: verified.length > 0 ? `${verified.length} verified` : pending.length > 0 ? `${pending.length} pending` : "Unverified",
  };
}

function TrustEvidence({ developer }: { developer: Bid["developer"] }) {
  const verifications = verificationSummary(developer.verifications);
  const topSkills = (developer.skills ?? []).slice(0, 4);
  const agentStack = (developer.ai_agent_stack ?? []).slice(0, 3);
  const auditScore = developer.average_ai_audit_score ?? 0;

  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/45 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Facilitator Trust Signals</p>
        <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
          verifications.verified.length > 0 ? "border-[#059669]/30 bg-[#059669]/10 text-[#059669]" : "border-outline-variant/30 text-on-surface-variant"
        }`}>
          {verifications.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
        <div>
          <p className="font-bold uppercase tracking-widest text-on-surface-variant">Completed</p>
          <p className="mt-0.5 font-black text-on-surface">{developer.total_sprints_completed ?? 0} milestones</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-widest text-on-surface-variant">Audit Avg</p>
          <p className="mt-0.5 font-black text-on-surface">{auditScore > 0 ? `${Math.round(auditScore)}%` : "No audits"}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-widest text-on-surface-variant">Availability</p>
          <p className="mt-0.5 font-black text-on-surface">{developer.availability || "Not set"}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-widest text-on-surface-variant">Portfolio</p>
          {developer.portfolio_url ? (
            <a href={developer.portfolio_url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex font-black text-primary hover:underline">
              View proof
            </a>
          ) : (
            <p className="mt-0.5 font-black text-on-surface">Missing</p>
          )}
        </div>
      </div>
      {(topSkills.length > 0 || agentStack.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topSkills.map((skill) => (
            <span key={`skill-${skill}`} className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
              {skill}
            </span>
          ))}
          {agentStack.map((tool) => (
            <span key={`agent-${tool}`} className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {tool}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function hasEvidenceLanguage(bid: Bid, milestones: ReturnType<typeof safeMilestones>) {
  const proposalText = [
    bid.technical_approach,
    bid.tech_stack_reason,
    JSON.stringify(milestones ?? []),
    JSON.stringify(bid.ai_score_card?.flags ?? []),
  ].join(" ").toLowerCase();

  return /\b(acceptance|audit|evidence|demo|staging|release|handoff|verification|verified|artifact|report|criteria|test|quality)\b/.test(proposalText);
}

function AwardGateChecklist({
  bid,
  milestones,
  awardReadiness,
}: {
  bid: Bid;
  milestones: ReturnType<typeof safeMilestones>;
  awardReadiness: ReturnType<typeof getFacilitatorAwardReadiness>;
}) {
  const hasMilestonePlan = Boolean(milestones?.length);
  const hasEvidencePlan = hasEvidenceLanguage(bid, milestones);
  const hasEscrowClarity = (bid.required_escrow_pct ?? 0) > 0;
  const aiRecommendation = bid.ai_score_card?.recommendation;
  const aiReady = ["TOP_PICK", "STRONG"].includes(aiRecommendation);

  const gates = [
    {
      label: "Facilitator verified",
      ok: awardReadiness.ok,
      detail: awardReadiness.ok ? "Stripe and required verification gates are ready." : awardReadiness.error,
    },
    {
      label: "Milestone plan present",
      ok: hasMilestonePlan,
      detail: hasMilestonePlan ? `${milestones?.length} milestone${milestones?.length === 1 ? "" : "s"} proposed.` : "Ask for milestone pricing before award.",
    },
    {
      label: "Evidence language included",
      ok: hasEvidencePlan,
      detail: hasEvidencePlan ? "Proposal mentions reviewable proof or acceptance checks." : "Ask what artifact proves each milestone is complete.",
    },
    {
      label: "Escrow ask clear",
      ok: hasEscrowClarity,
      detail: hasEscrowClarity ? `${bid.required_escrow_pct ?? 100}% requested before start.` : "Escrow requirement is missing.",
    },
    {
      label: "AI recommendation acceptable",
      ok: aiReady,
      detail: aiRecommendation ? `${aiRecommendation.replace(/_/g, " ").toLowerCase()} recommendation.` : "AI evidence is still pending.",
    },
  ];
  const readyCount = gates.filter((gate) => gate.ok).length;

  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/45 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Award Gate Checklist</p>
        <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
          readyCount === gates.length ? "border-[#059669]/30 bg-[#059669]/10 text-[#059669]" : "border-secondary/30 bg-secondary/10 text-secondary"
        }`}>
          {readyCount}/{gates.length} ready
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {gates.map((gate) => (
          <div key={gate.label} className="flex items-start gap-2 rounded-md bg-surface px-2.5 py-2 text-[10px]">
            <span className={`material-symbols-outlined mt-0.5 text-[14px] ${gate.ok ? "text-[#059669]" : "text-secondary"}`}>
              {gate.ok ? "check_circle" : "error"}
            </span>
            <div>
              <p className="font-black text-on-surface">{gate.label}</p>
              <p className="mt-0.5 leading-4 text-on-surface-variant">{gate.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreCard({ score }: { score: any }) {
  if (!score) return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3 text-[10px] text-on-surface-variant">
      <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
      AI bid evidence is being generated. The buyer should still compare scope, milestones, and facilitator trust signals before accepting.
    </div>
  );

  const rec = RECOMMENDATION_CONFIG[score.recommendation] || RECOMMENDATION_CONFIG.REVIEW;
  return (
    <div className="mt-3 rounded-lg border border-outline-variant/20 bg-surface-container-low/45 p-3 text-[10px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
          <p className="font-black uppercase tracking-widest text-primary">AI Bid Evidence</p>
        </div>
        <div className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${rec.dot}`} />
          <p className={`font-black uppercase tracking-widest ${rec.text}`}>{rec.label}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-outline-variant/15 bg-surface p-2">
          <p className="font-bold uppercase tracking-widest text-on-surface-variant">Stack Fit</p>
          <p className="mt-0.5 font-black text-on-surface">{score.stack_compatibility ?? "-"}%</p>
        </div>
        <div className="rounded-md border border-outline-variant/15 bg-surface p-2">
          <p className="font-bold uppercase tracking-widest text-on-surface-variant">Price</p>
          <p className={`mt-0.5 font-black ${score.price?.signal === "FAIR" ? "text-[#059669]" : score.price?.signal === "REVIEW" ? "text-secondary" : "text-error"}`}>
            {score.price?.signal ?? "-"} {score.price?.delta_pct != null ? `(${score.price.delta_pct}%)` : ""}
          </p>
        </div>
        <div className="rounded-md border border-outline-variant/15 bg-surface p-2">
          <p className="font-bold uppercase tracking-widest text-on-surface-variant">Timeline</p>
          <p className={`mt-0.5 font-black ${score.timeline?.signal === "REALISTIC" ? "text-[#059669]" : score.timeline?.signal === "TIGHT" ? "text-secondary" : "text-error"}`}>
            {score.timeline?.signal ?? "-"} {score.timeline?.delta_pct != null ? `(${score.timeline.delta_pct}%)` : ""}
          </p>
        </div>
        <div className="rounded-md border border-outline-variant/15 bg-surface p-2">
          <p className="font-bold uppercase tracking-widest text-on-surface-variant">Milestones</p>
          <p className="mt-0.5 font-black text-on-surface">{score.milestone_count ?? "-"}</p>
        </div>
      </div>
      {score.price?.band && (
        <p className="mt-2 text-on-surface-variant">
          Budget evidence band: <strong>${score.price.band.low?.toLocaleString?.() ?? score.price.band.low}</strong> to <strong>${score.price.band.high?.toLocaleString?.() ?? score.price.band.high}</strong>.
        </p>
      )}
      {score.flags?.length > 0 ? (
        <div className="mt-3 space-y-1.5 rounded-md border border-secondary/20 bg-secondary/5 p-2">
          {score.flags.map((f: string, i: number) => (
            <p key={i} className="flex items-start gap-1.5 font-medium text-secondary">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-[12px]">warning</span>
              {f}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 font-medium text-[#059669]">No automated bid risks detected. Still review scope and artifacts before accepting.</p>
      )}
      {score.generated_at && (
        <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
          Generated {new Date(score.generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function BidCard({
  bid, activeBidId, projectBudget, canManageProposals, onCounterOpen
}: {
  bid: Bid; activeBidId?: string | null; projectBudget: number;
  canManageProposals: boolean;
  onCounterOpen: (bid: Bid) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const format = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const isNegotiating = bid.status === "UNDER_NEGOTIATION";
  const isLocked = activeBidId && activeBidId !== bid.id && bid.status !== "REJECTED" && bid.status !== "ACCEPTED";
  const score = bid.ai_score_card;
  const rec = score ? RECOMMENDATION_CONFIG[score.recommendation] : null;
  const statusBadge = STATUS_BADGE[bid.status] || STATUS_BADGE.PENDING;
  const proposedMs = safeMilestones(bid.proposed_milestones);
  const milestoneTotal = proposedMs?.reduce((acc, milestone) => acc + Number(milestone.amount ?? 0), 0) ?? 0;
  const milestoneDays = proposedMs?.reduce((acc, milestone) => acc + Number(milestone.days ?? 0), 0) ?? 0;
  const awardReadiness = getFacilitatorAwardReadiness(bid.developer);

  return (
    <div className={`bg-surface border rounded-lg overflow-hidden transition-all ${isLocked ? "opacity-50 border-outline-variant/15" : isNegotiating ? "border-primary/50" : "border-outline-variant/20 hover:border-outline-variant/40"}`}>
      {/* Card Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {bid.developer.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={bid.developer.image} alt={bid.developer.name || ""} className="w-10 h-10 rounded-xl object-cover border border-outline-variant/30" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm">
              {(bid.developer.name || bid.developer.email).slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-black text-sm text-on-surface">{bid.developer.name || "Anonymous Facilitator"}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {bid.developer.trust_score != null && (
                <span className="text-[9px] font-bold text-tertiary flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  {bid.developer.trust_score} trust
                </span>
              )}
              {bid.developer.platform_tier && (
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{bid.developer.platform_tier}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {rec && (
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border flex items-center gap-1 ${rec.text} bg-current/10`} style={{ borderColor: "currentColor" }}>
              <span className={`w-1.5 h-1.5 rounded-full ${rec.dot}`} /> {rec.label}
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black border ${statusBadge}`}>
            {bid.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Proposal Details */}
      <div className="px-5 pb-4 space-y-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Proposed</p>
            <p className="font-black text-on-surface text-base">{format(bid.proposed_amount)}</p>
            {projectBudget > 0 && (
              <p className={`text-[9px] font-bold ${bid.proposed_amount <= projectBudget ? "text-[#059669]" : "text-secondary"}`}>
                {bid.proposed_amount <= projectBudget ? "Within budget" : `${format(bid.proposed_amount - projectBudget)} over`}
              </p>
            )}
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Timeline</p>
            <p className="font-black text-on-surface text-base">{bid.estimated_days}d</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Milestones</p>
            <p className="font-black text-on-surface text-base">{proposedMs ? proposedMs.length : "-"}</p>
          </div>
        </div>

        <TrustEvidence developer={bid.developer} />
        <AwardGateChecklist bid={bid} milestones={proposedMs} awardReadiness={awardReadiness} />

        {!awardReadiness.ok && (
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2.5 text-xs font-bold text-secondary">
            <span className="material-symbols-outlined mr-1 align-[-3px] text-[15px]">verified_user</span>
            {awardReadiness.error} You can still shortlist or negotiate while they finish trust setup.
          </div>
        )}

        {proposedMs && proposedMs.length > 0 && (
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/45 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Milestone Plan Evidence</p>
              <p className="text-[10px] font-bold text-on-surface-variant">
                {format(milestoneTotal || bid.proposed_amount)} planned · {milestoneDays || bid.estimated_days}d estimated
              </p>
            </div>
            <div className="space-y-2">
              {proposedMs.slice(0, 3).map((milestone, index) => (
                <div key={`${bid.id}-milestone-${index}`} className="grid gap-2 rounded-md bg-surface p-2 text-[10px] sm:grid-cols-[1fr_80px_60px]">
                  <div>
                    <p className="font-black text-on-surface">{milestone.title || `Milestone ${index + 1}`}</p>
                    {milestone.description && (
                      <p className="mt-0.5 line-clamp-2 text-on-surface-variant">{milestone.description}</p>
                    )}
                  </div>
                  <p className="font-black text-on-surface sm:text-right">{milestone.amount ? format(Number(milestone.amount)) : "-"}</p>
                  <p className="font-bold text-on-surface-variant sm:text-right">{milestone.days ? `${milestone.days}d` : "-"}</p>
                </div>
              ))}
              {proposedMs.length > 3 && (
                <p className="text-[10px] font-bold text-on-surface-variant">+ {proposedMs.length - 3} additional milestones in proposal</p>
              )}
            </div>
          </div>
        )}

        {/* Tech Stack */}
        {bid.proposed_tech_stack && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Proposed Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {bid.proposed_tech_stack.split(",").map((t: string) => (
                <span key={t} className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/20 text-[10px] font-bold text-on-surface-variant">{t.trim()}</span>
              ))}
            </div>
            {bid.tech_stack_reason && (
              <p className="text-xs text-on-surface-variant mt-1.5 italic">"{bid.tech_stack_reason}"</p>
            )}
          </div>
        )}

        {/* Escrow Requirement */}
        {(() => {
          const pct = bid.required_escrow_pct ?? 100;
          const counterPct = bid.counter_escrow_pct;
          const amount = Math.round(bid.proposed_amount * pct / 100);
          const isHigh = pct === 100;
          const counterDiffers = counterPct != null && counterPct !== pct;
          return (
            <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs ${
              isHigh ? 'bg-secondary/5 border-secondary/20' : 'bg-surface-container-low border-outline-variant/20'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-on-surface-variant">account_balance</span>
                <span className="font-bold text-on-surface-variant">Escrow Required Before Start</span>
              </div>
              <div className="text-right">
                <span className={`font-black ${isHigh ? 'text-secondary' : 'text-on-surface'}`}>{pct}% / {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(amount)}</span>
                {counterDiffers && (
                  <p className="text-[9px] text-primary font-bold mt-0.5">You countered: {counterPct}%</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Technical Approach */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Approach</p>
          <p className="text-xs text-on-surface font-medium leading-relaxed line-clamp-3">{bid.technical_approach}</p>
        </div>

        {/* Counter offer display */}
        {isNegotiating && bid.counter_reason && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Your Counter Offer - Awaiting Facilitator Response</p>
            <p className="text-xs text-on-surface font-medium">{format(bid.counter_amount || 0)} · "{bid.counter_reason}"</p>
          </div>
        )}

        {/* AI Scorecard */}
        <ScoreCard score={score} />

        {/* Actions */}
        {canManageProposals && !isLocked && bid.status !== "REJECTED" && bid.status !== "ACCEPTED" && (
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {/* Accept directly */}
            <button
              onClick={() => startTransition(async () => { const r = await acceptBid(bid.id); if (r.success) router.push(`/command-center/${r.projectId}`); else alert(r.error); })}
              disabled={isPending || !awardReadiness.ok}
              title={awardReadiness.ok ? "Accept proposal" : awardReadiness.error}
              className="flex-1 px-4 py-2.5 rounded-md bg-[#059669] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#047857] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">check</span> Accept
            </button>

            {/* Enter Negotiation / Counter */}
            {!isNegotiating ? (
              <button
                onClick={() => startTransition(async () => { const r = await enterNegotiation(bid.id); if (!r.success) alert(r.error); })}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">chat</span> Negotiate
              </button>
            ) : (
              <button
                onClick={() => onCounterOpen(bid)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span> Counter
              </button>
            )}

            {/* Shortlist */}
            {bid.status === "PENDING" && (
              <button
                onClick={() => startTransition(async () => { await shortlistBid(bid.id); })}
                disabled={isPending}
                className="px-3 py-2.5 rounded-md border border-outline-variant/30 text-on-surface-variant hover:text-tertiary hover:border-tertiary/40 transition-colors disabled:opacity-40"
                title="Shortlist"
              >
                <span className="material-symbols-outlined text-[18px]">star</span>
              </button>
            )}

            {/* Reject */}
            <button
              onClick={() => startTransition(async () => { if (confirm("Reject this bid?")) await rejectBid(bid.id); })}
              disabled={isPending}
              className="px-3 py-2.5 rounded-md border border-outline-variant/30 text-on-surface-variant hover:text-error hover:border-error/40 transition-colors disabled:opacity-40"
              title="Reject"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CounterModal({ bid, onClose }: { bid: Bid; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(bid.counter_amount || bid.proposed_amount);
  const [reason, setReason] = useState(bid.counter_reason || "");
  const [escrowPct, setEscrowPct] = useState<number>(bid.counter_escrow_pct ?? bid.required_escrow_pct ?? 100);
  const format = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  // AI counter intelligence
  const proposedAmt = bid.proposed_amount;
  const gap = Math.abs(Number(amount) - proposedAmt);
  const gapPct = proposedAmt > 0 ? Math.round((gap / proposedAmt) * 100) : 0;
  const converging = Number(amount) < proposedAmt;
  const likelyAccepted = gapPct <= 10;

  const facilEscrowPct = bid.required_escrow_pct ?? 100;
  const escrowChanged = escrowPct !== facilEscrowPct;

  const handleSubmit = () => {
    if (!reason.trim()) return alert("Please provide a reason for your counter offer.");
    startTransition(async () => {
      const res = await counterBid({ bidId: bid.id, counterAmount: Number(amount), counterReason: reason, counterEscrowPct: escrowChanged ? escrowPct : undefined });
      if (res.success) onClose();
      else alert(res.error);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />
      <div className="bg-surface border border-outline-variant/30 rounded-lg w-full max-w-md relative z-10 p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Counter Offer</p>
            <h3 className="text-lg font-black font-headline text-on-surface mt-0.5">{bid.developer.name || "Facilitator"}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-error/10 hover:text-error transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Original vs counter */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Facilitator's Ask</p>
            <p className="font-black text-on-surface text-base">{format(bid.proposed_amount)}</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary mb-1">Your Counter</p>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-on-surface font-bold">$</span>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                className="bg-transparent pl-4 font-black text-on-surface text-base outline-none w-full" />
            </div>
          </div>
        </div>

        {/* AI Negotiation Intelligence */}
        <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${likelyAccepted ? "bg-[#059669]/10 border-[#059669]/20 text-[#059669]" : converging ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/10 border-secondary/20 text-secondary"}`}>
          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            {likelyAccepted ? "check_circle" : "trending_down"}
          </span>
          <div>
            <p className="font-black mb-0.5">
              {likelyAccepted ? "High chance of acceptance" : `${gapPct}% gap from facilitator's ask`}
            </p>
            <p className="font-medium opacity-80">
              {likelyAccepted
                ? "Counters within 10% of the original ask are accepted 74% of the time."
                : converging
                ? `You're ${format(gap)} apart. Consider whether a milestone restructure could bridge the gap.`
                : "Moving further apart. A counter higher than the ask may seem unusual. Add a clear reason."}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Reason for counter (required)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Explain your counter: budget constraints, scope questions, milestone concerns..."
            className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary outline-none transition-colors resize-none" />
        </div>

        {/* Escrow Counter */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant">account_balance</span>
              <div>
                <p className="font-black text-on-surface-variant uppercase tracking-widest text-[9px]">Escrow Upfront Required</p>
                <p className="text-[9px] text-on-surface-variant mt-0.5">Facilitator's ask: <span className="font-black text-on-surface">{facilEscrowPct}%</span> = {format(bid.proposed_amount * facilEscrowPct / 100)}</p>
              </div>
            </div>
            {escrowChanged && (
              <span className="text-[9px] font-black text-primary">You: {escrowPct}%</span>
            )}
          </div>
          <div className="flex gap-2">
            {[10, 25, 50, 75, 100].map(pct => (
              <button key={pct} type="button" onClick={() => setEscrowPct(pct)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black border transition-colors ${
                  escrowPct === pct ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary'
                }`}>{pct}%</button>
            ))}
          </div>
          {escrowChanged && facilEscrowPct === 100 && escrowPct < 100 && (
            <p className="text-[9px] text-secondary italic">Note: Facilitator requires full upfront funding. Countering below 100% will require their agreement.</p>
          )}
        </div>

        {/* Rounds indicator */}
        {(bid.negotiation_rounds || 0) > 0 && (
          <p className="text-[10px] text-on-surface-variant">Round {(bid.negotiation_rounds || 0) + 1} of 3</p>
        )}

        <button onClick={handleSubmit} disabled={isPending || !reason.trim()}
          className="w-full bg-primary text-on-primary font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 hover:-translate-y-0.5">
          {isPending ? <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Sending...</> : <>Send Counter <span className="material-symbols-outlined text-[15px]">send</span></>}
        </button>
      </div>
    </div>
  );
}

export default function BidReviewShell({
  project,
  bids,
  projectBudget,
  canManageProposals = true,
}: {
  project: { id: string; title: string; status: string; active_bid_id?: string | null };
  bids: Bid[];
  projectBudget: number;
  canManageProposals?: boolean;
}) {
  const [sortBy, setSortBy] = useState<"price" | "days" | "trust" | "ai">("ai");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [counterTarget, setCounterTarget] = useState<Bid | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const format = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const sortedBids = [...bids]
    .filter((b) => filterStatus === "ALL" || b.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "price") return a.proposed_amount - b.proposed_amount;
      if (sortBy === "days") return a.estimated_days - b.estimated_days;
      if (sortBy === "trust") return (b.developer.trust_score || 0) - (a.developer.trust_score || 0);
      if (sortBy === "ai") {
        const rOrder: Record<string, number> = { TOP_PICK: 0, STRONG: 1, REVIEW: 2, CAUTION: 3 };
        return (rOrder[a.ai_score_card?.recommendation] ?? 4) - (rOrder[b.ai_score_card?.recommendation] ?? 4);
      }
      return 0;
    });

  // AI comparative summary
  const scored = bids.filter((b) => b.ai_score_card);
  const topPick = bids.find((b) => b.ai_score_card?.recommendation === "TOP_PICK");
  const lowestPrice = [...bids].sort((a, b) => a.proposed_amount - b.proposed_amount)[0];
  const fastestDays = [...bids].sort((a, b) => a.estimated_days - b.estimated_days)[0];
  const shortlisted = bids.filter((b) => b.status === "SHORTLISTED").length;
  const negotiating = bids.filter((b) => b.status === "UNDER_NEGOTIATION").length;
  const avgBid = bids.length > 0 ? bids.reduce((acc, bid) => acc + bid.proposed_amount, 0) / bids.length : 0;
  const avgDays = bids.length > 0 ? Math.round(bids.reduce((acc, bid) => acc + bid.estimated_days, 0) / bids.length) : 0;
  const budgetSpread = projectBudget > 0 && avgBid > 0 ? Math.round(((avgBid - projectBudget) / projectBudget) * 100) : 0;

  const allRejected = bids.length > 0 && bids.every((b) => b.status === "REJECTED");

  return (
    <div className="min-h-full pb-24 relative">
      <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-outline-variant/20 rounded-lg p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Budget</p>
          <p className="text-xl font-black text-on-surface">{format(projectBudget)}</p>
        </div>
        <div className="bg-surface border border-outline-variant/20 rounded-lg p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Average Bid</p>
          <p className="text-xl font-black text-on-surface">{avgBid ? format(avgBid) : "-"}</p>
          {avgBid > 0 && (
            <p className={`text-[9px] font-bold ${budgetSpread <= 0 ? "text-[#059669]" : "text-secondary"}`}>
              {budgetSpread <= 0 ? `${Math.abs(budgetSpread)}% under budget` : `${budgetSpread}% over budget`}
            </p>
          )}
        </div>
        <div className="bg-surface border border-outline-variant/20 rounded-lg p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Average Timeline</p>
          <p className="text-xl font-black text-on-surface">{avgDays ? `${avgDays}d` : "-"}</p>
        </div>
        <div className="bg-surface border border-outline-variant/20 rounded-lg p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Action Queue</p>
          <p className="text-xl font-black text-on-surface">{shortlisted + negotiating}</p>
          <p className="text-[9px] font-bold text-on-surface-variant">{shortlisted} shortlisted / {negotiating} negotiating</p>
        </div>
      </div>

      {/* AI Comparative Summary */}
      {scored.length > 0 && (
        <div className="mb-6 bg-surface border border-outline-variant/20 rounded-lg p-5 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">AI Comparative Analysis</p>
          </div>
          <div className="space-y-1.5 text-xs text-on-surface font-medium">
            {topPick && <p><strong>{topPick.developer.name || "Top facilitator"}</strong> is the AI top pick: strong stack compatibility, timeline fit, and pricing evidence.</p>}
            {lowestPrice && lowestPrice.id !== topPick?.id && <p><strong>{lowestPrice.developer.name || "Lowest bidder"}</strong> offers the lowest price at <strong>{format(lowestPrice.proposed_amount)}</strong>{lowestPrice.ai_score_card?.flags?.length > 0 ? ". Review AI flags before shortlisting." : "."}</p>}
            {fastestDays && fastestDays.id !== topPick?.id && <p><strong>{fastestDays.developer.name || "Fastest bidder"}</strong> proposes the shortest timeline at <strong>{fastestDays.estimated_days} days</strong>.</p>}
            {!topPick && <p>All bids are competitive. Sort by AI score or price to compare.</p>}
          </div>
        </div>
      )}

      {bids.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-[#059669]/20 bg-[#059669]/5 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#059669]">Accept when</p>
            <p className="mt-2 text-xs font-medium leading-5 text-on-surface-variant">
              Scope, milestones, escrow amount, and trust signals are clear enough to start funded delivery.
            </p>
          </div>
          <div className="rounded-lg border border-tertiary/20 bg-tertiary/5 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-tertiary">Shortlist when</p>
            <p className="mt-2 text-xs font-medium leading-5 text-on-surface-variant">
              The facilitator looks credible, but you want to compare against another strong bid before locking in.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary">Negotiate when</p>
            <p className="mt-2 text-xs font-medium leading-5 text-on-surface-variant">
              Price, escrow, timeline, or milestone shape needs adjustment but the proposal is otherwise viable.
            </p>
          </div>
          <div className="rounded-lg border border-error/20 bg-error/5 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-error">Decline when</p>
            <p className="mt-2 text-xs font-medium leading-5 text-on-surface-variant">
              Evidence is thin, risks are unresolved, or the proposal cannot be made safe with a counteroffer.
            </p>
          </div>
        </div>
      )}

      {bids.length > 0 && (
        <div className="mb-6 overflow-x-auto border border-outline-variant/20 rounded-lg bg-surface">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-surface-container-low border-b border-outline-variant/20">
              <tr className="text-[9px] uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3 font-black">Facilitator</th>
                <th className="px-4 py-3 font-black">Decision</th>
                <th className="px-4 py-3 font-black">Amount</th>
                <th className="px-4 py-3 font-black">Timeline</th>
                <th className="px-4 py-3 font-black">Escrow</th>
                <th className="px-4 py-3 font-black">Trust</th>
                <th className="px-4 py-3 font-black">AI Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {sortedBids.map((bid) => {
                const rec = bid.ai_score_card ? RECOMMENDATION_CONFIG[bid.ai_score_card.recommendation] || RECOMMENDATION_CONFIG.REVIEW : null;
                const budgetDelta = projectBudget > 0 ? bid.proposed_amount - projectBudget : 0;
                const verifications = verificationSummary(bid.developer.verifications);
                return (
                  <tr key={bid.id} className="hover:bg-surface-container-low/40">
                    <td className="px-4 py-3 font-bold text-on-surface">{bid.developer.name || bid.developer.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${STATUS_BADGE[bid.status] || STATUS_BADGE.PENDING}`}>
                        {bid.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-black text-on-surface">{format(bid.proposed_amount)}</p>
                      {projectBudget > 0 && (
                        <p className={`text-[9px] font-bold ${budgetDelta <= 0 ? "text-[#059669]" : "text-secondary"}`}>
                          {budgetDelta <= 0 ? "In budget" : `${format(budgetDelta)} over`}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-on-surface">{bid.estimated_days}d</td>
                    <td className="px-4 py-3 font-bold text-on-surface">{bid.required_escrow_pct ?? 100}%</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-on-surface">{bid.developer.trust_score ?? "-"}{bid.developer.platform_tier ? ` / ${bid.developer.platform_tier}` : ""}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{verifications.label}</p>
                    </td>
                    <td className="px-4 py-3">
                      {rec ? (
                        <span className={`font-black ${rec.text}`}>{rec.label}</span>
                      ) : (
                        <span className="text-on-surface-variant">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Negotiation Health Monitor */}
      {project.active_bid_id && (() => {
        const activeBid = bids.find((b) => b.id === project.active_bid_id);
        if (!activeBid) return null;
        const rounds = activeBid.negotiation_rounds || 0;
        const hasCounter = !!activeBid.counter_amount;
        const gap = hasCounter ? Math.abs(Number(activeBid.counter_amount) - activeBid.proposed_amount) : null;
        const gapPct = gap && activeBid.proposed_amount > 0 ? Math.round((gap / activeBid.proposed_amount) * 100) : null;
        return (
          <div className="mb-6 bg-primary/5 border border-primary/20 rounded-lg p-5 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Active Negotiation</p>
              <span className="text-[9px] font-bold text-on-surface-variant">Round {rounds} / 3</span>
            </div>
            <p className="text-sm font-bold text-on-surface">{activeBid.developer.name || "Facilitator"} · Negotiating</p>
            {gapPct !== null && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 bg-surface-container-high rounded-full h-1.5">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${Math.max(5, 100 - gapPct)}%` }} />
                </div>
                <p className="text-[10px] font-bold text-on-surface-variant shrink-0">
                  {gapPct <= 5 ? "Almost there!" : gapPct <= 15 ? "Converging" : "Wide gap"}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Re-open bidding (when all bids are rejected) */}
      {allRejected && canManageProposals && (
        <div className="mb-6 bg-surface border border-outline-variant/20 rounded-lg p-6 text-center relative z-10">
          <span className="material-symbols-outlined text-[48px] text-outline-variant/40 mb-3 block">storefront</span>
          <h3 className="font-black text-on-surface uppercase tracking-tight mb-1">All Proposals Rejected</h3>
          <p className="text-sm text-on-surface-variant mb-4">Re-open bidding to invite fresh proposals from new facilitators.</p>
          <button
            onClick={() => startTransition(async () => { await reopenBidding(project.id); router.refresh(); })}
            disabled={isPending}
            className="px-6 py-2.5 rounded-md bg-primary text-on-primary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-40"
          >
            Re-open Bidding
          </button>
        </div>
      )}

      {!canManageProposals && bids.length > 0 && (
        <div className="mb-6 rounded-lg border border-outline-variant/20 bg-surface p-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          View-only workspace access. Ask an owner or admin to shortlist, negotiate, accept, or reject proposals.
        </div>
      )}

      {/* Controls */}
      {bids.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant/20 rounded-lg p-1">
            {(["ai", "price", "days", "trust"] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${sortBy === s ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                {s === "ai" ? "AI Score" : s === "price" ? "Price ↑" : s === "days" ? "Speed ↑" : "Trust ↓"}
              </button>
            ))}
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 py-2 text-[10px] font-bold text-on-surface outline-none cursor-pointer">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="UNDER_NEGOTIATION">In Negotiation</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <p className="text-[10px] text-on-surface-variant ml-auto">{sortedBids.length} shown</p>
        </div>
      )}

      {/* Bid Cards */}
      <div className="space-y-4 relative z-10">
        {sortedBids.length === 0 ? (
          <div className="bg-surface border border-outline-variant/20 rounded-lg p-16 text-center">
            <span className="material-symbols-outlined text-[56px] text-outline-variant/40 block mb-4">gavel</span>
            <h3 className="font-black text-on-surface uppercase tracking-tight mb-2">No Bids Yet</h3>
            <p className="text-sm text-on-surface-variant">This project is open for proposals. Facilitators will appear here as they submit bids.</p>
          </div>
        ) : (
          sortedBids.map((bid) => (
            <BidCard
              key={bid.id}
              bid={bid}
              activeBidId={project.active_bid_id}
              projectBudget={projectBudget}
              canManageProposals={canManageProposals}
              onCounterOpen={setCounterTarget}
            />
          ))
        )}
      </div>

      {counterTarget && canManageProposals && <CounterModal bid={counterTarget} onClose={() => setCounterTarget(null)} />}
    </div>
  );
}
