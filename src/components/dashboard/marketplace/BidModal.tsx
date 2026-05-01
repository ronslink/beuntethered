"use client";

import { useState, useTransition } from "react";
import { submitBid } from "@/app/actions/bids";
import { useRouter } from "next/navigation";
import { getMilestoneProofPlan, type MilestoneProofPlan } from "@/lib/milestone-proof";
import type { ProposalAdvisorPacket } from "@/lib/proposal-advisor";

type Mode = "SELECTION" | "QUICK" | "FULL_1" | "FULL_2" | "FULL_3";
type Milestone = {
  title: string;
  amount: string;
  days: string;
  description: string;
  deliverables?: string[];
  acceptance_criteria?: string[];
};
type OriginalMilestone = {
  title: string;
  amount: number;
  estimated_duration_days?: number;
  description?: string;
  deliverables?: string[];
  acceptance_criteria?: string[];
};
type AwardReadiness =
  | { ok: true }
  | { ok: false; code: string; message: string };

const MIN_APPROACH_LENGTH = 20;

const COMMON_STACKS = [
  "React", "Next.js", "Vue", "Angular", "TypeScript", "JavaScript",
  "Node.js", "Go", "Python", "Rust", "Java", "PHP",
  "PostgreSQL", "MySQL", "MongoDB", "Redis",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
  "PyTorch", "TensorFlow", "Langchain",
];

