"use client";

import { useState, useTransition } from "react";
import { submitBid } from "@/app/actions/bids";
import { useRouter } from "next/navigation";

type Mode = "SELECTION" | "QUICK" | "FULL_1" | "FULL_2" | "FULL_3";
type Milestone = { title: string; amount: number; days: number; description: string };

const COMMON_STACKS = [
  "React", "Next.js", "Vue", "Angular", "TypeScript", "JavaScript",
  "Node.js", "Go", "Python", "Rust", "Java", "PHP",
  "PostgreSQL", "MySQL", "MongoDB", "Redis",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
  "PyTorch", "TensorFlow", "Langchain",
];

export default function BidModal({
  project,
  totalValue,
  originalMilestones,
  onClose,
}: {
  project: any;
  totalValue: number;
  originalMilestones?: { title: string; amount: number; estimated_duration_days?: number; description?: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("SELECTION");
  const [success, setSuccess] = useState(false);

  // Quick bid fields
  const [bidAmount, setBidAmount] = useState(totalValue);
  const [days, setDays] = useState(14);
  const [approach, setApproach] = useState("");
  const [escrowPct, setEscrowPct] = useState(100);

  // Full proposal fields
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [stackReason, setStackReason] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>(
    originalMilestones && originalMilestones.length > 0
      ? originalMilestones.map((m) => ({
          title: m.title,
          amount: Number(m.amount),
          days: m.estimated_duration_days || 7,
          description: m.description || "",
        }))
      : [{ title: "Milestone 1", amount: totalValue, days: 14, description: "" }]
  );

  const proposedTotal = milestones.reduce((a, m) => a + m.amount, 0);
  const budgetDiff = proposedTotal - totalValue;

  const format = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !techStack.includes(t)) setTechStack([...techStack, t]);
    setTechInput("");
  };

  const removeTag = (tag: string) => setTechStack(techStack.filter((t) => t !== tag));

  const updateMilestone = (i: number, field: keyof Milestone, value: string | number) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: value };
    setMilestones(updated);
  };

  const addMilestone = () =>
    setMilestones([...milestones, { title: `Milestone ${milestones.length + 1}`, amount: 0, days: 7, description: "" }]);

  const removeMilestone = (i: number) => {
    if (milestones.length === 1) return;
    setMilestones(milestones.filter((_, idx) => idx !== i));
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approach.trim()) return;
    startTransition(async () => {
      const res = await submitBid({ projectId: project.id, proposedAmount: bidAmount, estimatedDays: days, technicalApproach: approach, requiredEscrowPct: escrowPct });
      if (res?.success) { setSuccess(true); setTimeout(() => router.push("/marketplace"), 1800); }
      else alert(res?.error || "Failed to submit.");
    });
  };

  const handleFullSubmit = () => {
    if (!approach.trim()) return;
    startTransition(async () => {
      const res = await submitBid({
        projectId: project.id,
        proposedAmount: proposedTotal,
        estimatedDays: milestones.reduce((a, m) => a + m.days, 0),
        technicalApproach: approach,
        proposedTechStack: techStack.join(", "),
        techStackReason: stackReason || undefined,
        proposedMilestones: milestones,
        requiredEscrowPct: escrowPct,
      });
      if (res?.success) { setSuccess(true); setTimeout(() => router.push("/marketplace"), 1800); }
      else alert(res?.error || "Failed to submit.");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />

      <div className="bg-surface border border-outline-variant/30 rounded-3xl w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">

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
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-error/20 hover:text-error transition-colors shrink-0">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* ── Client budget strip ── */}
        {mode !== "SELECTION" && (
          <div className="px-7 pb-2 shrink-0">
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 flex justify-between items-center text-xs">
              <span className="font-bold text-on-surface-variant uppercase tracking-widest text-[9px]">Client Budget</span>
              <span className="font-black text-on-surface">{format(totalValue)}</span>
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {success ? (
            <div className="p-16 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-tertiary/10 border border-tertiary/30 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h3 className="text-2xl font-black font-headline uppercase tracking-tight">Proposal Submitted</h3>
              <p className="text-sm text-on-surface-variant mt-2">AI analysis running in background. Returning to marketplace...</p>
            </div>

          ) : mode === "SELECTION" ? (
            // ── Mode Selection ──
            <div className="p-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode("QUICK")}
                className="group text-left p-6 rounded-2xl border border-outline-variant/30 bg-surface-container-low hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-on-surface/10 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined text-on-surface group-hover:text-primary transition-colors">bolt</span>
                </div>
                <h4 className="font-black text-base text-on-surface mb-1">Quick Bid</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">I know exactly what to build. Set price, timeline, and write your approach in one step.</p>
              </button>

              <button
                onClick={() => setMode("FULL_1")}
                className="group text-left p-6 rounded-2xl border border-outline-variant/30 bg-surface-container-low hover:border-tertiary/50 hover:bg-tertiary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-tertiary">architecture</span>
                </div>
                <h4 className="font-black text-base text-on-surface mb-1">Full Proposal</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Propose your tech stack, build a custom milestone structure, and get AI analysis before you submit.</p>
                <span className="inline-block mt-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20">Recommended</span>
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
                    <input type="number" required min={1} value={bidAmount} onChange={(e) => setBidAmount(Number(e.target.value))}
                      className="w-full bg-surface border border-outline-variant/30 rounded-xl pl-8 pr-4 py-3 text-lg font-black text-on-surface focus:border-primary outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Delivery (Days)</label>
                  <input type="number" required min={1} value={days} onChange={(e) => setDays(Number(e.target.value))}
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-lg font-black text-on-surface focus:border-primary outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Technical Approach</label>
                <textarea required value={approach} onChange={(e) => setApproach(e.target.value)} rows={5}
                  placeholder="Describe your approach, tools, and how you will build this..."
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary outline-none transition-colors resize-none" />
              </div>
              {/* Escrow Funding Requirement */}
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Escrow Funding Required Before Start</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">What % of the project value must be in escrow before you begin?</p>
                  </div>
                  <span className="text-sm font-black text-primary">{format(bidAmount * escrowPct / 100)}</span>
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
                    Remainder ({format(bidAmount * (100 - escrowPct) / 100)}) due upon milestone completion.
                  </p>
                )}
              </div>
              <button type="submit" disabled={isPending || !approach.trim()}
                className="w-full bg-on-surface text-surface font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95">
                {isPending ? <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Submitting...</> : <>Submit Bid <span className="material-symbols-outlined text-[16px]">send</span></>}
              </button>
            </form>

          ) : mode === "FULL_1" ? (
            // ── Full Proposal Step 1: Tech Stack ──
            <div className="p-7 space-y-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Step 1 of 3 — Tech Stack Declaration</p>
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
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Step 2 of 3 — Milestone Structure</p>
                <h4 className="text-base font-black text-on-surface">How will you structure delivery?</h4>
                <p className="text-xs text-on-surface-variant mt-1">Edit, split, or restructure the milestones. Each milestone is a separate Escrow payment.</p>
              </div>

              {/* Budget tracker */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold ${Math.abs(budgetDiff) < 100 ? "bg-[#059669]/10 border-[#059669]/30 text-[#059669]" : budgetDiff > 0 ? "bg-secondary/10 border-secondary/30 text-secondary" : "bg-error/10 border-error/30 text-error"}`}>
                <span>Proposed Total</span>
                <span>{format(proposedTotal)} {budgetDiff !== 0 && <span className="opacity-70">({budgetDiff > 0 ? "+" : ""}{format(budgetDiff)} vs. client budget)</span>}</span>
              </div>

              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <div key={i} className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4 space-y-3">
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
                        <input type="number" min={0} value={m.amount} onChange={(e) => updateMilestone(i, "amount", Number(e.target.value))}
                          className="w-full bg-surface border border-outline-variant/20 rounded-lg pl-6 pr-3 py-2 text-sm font-black text-on-surface outline-none focus:border-primary transition-colors" />
                      </div>
                      <div className="relative">
                        <input type="number" min={1} value={m.days} onChange={(e) => updateMilestone(i, "days", Number(e.target.value))}
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
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Step 3 of 3 — Review & Submit</p>
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
                  <p className="text-lg font-black text-on-surface">{milestones.reduce((a, m) => a + m.days, 0)}d</p>
                </div>
              </div>

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
                      <p className="text-on-surface-variant">{m.days} days</p>
                    </div>
                    <p className="font-black text-on-surface">{format(m.amount)}</p>
                  </div>
                ))}
              </div>

              {/* Technical approach */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest block text-on-surface-variant mb-2">Technical Approach</label>
                <textarea value={approach} onChange={(e) => setApproach(e.target.value)} rows={5}
                  placeholder="Describe your technical approach. How will you use your proposed stack to meet the SoW requirements? What are your key differentiators?"
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface focus:border-primary outline-none transition-colors resize-none" />
                <p className="text-[10px] text-on-surface-variant mt-1.5">💡 AI analysis will run automatically after submission and appear on the client's bid board.</p>
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

              <button onClick={handleFullSubmit} disabled={isPending || !approach.trim()}
                className="w-full bg-on-surface text-surface font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                {isPending ? <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Submitting...</> : <>Submit Full Proposal <span className="material-symbols-outlined text-[16px]">rocket_launch</span></>}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