function buildAdvisorApproach(packet?: ProposalAdvisorPacket | null) {
  if (!packet) return "";

  const sections = [
    packet.positioning,
    "",
    "Delivery plan:",
    ...packet.milestoneStrategy.slice(0, 4).map((milestone, index) => (
      `${index + 1}. ${milestone.title}: ${milestone.outcome}`
    )),
    "",
    "Evidence plan:",
    ...packet.evidencePlan.slice(0, 5).map((item) => `- ${item}`),
    "",
    "Buyer questions:",
    ...packet.buyerQuestions.slice(0, 3).map((item) => `- ${item}`),
    "",
    "Risk notes:",
    ...packet.riskNotes.slice(0, 3).map((item) => `- ${item}`),
  ];

  return sections.join("\n").trim();
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function ProofPlanPanel({ plans, compact = false }: { plans: MilestoneProofPlan[]; compact?: boolean }) {
  if (plans.length === 0) return null;

  const artifacts = Array.from(
    new Map(plans.flatMap((plan) => plan.requiredArtifacts).map((artifact) => [artifact.label, artifact])).values()
  ).slice(0, 4);
  const checks = plans.flatMap((plan) => plan.reviewChecks).slice(0, compact ? 2 : 4);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary">rule</span>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-primary">Proof Contract</p>
          <p className="mt-0.5 text-[11px] font-medium leading-4 text-on-surface-variant">
            Your proposal should explain how you will satisfy these evidence requirements.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {artifacts.map((artifact) => (
          <div key={artifact.key} className="rounded-lg border border-outline-variant/20 bg-surface px-3 py-2">
            <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface">
              <span className="material-symbols-outlined text-[12px] text-primary">task_alt</span>
              {artifact.label}
            </p>
            {!compact && <p className="mt-1 text-[10px] font-medium leading-4 text-on-surface-variant">{artifact.detail}</p>}
          </div>
        ))}
      </div>
      {checks.length > 0 && (
        <div className="mt-3 border-t border-primary/10 pt-3">
          <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Buyer Checks</p>
          <div className="space-y-1.5">
            {checks.map((check) => (
              <p key={check} className="flex items-start gap-1.5 text-[10px] font-medium leading-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-[12px] text-primary mt-0.5">check_circle</span>
                {check}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BidModal({
  project,
  totalValue,
  awardReadiness,
  originalMilestones,
  advisorPacket,
  onClose,
}: {
  project: any;
  totalValue: number;
  awardReadiness: AwardReadiness;
  originalMilestones?: OriginalMilestone[];
  advisorPacket?: ProposalAdvisorPacket | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("SELECTION");
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const advisorApproach = buildAdvisorApproach(advisorPacket);

  // Quick bid fields
  const [bidAmount, setBidAmount] = useState("");
  const [days, setDays] = useState("");
  const [approach, setApproach] = useState(advisorApproach);
  const [escrowPct, setEscrowPct] = useState(100);

  // Full proposal fields
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [stackReason, setStackReason] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>(
    advisorPacket?.milestoneStrategy.length
      ? advisorPacket.milestoneStrategy.map((milestone) => ({
          title: milestone.title,
          amount: "",
          days: "",
          description: milestone.outcome,
        }))
      : originalMilestones && originalMilestones.length > 0
      ? originalMilestones.map((m) => ({
          title: m.title,
          amount: "",
          days: "",
          description: m.description || "",
          deliverables: m.deliverables ?? [],
          acceptance_criteria: m.acceptance_criteria ?? [],
        }))
      : [{ title: "Milestone 1", amount: "", days: "", description: "" }]
  );

  const proposedTotal = milestones.reduce((a, m) => a + (parsePositiveNumber(m.amount) ?? 0), 0);
  const proposedDays = milestones.reduce((a, m) => a + (parsePositiveInteger(m.days) ?? 0), 0);
  const originalProofPlans = (originalMilestones ?? []).map((milestone) => getMilestoneProofPlan(milestone));
  const budgetDiff = proposedTotal - totalValue;
  const quickBidAmount = parsePositiveNumber(bidAmount) ?? 0;
  const approachLength = approach.trim().length;
  const approachReady = approachLength >= MIN_APPROACH_LENGTH;
  const approachHelp =
    approachLength === 0
      ? "Add your technical approach before submitting."
      : approachReady
        ? "Enough detail for submission."
        : `Add at least ${MIN_APPROACH_LENGTH - approachLength} more characters.`;

  const format = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !techStack.includes(t)) setTechStack([...techStack, t]);
    setTechInput("");
  };

  const removeTag = (tag: string) => setTechStack(techStack.filter((t) => t !== tag));

  const updateMilestone = (i: number, field: keyof Milestone, value: string) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: value };
    setMilestones(updated);
    setSubmitError(null);
  };

  const addMilestone = () =>
    setMilestones([...milestones, { title: `Milestone ${milestones.length + 1}`, amount: "", days: "", description: "" }]);

  const removeMilestone = (i: number) => {
    if (milestones.length === 1) return;
    setMilestones(milestones.filter((_, idx) => idx !== i));
    setSubmitError(null);
  };

  const handleApproachChange = (value: string) => {
    setApproach(value);
    setSubmitError(null);
  };

  const validateCoreProposal = () => {
    if (!approachReady) return "Add a technical approach of at least 20 characters before submitting.";
    if (!parsePositiveNumber(bidAmount)) return "Enter a proposal price greater than $0.";
    if (!parsePositiveInteger(days)) return "Enter a delivery timeline of at least 1 day.";
    return null;
  };

  const validateFullProposal = () => {
    if (!approachReady) return "Add a technical approach of at least 20 characters before submitting.";
    if (proposedTotal <= 0) return "Your milestone total must be greater than $0.";
    if (milestones.some((m) => !m.title.trim())) return "Every milestone needs a title before submitting.";
    if (milestones.some((m) => !parsePositiveInteger(m.days))) return "Every milestone needs a timeline of at least 1 day.";
    return null;
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateCoreProposal();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    startTransition(async () => {
      const parsedAmount = parsePositiveNumber(bidAmount);
      const parsedDays = parsePositiveInteger(days);
      if (!parsedAmount || !parsedDays) return;
      const res = await submitBid({ projectId: project.id, proposedAmount: parsedAmount, estimatedDays: parsedDays, technicalApproach: approach, requiredEscrowPct: escrowPct });
      if (res?.success) { setSuccess(true); setTimeout(() => router.push("/marketplace"), 1800); }
      else setSubmitError(res?.error || "Failed to submit proposal.");
    });
  };

  const handleFullSubmit = () => {
    const validationError = validateFullProposal();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    startTransition(async () => {
      const res = await submitBid({
        projectId: project.id,
        proposedAmount: proposedTotal,
        estimatedDays: proposedDays,
        technicalApproach: approach,
        proposedTechStack: techStack.join(", "),
        techStackReason: stackReason || undefined,
        proposedMilestones: milestones.map((milestone) => ({
          ...milestone,
          amount: parsePositiveNumber(milestone.amount) ?? 0,
          days: parsePositiveInteger(milestone.days) ?? 0,
        })),
        requiredEscrowPct: escrowPct,
      });
      if (res?.success) { setSuccess(true); setTimeout(() => router.push("/marketplace"), 1800); }
      else setSubmitError(res?.error || "Failed to submit proposal.");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />

      <div className="bg-surface border border-outline-variant/30 rounded-lg w-full max-w-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-7 pb-4 shrink-0">
          <div>
            {mode !== "SELECTION" && (
              <button onClick={() => setMode("SELECTION")} className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary flex items-center gap-1 mb-2 transition-colors">
                <span className="material-symbols-outlined text-[14px]">arrow_back</span> Back
              </button>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Submit Proposal</p>
            <h3 className="text-lg font-black font-headline text-on-surface mt-0.5 leading-tight">{project.title}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-md bg-surface-container-high flex items-center justify-center hover:bg-error/20 hover:text-error transition-colors shrink-0">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* ── Client budget strip ── */}
        {mode !== "SELECTION" && (
          <div className="px-7 pb-2 shrink-0">
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 flex justify-between items-center text-xs">
              <span className="font-bold text-on-surface-variant uppercase tracking-widest text-[9px]">Buyer Budget Reference</span>
              <span className="font-black text-on-surface">{totalValue > 0 ? format(totalValue) : "Buyer TBD"}</span>
            </div>
          </div>
        )}
        {!awardReadiness.ok && (
          <div className="px-7 pb-3 shrink-0">
            <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-[17px] mt-0.5">verified_user</span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-secondary">
                    Award readiness incomplete
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-4 text-on-surface-variant">
                    {awardReadiness.message} Submit when ready, but complete verification before a buyer can award this proposal.
                  </p>
                  <a
                    href="/settings"
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-secondary hover:underline"
                  >
                    Finish verification
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        {advisorPacket && mode !== "SELECTION" && (
          <div className="px-7 pb-3 shrink-0">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[17px] mt-0.5">auto_awesome</span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                    Advisor draft loaded
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-4 text-on-surface-variant">
                    Pre-filled with approach, proof plan, risks, and buyer questions. Enter your own price and timeline before submitting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {success ? (
            <div className="p-16 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-tertiary/10 border border-tertiary/30 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-3xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h3 className="text-2xl font-black font-headline uppercase tracking-tight">Proposal Submitted</h3>
              <p className="text-sm text-on-surface-variant mt-2">AI analysis running in background. Returning to marketplace...</p>
            </div>

          ) : mode === "SELECTION" ? (
            // ── Mode Selection ──
            <div className="p-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode("QUICK")}
                className="group text-left p-6 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-on-surface/10 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined text-on-surface group-hover:text-primary transition-colors">bolt</span>
                </div>
                <h4 className="font-black text-base text-on-surface mb-1">Quick Bid</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">I know exactly what to build. Enter your price, timeline, and approach in one step.</p>
              </button>

              <button
                onClick={() => setMode("FULL_1")}
                className="group text-left p-6 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:border-tertiary/50 hover:bg-tertiary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-tertiary">architecture</span>
                </div>
                <h4 className="font-black text-base text-on-surface mb-1">Full Proposal</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Propose your tech stack, quote milestone amounts, and get AI analysis before you submit.</p>
                <span className="inline-block mt-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-tertiary/10 text-tertiary border border-tertiary/20">Recommended</span>
              </button>
            </div>

          ) : mode === "QUICK" ? (
            // ── Quick Bid Form ──
            <form onSubmit={handleQuickSubmit} className="p-7 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Your Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">$</span>
                    <input type="number" min={1} value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Enter your quote"
                      className="w-full bg-surface border border-outline-variant/30 rounded-xl pl-8 pr-4 py-3 text-lg font-black text-on-surface focus:border-primary outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Delivery (Days)</label>
                  <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)}
                    placeholder="Enter days"
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-lg font-black text-on-surface focus:border-primary outline-none transition-colors" />
                </div>
              </div>
              <ProofPlanPanel plans={originalProofPlans} compact />
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Technical Approach</label>
                <textarea required minLength={MIN_APPROACH_LENGTH} value={approach} onChange={(e) => handleApproachChange(e.target.value)} rows={5}
                  placeholder="Describe your approach, tools, and how you will build this..."
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary outline-none transition-colors resize-none" />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className={`text-[10px] ${approachReady ? "text-on-surface-variant" : "text-error"}`}>{approachHelp}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant">{approachLength}/{MIN_APPROACH_LENGTH} min</p>
                </div>
              </div>
              {submitError && (
                <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-xs font-bold text-error">
                  {submitError}
                </div>
              )}
              {/* Escrow Funding Requirement */}
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Escrow Funding Required Before Start</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">What % of the project value must be in escrow before you begin?</p>
                  </div>
                  <span className="text-sm font-black text-primary">{format(quickBidAmount * escrowPct / 100)}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[10, 25, 50, 75, 100].map(pct => (
                    <button key={pct} type="button" onClick={() => setEscrowPct(pct)}
                      className={`flex-1 min-w-[40px] py-2 rounded-lg text-[10px] font-black border transition-colors ${
                        escrowPct === pct ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary'
                      }`}>{pct}%</button>
                  ))}
                </div>
                {escrowPct < 100 && (
                  <p className="text-[9px] text-on-surface-variant italic">
                    Remainder ({format(quickBidAmount * (100 - escrowPct) / 100)}) due upon milestone completion.
                  </p>
                )}
              </div>
              <button type="submit" disabled={isPending || !approachReady}
                className="w-full bg-on-surface text-surface font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95">
                {isPending ? <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Submitting...</> : approachReady ? <>Submit Bid <span className="material-symbols-outlined text-[16px]">send</span></> : <>Add More Detail <span className="material-symbols-outlined text-[16px]">edit_note</span></>}
              </button>
            </form>

          ) : mode === "FULL_1" ? (
            // ── Full Proposal Step 1: Tech Stack ──
            <div className="p-7 space-y-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Step 1 of 3 - Tech Stack Declaration</p>
                <h4 className="text-base font-black text-on-surface">What technologies will you use?</h4>
                <p className="text-xs text-on-surface-variant mt-1">If your stack differs from the client's SoW, explain why. This is your first competitive signal.</p>
              </div>

              {/* Original SoW stack context */}
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Client SoW (reference)</p>
                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{project.ai_generated_sow?.slice(0, 280)}...</p>
              </div>

              {/* Stack Tag Input */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Your Proposed Stack</label>
                <div className="flex flex-wrap gap-2 mb-3 min-h-[40px] p-3 bg-surface border border-outline-variant/30 rounded-xl">
                  {techStack.map((t) => (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-bold">
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                  <input value={techInput} onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(techInput); } }}
                    placeholder={techStack.length === 0 ? "Type a technology and press Enter..." : "Add more..."}
                    className="bg-transparent outline-none text-xs font-medium text-on-surface flex-1 min-w-[120px]" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_STACKS.filter((s) => !techStack.includes(s)).slice(0, 12).map((s) => (
                    <button key={s} type="button" onClick={() => addTag(s)}
                      className="px-2 py-1 rounded-md border border-outline-variant/30 text-[10px] font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {techStack.length > 0 && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">
                    Reason for stack choice <span className="text-on-surface-variant/50">(optional if same as SoW)</span>
                  </label>
                  <textarea value={stackReason} onChange={(e) => setStackReason(e.target.value)} rows={3}
                    placeholder="Explain why this stack better fits the project requirements..."
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary outline-none transition-colors resize-none" />
                </div>
              )}

              <button onClick={() => setMode("FULL_2")} disabled={techStack.length === 0}
                className="w-full bg-primary text-on-primary font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 hover:-translate-y-0.5">
                Next: Milestone Structure <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>

          ) : mode === "FULL_2" ? (
            // ── Full Proposal Step 2: Milestone Builder ──
            <div className="p-7 space-y-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Step 2 of 3 - Milestone Structure</p>
                <h4 className="text-base font-black text-on-surface">How will you structure delivery?</h4>
                <p className="text-xs text-on-surface-variant mt-1">Edit, split, or restructure the milestones. Buyer amounts are references only; quote your own milestone price and days.</p>
              </div>

              {/* Budget tracker */}
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-xs font-bold">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-on-surface-variant">Your entered total</span>
                  <span className="text-on-surface">{proposedTotal > 0 ? format(proposedTotal) : "Enter milestone prices"}</span>
                </div>
                {totalValue > 0 && (
                  <div className="mt-1 flex items-center justify-between gap-4 text-[10px] text-on-surface-variant">
                    <span>Buyer budget reference</span>
                    <span>
                      {format(totalValue)}
                      {proposedTotal > 0 && budgetDiff !== 0 ? ` (${budgetDiff > 0 ? "+" : ""}${format(budgetDiff)} vs reference)` : ""}
                    </span>
                  </div>
                )}
              </div>

              <ProofPlanPanel plans={originalProofPlans} />

              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <div key={i} className="bg-surface-container-low border border-outline-variant/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Milestone {i + 1}</span>
                      <button type="button" onClick={() => removeMilestone(i)} disabled={milestones.length === 1}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors disabled:opacity-20">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                    <input value={m.title} onChange={(e) => updateMilestone(i, "title", e.target.value)}
                      className="w-full bg-surface border border-outline-variant/20 rounded-lg px-3 py-2 text-sm font-bold text-on-surface outline-none focus:border-primary transition-colors" placeholder="Milestone title" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-bold">$</span>
                        <input type="number" min={1} value={m.amount} onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                          placeholder="Quote"
                          className="w-full bg-surface border border-outline-variant/20 rounded-lg pl-6 pr-3 py-2 text-sm font-black text-on-surface outline-none focus:border-primary transition-colors" />
                      </div>
                      <div className="relative">
                        <input type="number" min={1} value={m.days} onChange={(e) => updateMilestone(i, "days", e.target.value)}
                          placeholder="Days"
                          className="w-full bg-surface border border-outline-variant/20 rounded-lg px-3 py-2 text-sm font-black text-on-surface outline-none focus:border-primary transition-colors" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-bold">days</span>
                      </div>
                    </div>
                    <textarea value={m.description} onChange={(e) => updateMilestone(i, "description", e.target.value)} rows={2}
                      placeholder="What is delivered at this milestone? (optional)"
                      className="w-full bg-surface border border-outline-variant/20 rounded-lg p-3 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors resize-none" />
                  </div>
                ))}
              </div>

              <button type="button" onClick={addMilestone}
                className="w-full py-3 rounded-xl border border-dashed border-outline-variant/40 text-on-surface-variant text-xs font-bold hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">add</span> Add Milestone
              </button>

              <button onClick={() => setMode("FULL_3")}
                className="w-full bg-primary text-on-primary font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                Next: Review & Submit <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>

          ) : mode === "FULL_3" ? (
            // ── Full Proposal Step 3: Review & Submit ──
            <div className="p-7 space-y-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Step 3 of 3 - Review & Submit</p>
                <h4 className="text-base font-black text-on-surface">Finalize your proposal</h4>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Value</p>
                  <p className="text-lg font-black text-primary">{format(proposedTotal)}</p>
                </div>
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Days</p>
                  <p className="text-lg font-black text-on-surface">{proposedDays > 0 ? `${proposedDays}d` : "Enter days"}</p>
                </div>
              </div>

              <ProofPlanPanel plans={originalProofPlans} compact />

              {/* Stack preview */}
              {techStack.length > 0 && (
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {techStack.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestone preview */}
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden">
                {milestones.map((m, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i !== 0 ? "border-t border-outline-variant/10" : ""}`}>
                    <div>
                      <p className="font-bold text-on-surface">{m.title}</p>
                      <p className="text-on-surface-variant">{m.days ? `${m.days} days` : "Timeline TBD"}</p>
                    </div>
                    <p className="font-black text-on-surface">{m.amount ? format(Number(m.amount)) : "Price TBD"}</p>
                  </div>
                ))}
              </div>

              {/* Technical approach */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Technical Approach</label>
                <textarea minLength={MIN_APPROACH_LENGTH} value={approach} onChange={(e) => handleApproachChange(e.target.value)} rows={5}
                  placeholder="Describe your technical approach. How will you use your proposed stack to meet the SoW requirements? What are your key differentiators?"
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary outline-none transition-colors resize-none" />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className={`text-[10px] ${approachReady ? "text-on-surface-variant" : "text-error"}`}>
                    {approachReady ? "AI analysis will run automatically after submission and appear on the client's bid board." : approachHelp}
                  </p>
                  <p className="text-[10px] font-bold text-on-surface-variant">{approachLength}/{MIN_APPROACH_LENGTH} min</p>
                </div>
              </div>

              {/* Escrow Funding Requirement */}
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Escrow Funding Required Before Start</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">What % of the project value must be in escrow before you begin?</p>
                  </div>
                  <span className="text-sm font-black text-primary">{format(proposedTotal * escrowPct / 100)}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[10, 25, 50, 75, 100].map(pct => (
                    <button key={pct} type="button" onClick={() => setEscrowPct(pct)}
                      className={`flex-1 min-w-[40px] py-2 rounded-lg text-[10px] font-black border transition-colors ${
                        escrowPct === pct ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary'
                      }`}>{pct}%</button>
                  ))}
                </div>
                {escrowPct < 100 && (
                  <p className="text-[9px] text-on-surface-variant italic">
                    Remainder ({format(proposedTotal * (100 - escrowPct) / 100)}) due upon milestone completion.
                  </p>
                )}
              </div>

              {submitError && (
                <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-xs font-bold text-error">
                  {submitError}
                </div>
              )}

              <button onClick={handleFullSubmit} disabled={isPending || !approachReady}
                className="w-full bg-on-surface text-surface font-black uppercase tracking-widest text-sm py-4 rounded-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-on-surface/90 active:scale-95">
                {isPending ? <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Submitting...</> : approachReady ? <>Submit Full Proposal <span className="material-symbols-outlined text-[16px]">rocket_launch</span></> : <>Add More Detail <span className="material-symbols-outlined text-[16px]">edit_note</span></>}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
