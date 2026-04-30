"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { postProjectToMarketplace } from "@/app/actions/marketplace";
import { fetchRecommendedSquad } from "@/app/actions/concierge";
import {
  alignMilestoneDurationsToTimeline,
  assessMilestoneQuality,
  extractRequestedTimelineDays,
  normalizeGeneratedSow,
  type MilestoneQualityAssessment,
} from "@/lib/milestone-quality";
import {
  extractBudgetAmountConstraint,
  extractBudgetConstraint,
  extractCentralComponentConstraints,
  extractRegionConstraints,
  summarizeScopeConstraints,
} from "@/lib/scope-constraints";
import { assessScopeIntake } from "@/lib/scope-intake-quality";

export default function ProjectCreationWizard() {
  const router = useRouter();

  // State Machine Arrays
  const [step, setStep] = useState<number>(1);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"EXECUTION" | "DISCOVERY">("EXECUTION");
  const [desiredTimeline, setDesiredTimeline] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sowData, setSowData] = useState<any>(null);

  // Triage state
  const [triageResult, setTriageResult] = useState<any>(null);
  const [rejectionMessage, setRejectionMessage] = useState("");

  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState("");
  const [squad, setSquad] = useState<any[]>([]);
  const [selectedFacilitators, setSelectedFacilitators] = useState<string[]>([]);
  const [isSquadLoading, setIsSquadLoading] = useState(false);

  // Mutator to structurally lock down edits natively overwriting stream states
  const [editableSoW, setEditableSoW] = useState<any>(null);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [biddingClosesAt, setBiddingClosesAt] = useState<string>(() => {
    // Default: 7 days from today
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (sowData && !isGenerating) {
       setEditableSoW(normalizeGeneratedSow(sowData));
    }
  }, [sowData, isGenerating]);

  // Loading status messages - plain English, no jargon.
  useEffect(() => {
    if (isGenerating && !sowData) {
      if (triageResult) {
        setLoadingStatus(`Generating your ${triageResult.summary || 'project'} scope...`);
      } else {
        setLoadingStatus("Understanding your request...");
      }
    }
  }, [isGenerating, sowData, triageResult]);

  // Hook natively directly shifting step maps tracking exact stream cascades!
  useEffect(() => {
    if (sowData && !isGenerating && step === 1) {
       setStep(2);
    }
  }, [sowData, isGenerating, step]);

  const updateSoWField = (field: string, value: string) => {
    if (!editableSoW) return;
    setEditableSoW({ ...editableSoW, [field]: value });
  };

  const updateMilestoneField = (index: number, field: string, value: string | number) => {
    if (!editableSoW) return;
    const newMilestones = [...editableSoW.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };

    // Recalc total if amount changed
    if (field === 'amount') {
      const newTotal = newMilestones.reduce((acc: number, m: any) => acc + (Number(m.amount) || 0), 0);
      setEditableSoW({ ...editableSoW, milestones: newMilestones, totalAmount: newTotal });
    } else {
      setEditableSoW({ ...editableSoW, milestones: newMilestones });
    }
  };

  const applyMilestoneQualityFixes = (index: number) => {
    if (!editableSoW) return;
    const assessment = assessMilestoneQuality(editableSoW.milestones[index]);
    const newMilestones = [...editableSoW.milestones];
    newMilestones[index] = {
      ...newMilestones[index],
      ...assessment.normalized,
      amount: Number(newMilestones[index].amount) > 0 ? newMilestones[index].amount : assessment.normalized.amount,
    };
    const requestedTimelineDays = extractRequestedTimelineDays(desiredTimeline, prompt);
    const nextSow = {
      ...editableSoW,
      milestones: newMilestones,
    };
    setEditableSoW(alignMilestoneDurationsToTimeline(nextSow, requestedTimelineDays));
    setToastMessage("Applied safe scope fixes. Review anything still highlighted.");
    setTimeout(() => setToastMessage(""), 2400);
  };

  const guidanceForIssue = (issue: string) => {
    if (issue.includes("specific outcome title")) {
      return "Name the buyer-visible result, for example: Payment Checkout Flow, Admin Reporting Dashboard, or Mobile App Prototype.";
    }
    if (issue.includes("description")) {
      return "Answer: what will exist after this milestone, who uses it, and why it matters to the project outcome?";
    }
    if (issue.includes("tangible deliverables")) {
      return "Add outputs the buyer can open, use, inspect, or download, such as a screen, workflow, API endpoint, report, source archive, or handoff file.";
    }
    if (issue.includes("process-only")) {
      return "Testing and bug fixes are important, but they should verify a tangible release. Move them into acceptance criteria as QA evidence or a resolved defect log.";
    }
    if (issue.includes("acceptance criteria")) {
      return "Write pass/fail checks: Buyer can..., User can..., API returns..., Webhook records..., Report includes...";
    }
    if (issue.includes("proof artifact")) {
      return "Name the evidence required for approval: preview link, staging URL, screenshot, source archive, QA report, logs, or handoff notes.";
    }
    if (issue.includes("amount")) {
      return "Set a real fundable milestone amount. If pricing is uncertain, use your best placeholder and refine it on the pricing step.";
    }
    if (issue.includes("duration")) {
      return "Use a realistic checkpoint duration. Most fundable milestones should be small enough to review within 3-15 days.";
    }
    return "Tighten this milestone until a non-technical buyer can understand what they will receive and how they will approve it.";
  };

  const updateDeliverable = (milestoneIdx: number, deliverableIdx: number, value: string) => {
    if (!editableSoW) return;
    const newMilestones = [...editableSoW.milestones];
    const newDeliverables = [...newMilestones[milestoneIdx].deliverables];
    newDeliverables[deliverableIdx] = value;
    newMilestones[milestoneIdx] = { ...newMilestones[milestoneIdx], deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const addDeliverable = (milestoneIdx: number) => {
    if (!editableSoW) return;
    const newMilestones = [...editableSoW.milestones];
    const newDeliverables = [...newMilestones[milestoneIdx].deliverables, ""];
    newMilestones[milestoneIdx] = { ...newMilestones[milestoneIdx], deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const removeDeliverable = (milestoneIdx: number, deliverableIdx: number) => {
    if (!editableSoW) return;
    const newMilestones = [...editableSoW.milestones];
    const newDeliverables = newMilestones[milestoneIdx].deliverables.filter((_: any, i: number) => i !== deliverableIdx);
    newMilestones[milestoneIdx] = { ...newMilestones[milestoneIdx], deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || prompt.trim().length < 5) return;

    setIsGenerating(true);
    setSowData(null);
    setEditableSoW(null);
    setActivePhaseIndex(0);
    setTriageResult(null);
    setRejectionMessage("");

    try {
      const intakeAssessment = assessScopeIntake(prompt);
      if (intakeAssessment.status === "needs_detail") {
        setToastMessage("Add the missing scope details highlighted by the advisor.");
        setTimeout(() => setToastMessage(""), 2400);
        setIsGenerating(false);
        return;
      }

      // Step 1: Fast triage via M2.7-highspeed (sub-second)
      const triageRes = await fetch("/api/ai/triage-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const triage = await triageRes.json();

      // Check if request is out of scope
      if (!triage.in_scope) {
        setRejectionMessage(triage.reason || "This does not look like verifiable software delivery. Untether is focused on human-led, AI-assisted software projects with clear milestone evidence.");
        setIsGenerating(false);
        return;
      }

      // Show triage classification to user
      setTriageResult(triage);
      setLoadingStatus(`Looks like ${triage.summary?.toLowerCase() || 'a project'}. Generating your scope now...`);

      const promptTimelineDays = extractRequestedTimelineDays(prompt);
      const effectiveDesiredTimeline = desiredTimeline.trim() || (
        promptTimelineDays ? `${promptTimelineDays} days` : ""
      );

      // Step 2: Generate SOW routed by category + complexity
      const response = await fetch("/api/ai/generate-sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          desiredTimeline: effectiveDesiredTimeline,
          category: triage.category,
          complexity: triage.complexity,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSowData(data);
    } catch (err: any) {
      console.error(err);
      setRejectionMessage(err.message || "Something went wrong generating your scope. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadConciergeSquad = async () => {
    setIsSquadLoading(true);
    setStep(4);

    // Call server action explicitly matching vectors
    const res = await fetchRecommendedSquad(editableSoW?.executiveSummary || "General project summary.");
    if (res.success && res.matchData) {
      setSquad(res.matchData);
    }

    setIsSquadLoading(false);
  };

  const handleSkipAndPostToMarketplace = () => {
    startTransition(async () => {
      const finalPayload = {
         ...(editableSoW || sowData),
         mode,
         selected_facilitators: [],
         biddingClosesAt,
      };

      const res = await postProjectToMarketplace(finalPayload);
      if (res.success) {
        setToastMessage("Creating project and redirecting to payment...");
        setTimeout(() => {
          router.push(`/stripe/checkout?projectId=${res.projectId}`);
        }, 2000);
      } else {
        alert(res.error);
      }
    });
  }

  const handlePostToMarketplace = () => {
    startTransition(async () => {
      // Package the data mapping dynamically
      const finalPayload = {
         ...(editableSoW || sowData),
         mode,
         selected_facilitators: selectedFacilitators,
         biddingClosesAt,
      };

      const res = await postProjectToMarketplace(finalPayload);
      if (res.success) {
        setToastMessage("Project Bound and Dispatched Successfully.");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        alert(res.error);
      }
    });
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const milestoneQualityAssessments: MilestoneQualityAssessment[] = Array.isArray(editableSoW?.milestones)
    ? editableSoW.milestones.map((milestone: any) => assessMilestoneQuality(milestone))
    : [];
  const activeMilestoneQuality = step === 2 && activePhaseIndex < milestoneQualityAssessments.length
    ? milestoneQualityAssessments[activePhaseIndex]
    : null;
  const allMilestonesReady = milestoneQualityAssessments.length > 0 && milestoneQualityAssessments.every((assessment) => assessment.passes);
  const milestoneIssueCount = milestoneQualityAssessments.reduce((sum: number, assessment) => sum + assessment.blockingIssues.length, 0);
  const requestedTimelineDays = extractRequestedTimelineDays(desiredTimeline, prompt);
  const capturedScopeConstraints = summarizeScopeConstraints({
    regions: extractRegionConstraints(prompt),
    components: extractCentralComponentConstraints(prompt),
    budget: extractBudgetConstraint(prompt),
    budgetAmount: extractBudgetAmountConstraint(prompt),
    timelineDays: requestedTimelineDays,
  });
  const intakeAssessment = assessScopeIntake(prompt);
  const intakeBlockers = intakeAssessment.issues.filter((issue) => issue.severity === "blocker");
  const intakeWarnings = intakeAssessment.issues.filter((issue) => issue.severity === "warning");
  const hasIntakeBlockers = prompt.trim().length >= 5 && intakeBlockers.length > 0;

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-5rem)] flex flex-col relative overflow-hidden">
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
           <div className="bg-surface border border-tertiary/40 p-4 rounded-lg flex items-center gap-4 min-w-[350px]">
              <div className="w-10 h-10 rounded-lg bg-tertiary/20 flex items-center justify-center shrink-0">
                 <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <div>
                 <p className="text-on-surface font-bold font-headline">{toastMessage}</p>
                 <p className="text-xs text-on-surface-variant">{toastMessage.includes("Applied") ? "Review the highlighted scope details." : "Redirecting..."}</p>
              </div>
           </div>
        </div>
      )}

      {/* State Machine Step Tracker */}
      <div className="w-full max-w-4xl mx-auto mb-8 px-4">
         <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-surface-container-low/50 z-0 rounded-md overflow-hidden">
               <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
            </div>

            {[1, 2, 3, 4].map(s => (
               <div key={s} className="relative z-10 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm font-headline transition-all duration-500 border border-outline-variant/30 ${step >= s ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                     {s < step ? <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span> : s}
                  </div>
                  <p className={`text-[10px] uppercase font-bold tracking-widest mt-2 hidden md:block ${step >= s ? 'text-primary' : 'text-on-surface-variant opacity-50'}`}>
                     {s === 1 ? 'Intake' : s === 2 ? 'Scope' : s === 3 ? 'Pricing' : 'Invites'}
                  </p>
               </div>
            ))}
         </div>
      </div>

      <div className="flex-1 w-full mx-auto pb-32 relative z-10">

         {/* ========================================================== */}
         {/* STEP 1: INTAKE & MODE TOGGLE                               */}
         {/* ========================================================== */}
         {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
               <header className="mb-8 text-center">
                 <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tight text-on-surface">
                   Create Verified Project Scope
                 </h2>
                 <p className="text-on-surface-variant font-medium mt-3 max-w-2xl mx-auto">Describe the outcome, constraints, and delivery expectations. Untether will draft a milestone-based SOW for review before anything is posted.</p>
               </header>

               <div className="bg-surface border border-outline-variant/30 rounded-lg p-6 md:p-8 relative overflow-hidden max-w-4xl mx-auto min-h-[460px]">

                  {/* Rejection message */}
                  {rejectionMessage && !isGenerating && (
                     <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-md transition-all duration-500 p-8">
                        <div className="relative flex items-center justify-center mb-6">
                          <span className="material-symbols-outlined text-4xl text-error/80" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
                        </div>
                        <h3 className="text-xl font-bold font-headline text-on-surface text-center mb-3">Can't scope this one</h3>
                        <p className="text-on-surface-variant text-center max-w-md leading-relaxed">{rejectionMessage}</p>
                        <button
                          type="button"
                          onClick={() => { setRejectionMessage(""); setPrompt(""); }}
                          className="mt-6 px-6 py-3 rounded-md bg-surface border border-outline-variant/30 text-on-surface font-bold text-sm uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all"
                        >
                          Try Something Else
                        </button>
                     </div>
                  )}

                  {/* Loading state */}
                  {isGenerating && (
                     <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-md transition-all duration-500">
                        <div className="relative flex items-center justify-center mb-8">
                          {triageResult ? (
                            <span className="material-symbols-outlined text-4xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
                          ) : (
                            <span className="material-symbols-outlined text-4xl text-primary animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>search_insights</span>
                          )}
                        </div>
                        {triageResult && (
                          <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-md bg-secondary/10 border border-secondary/20">
                            <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">{triageResult.category?.replace(/_/g, ' ')} / {triageResult.complexity}</span>
                          </div>
                        )}
                        <h3 className="text-lg font-bold font-headline mt-2 text-on-surface px-8 text-center leading-relaxed">
                          {loadingStatus}
                        </h3>
                     </div>
                  )}

                  <form onSubmit={handleGenerate} className={`space-y-6 transition-all duration-500 ${isGenerating ? 'opacity-0 scale-95 blur-md select-none pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
                        <div className="flex bg-surface-container rounded-lg p-1 w-full max-w-md mx-auto mb-6">
                           <button type="button" onClick={() => setMode("EXECUTION")} className={`flex-1 py-2 rounded-md text-xs font-bold tracking-widest uppercase transition-all ${mode === "EXECUTION" ? 'bg-surface text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
                              Full Delivery Scope
                           </button>
                           <button type="button" onClick={() => setMode("DISCOVERY")} className={`flex-1 py-2 rounded-md text-xs font-bold tracking-widest uppercase transition-all ${mode === "DISCOVERY" ? 'bg-primary/15 text-primary border border-primary/20' : 'text-on-surface-variant hover:text-on-surface border border-transparent'}`}>
                              $1k Discovery Sprint
                           </button>
                        </div>

                        <div className="relative group">
                           <textarea
                             value={prompt}
                             onChange={(e) => setPrompt(e.target.value)}
                             placeholder="Example: Build a customer portal with Stripe billing, role-based access, audit logs, and a staged launch plan. Target timeline is 4-6 weeks."
                             className="w-full h-[320px] bg-surface border border-outline-variant/30 focus-within:border-primary/50 rounded-lg p-6 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 resize-none text-sm focus:outline-none relative z-10 custom-scrollbar leading-relaxed"
                           />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                           {["Meaningful", "Realistic", "Actionable", "Verifiable"].map((quality) => (
                              <div key={quality} className="flex items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2">
                                 <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                                 <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{quality}</span>
                              </div>
                           ))}
                        </div>

                        {capturedScopeConstraints.length > 0 && (
                           <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Captured constraints</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                 {capturedScopeConstraints.map((constraint) => (
                                    <span
                                      key={constraint}
                                      className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-surface px-3 py-1.5 text-xs font-bold text-on-surface"
                                    >
                                       <span className="material-symbols-outlined text-[14px] text-primary">keep</span>
                                       {constraint}
                                    </span>
                                 ))}
                              </div>
                              <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                                 These details will be preserved in the generated scope. If a region, budget, or timeline is missing, add it to the description before generating.
                              </p>
                           </div>
                        )}

                        {prompt.trim().length >= 5 && intakeAssessment.issues.length > 0 && (
                           <div className={`rounded-lg border p-4 ${intakeAssessment.status === "needs_detail" ? "border-error/25 bg-error/5" : "border-tertiary/25 bg-tertiary/5"}`}>
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                 <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${intakeAssessment.status === "needs_detail" ? "text-error" : "text-tertiary"}`}>
                                       Scope advisor
                                    </p>
                                    <h3 className="mt-1 text-sm font-black text-on-surface">
                                       {intakeAssessment.status === "needs_detail"
                                         ? "More detail is needed before this can become a valid milestone."
                                         : "This can be scoped, but these details would improve the result."}
                                    </h3>
                                    <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">
                                       Milestones need a buyer-visible outcome, realistic delivery boundaries, and evidence the client can inspect before approval.
                                    </p>
                                 </div>
                                 <div className="rounded-md border border-outline-variant/20 bg-surface px-3 py-2 text-right">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Readiness</p>
                                    <p className="text-lg font-black text-on-surface">{intakeAssessment.score}%</p>
                                 </div>
                              </div>

                              <div className="mt-4 grid gap-3">
                                 {[...intakeBlockers, ...intakeWarnings].map((issue) => (
                                    <div key={issue.code} className="rounded-lg border border-outline-variant/15 bg-surface/70 p-3">
                                       <div className="flex items-start gap-2">
                                          <span className={`material-symbols-outlined mt-0.5 text-[16px] ${issue.severity === "blocker" ? "text-error" : "text-tertiary"}`}>
                                             {issue.severity === "blocker" ? "error" : "tips_and_updates"}
                                          </span>
                                          <div>
                                             <p className="text-xs font-black text-on-surface">{issue.label}</p>
                                             <p className="mt-1 text-xs leading-5 text-on-surface-variant">{issue.why}</p>
                                             <p className="mt-1 text-xs font-bold leading-5 text-on-surface">{issue.hint}</p>
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>

                              <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-3">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-primary">Try adding this kind of detail</p>
                                 <p className="mt-2 text-xs leading-5 text-on-surface-variant">{intakeAssessment.suggestedPrompt}</p>
                                 <button
                                   type="button"
                                   onClick={() => setPrompt(intakeAssessment.suggestedPrompt)}
                                   className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary transition-colors hover:bg-primary/90"
                                 >
                                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                    Use Guided Rewrite
                                 </button>
                              </div>
                           </div>
                        )}

                        {/* Timeline / Deadline Input */}
                        <div className="flex flex-col md:flex-row gap-4">
                           <div className="flex-1 relative">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">schedule</span> Desired Timeline</span>
                              </label>
                              <input
                                 type="text"
                                 value={desiredTimeline}
                                 onChange={(e) => setDesiredTimeline(e.target.value)}
                                 placeholder="e.g. '2 weeks', '30 days', 'by June 15th'"
                                 className="w-full bg-surface border border-outline-variant/30 focus:border-primary/50 rounded-lg p-4 text-on-surface text-sm focus:ring-0 focus:outline-none relative z-10 placeholder:text-on-surface-variant/40"
                              />
                           </div>
                           {mode === "DISCOVERY" && (
                              <div className="flex-1 flex items-end">
                                 <div className="w-full bg-primary/5 border border-primary/20 rounded-lg p-4">
                                    <p className="text-xs text-primary font-bold">Discovery Mode locks to a 7-day architecture sprint at $1,000.</p>
                                 </div>
                              </div>
                           )}
                        </div>
                        <div className="flex justify-end pt-4">
                           <button
                             type="submit"
                             disabled={prompt.trim().length < 5 || isGenerating || hasIntakeBlockers}
                             className={`px-8 py-3 rounded-md flex items-center gap-3 font-bold uppercase tracking-widest text-sm transition-all ${prompt.trim().length < 5 || isGenerating || hasIntakeBlockers ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-70' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
                           >
                              {prompt.trim().length < 5 ? "Describe Project First" : hasIntakeBlockers ? "Resolve Scope Details" : "Generate Statement of Work"}
                              <span className="material-symbols-outlined text-[18px]">{prompt.trim().length < 5 ? "edit_note" : "arrow_forward"}</span>
                           </button>
                        </div>
                     </form>
               </div>
            </div>
         )}


         {/* ========================================================== */}
         {/* STEP 2: INTERACTIVE TIMELINE & MODULAR FEATURE CANVAS       */}
         {/* ========================================================== */}
         {step === 2 && editableSoW && (() => {
            const milestones = editableSoW.milestones?.filter((m: any) => m && m.title) || [];
            const totalDays = milestones.reduce((acc: number, m: any) => acc + (Number(m.estimated_duration_days) || 0), 0);
            const phaseColors = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-tertiary)', '#f59e0b', '#10b981', '#8b5cf6'];

            return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-28">
               {/* Elastic Scrolling Container */}
               <div className="w-full min-h-[600px] max-h-[80vh] overflow-y-auto custom-scrollbar pr-4 space-y-8">
                  {/* Header - editable title and summary */}
                  <div className="border-b border-outline-variant/20 pb-6 text-center max-w-3xl mx-auto space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-[14px]">calendar_clock</span>
                    {activePhaseIndex < milestones.length ? `Milestone ${activePhaseIndex + 1} Review` : 'Delivery Timeline Review'}
                 </p>
                 <input
                    type="text"
                    value={editableSoW.title || ''}
                    onChange={(e) => updateSoWField('title', e.target.value)}
                     className="text-2xl font-black text-on-surface font-headline leading-snug bg-transparent border-b-2 border-transparent hover:border-outline-variant/30 focus:border-primary/50 text-center w-full focus:outline-none transition-colors"
                    placeholder="Project Title"
                 />
                 <textarea
                    value={editableSoW.executiveSummary || ''}
                    onChange={(e) => updateSoWField('executiveSummary', e.target.value)}
                    rows={6}
                     className="text-sm text-on-surface leading-relaxed w-full bg-transparent border border-transparent hover:border-outline-variant/20 focus:border-primary/30 rounded-lg p-2 text-center resize-none focus:outline-none focus:ring-0 transition-colors custom-scrollbar"
                    placeholder="Executive summary..."
                 />
               </div>

               {activePhaseIndex === milestones.length ? (
                 <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
                   {/* ===== MASTER TIMELINE REVIEW (GANTT CHART) ===== */}
                    <div className="bg-surface border border-outline-variant/30 rounded-lg p-6 md:p-8 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-8 relative z-10">
                          <div>
                            <h3 className="text-xl font-bold font-headline text-on-surface">Timeline Review</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{milestones.length} Phases Parsed</p>
                          </div>
                         <div className="text-right">
                           <p className="text-3xl font-black text-secondary">{totalDays} <span className="text-sm text-on-surface-variant font-bold">Days</span></p>
                         </div>
                      </div>

                      <div className={`mb-6 rounded-lg border p-4 ${allMilestonesReady ? 'bg-secondary/5 border-secondary/20' : 'bg-error/5 border-error/20'}`}>
                         <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                            <div className="flex items-start gap-3">
                               <span className={`material-symbols-outlined text-[20px] ${allMilestonesReady ? 'text-secondary' : 'text-error'}`}>{allMilestonesReady ? 'verified' : 'assignment_late'}</span>
                               <div>
                                  <p className="text-xs font-black uppercase tracking-widest text-on-surface">Milestone Readiness</p>
                                  <p className="text-sm text-on-surface-variant mt-1">
                                     {allMilestonesReady ? 'All milestones are ready to price and post.' : `${milestoneIssueCount} quality item${milestoneIssueCount === 1 ? '' : 's'} still need review before pricing.`}
                                  </p>
                               </div>
                            </div>
                            {!allMilestonesReady && (
                               <button
                                  type="button"
                                  onClick={() => {
                                     const firstIssueIndex = milestoneQualityAssessments.findIndex((assessment) => !assessment.passes);
                                     setActivePhaseIndex(Math.max(0, firstIssueIndex));
                                  }}
                                  className="px-4 py-2 rounded-lg border border-error/30 text-error text-xs font-black uppercase tracking-widest hover:bg-error/10 transition-colors"
                               >
                                  Review First Issue
                               </button>
                            )}
                         </div>
                      </div>

                      <div className="space-y-3 relative z-10">
                         {(() => {
                            let currentStartDays = 0;
                            return milestones.map((m: any, idx: number) => {
                               const days = Number(m.estimated_duration_days) || 0;
                               const widthPct = totalDays > 0 ? (days / totalDays) * 100 : 100 / milestones.length;
                               const leftOffsetPct = totalDays > 0 ? (currentStartDays / totalDays) * 100 : idx * (100 / milestones.length);
                               const color = phaseColors[idx % phaseColors.length];

                               currentStartDays += days;

                               return (
                                  <div key={idx} className="flex items-center gap-4 group">
                                     <span className="text-xs font-bold text-on-surface-variant w-8 shrink-0 text-right">P{idx + 1}</span>
                                      <div className="flex-1 h-12 bg-surface-container-low rounded-lg relative border border-outline-variant/10 overflow-hidden">
                                         <div
                                            className="h-full rounded-md flex items-center px-4 transition-all duration-500 ease-out absolute top-0 bottom-0 min-w-fit z-10 cursor-default"
                                            style={{ left: `${leftOffsetPct}%`, width: `${widthPct}%`, backgroundColor: color, opacity: 0.9 }}
                                         >
                                            <span className="text-xs font-black text-white whitespace-nowrap">
                                               {m.title} - {days}d
                                           </span>
                                        </div>
                                     </div>
                                  </div>
                               );
                            });
                         })()}
                      </div>

                      {/* Day markers */}
                      <div className="flex justify-between mt-6 px-12 relative z-10">
                         <span className="text-[10px] text-on-surface-variant font-bold">Day 0</span>
                         {totalDays > 0 && <span className="text-[10px] text-on-surface-variant font-bold">Day {Math.round(totalDays / 2)}</span>}
                         <span className="text-[10px] text-on-surface-variant font-bold">Day {totalDays}</span>
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
                   {/* ===== FOCUS PHASE EDITOR ===== */}
                   {(() => {
                      const idx = activePhaseIndex;
                      const m = milestones[idx] || {};
                      const color = phaseColors[idx % phaseColors.length];
                      const quality = assessMilestoneQuality(m);
                      return (
                         <div className="bg-surface border border-outline-variant/30 rounded-lg overflow-hidden">
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 p-8 border-b border-outline-variant/20 relative" style={{ borderTopWidth: '4px', borderTopColor: color }}>
                               <div className="w-14 h-14 rounded-lg flex items-center justify-center font-black text-xl shrink-0 z-10 border border-outline-variant/20" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                                  {idx + 1}
                               </div>
                              <div className="flex-1 min-w-0 space-y-3 z-10">
                                 <input
                                    type="text"
                                    value={m.title || ''}
                                    onChange={(e) => updateMilestoneField(idx, 'title', e.target.value)}
                                     className="text-xl lg:text-2xl font-black font-headline text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary/50 w-full focus:outline-none transition-colors"
                                    placeholder="Phase title"
                                 />
                                 <textarea
                                    value={m.description || ''}
                                    onChange={(e) => updateMilestoneField(idx, 'description', e.target.value)}
                                    rows={2}
                                     className="w-full resize-none overflow-hidden text-wrap break-words text-sm text-on-surface-variant leading-relaxed bg-transparent border-b border-transparent hover:border-outline-variant/20 focus:border-primary/30 py-1 focus:outline-none transition-colors"
                                    placeholder="Phase description..."
                                 />
                              </div>
                              <div className="shrink-0 w-32 md:w-40 z-10">
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Duration (Days)</label>
                                 <div className="flex items-center relative">
                                    <input
                                       type="number" min={1}
                                       value={m.estimated_duration_days || ''}
                                       onChange={(e) => updateMilestoneField(idx, 'estimated_duration_days', Number(e.target.value))}
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 text-on-surface focus:border-primary/50 focus:ring-0 text-lg font-black pr-12 transition-colors"
                                    />
                                    <span className="absolute right-4 text-sm font-bold text-on-surface-variant pointer-events-none">Days</span>
                                 </div>
                               </div>
                           </div>

                           <div className={`px-8 py-5 border-b ${quality.passes ? 'bg-secondary/5 border-secondary/20' : 'bg-error/5 border-error/20'}`}>
                              <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
                                 <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${quality.passes ? 'text-secondary' : 'text-error'}`}>
                                       <span className="material-symbols-outlined text-[16px]">{quality.passes ? 'verified' : 'priority_high'}</span>
                                       Milestone Quality
                                    </p>
                                    <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
                                       Each milestone should be meaningful, realistic, actionable, and verifiable before it can be posted for escrow-backed delivery.
                                    </p>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Score</span>
                                    <span className={`text-2xl font-black ${quality.passes ? 'text-secondary' : 'text-error'}`}>{quality.score}</span>
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                                 {(quality.blockingIssues.length > 0 ? quality.blockingIssues : ["Ready for buyer review and facilitator execution."]).map((issue) => (
                                    <div key={issue} className="flex items-start gap-2 rounded-lg border border-outline-variant/15 bg-surface/60 p-3 text-xs text-on-surface-variant">
                                       <span className={`material-symbols-outlined text-[15px] mt-0.5 shrink-0 ${quality.passes ? 'text-secondary' : 'text-error'}`}>
                                          {quality.passes ? 'check_circle' : 'error'}
                                       </span>
                                       <span>
                                          <span className="block font-bold text-on-surface">{issue}</span>
                                          {!quality.passes && (
                                             <span className="mt-1 block leading-5">{guidanceForIssue(issue)}</span>
                                          )}
                                       </span>
                                    </div>
                                 ))}
                              </div>
                              {!quality.passes && (
                                 <div className="mt-4 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                       <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scope guidance</p>
                                       <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                                          Safe fixes can convert process-only entries into reviewable outputs and add missing proof checks. Anything commercial or project-specific still needs your judgment.
                                       </p>
                                    </div>
                                    <button
                                       type="button"
                                       onClick={() => applyMilestoneQualityFixes(idx)}
                                       className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-on-primary hover:bg-primary/90 active:scale-95"
                                    >
                                       <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                                       Apply Safe Fixes
                                    </button>
                                 </div>
                              )}
                           </div>

                           <div className="p-8 space-y-6 bg-surface-container-lowest">
                              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                                 <span className="material-symbols-outlined text-[18px]">rule_folder</span>
                                 Reviewable Outputs ({m.deliverables?.length || 0})
                              </p>

                              <div className="space-y-4">
                                 {m.deliverables?.map((d: string, dIdx: number) => (
                                     <div key={dIdx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 group/item animate-in fade-in slide-in-from-bottom-2 duration-300 p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                                        <span className="w-8 h-8 rounded-lg bg-surface border border-outline-variant/20 flex items-center justify-center shrink-0">
                                          <span className="material-symbols-outlined text-[16px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>done_all</span>
                                       </span>
                                       <textarea
                                          value={d}
                                          onChange={(e) => updateDeliverable(idx, dIdx, e.target.value)}
                                          rows={2}
                                          placeholder="Describe this feature output..."
                                           className="flex-1 w-full resize-none overflow-hidden text-wrap break-words bg-transparent border border-transparent hover:border-outline-variant/30 focus:border-primary/50 focus:bg-surface rounded-lg p-3 text-sm text-on-surface focus:ring-0 focus:outline-none transition-all placeholder:text-on-surface-variant/40"
                                       />
                                       <button
                                          onClick={() => removeDeliverable(idx, dIdx)}
                                           className="w-10 h-10 rounded-lg flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity bg-error/10 text-error hover:bg-error hover:text-white"
                                          title="Remove feature"
                                       >
                                          <span className="material-symbols-outlined text-[20px]">delete</span>
                                       </button>
                                    </div>
                                 ))}
                              </div>

                              <button
                                 onClick={() => addDeliverable(idx)}
                                  className="w-full mt-4 py-4 rounded-lg border-2 border-dashed border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                              >
                                 <span className="material-symbols-outlined text-[20px]">add</span>
                                 Add Deliverable
                              </button>
                           </div>

                            <div className="p-8 border-t border-outline-variant/20 bg-surface-container-lowest">
                               <div className="bg-surface-container p-5 rounded-lg border border-secondary/20">
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">verified_user</span> Acceptance Criteria</p>
                                 <textarea
                                    value={m.acceptance_criteria || ''}
                                    onChange={(e) => updateMilestoneField(idx, 'acceptance_criteria', e.target.value)}
                                    rows={3}
                                     className="w-full text-sm text-on-surface leading-relaxed bg-transparent border border-transparent hover:border-outline-variant/20 focus:border-secondary/40 focus:bg-surface rounded-lg p-3 focus:outline-none resize-none transition-all"
                                    placeholder="Define acceptance criteria for this milestone..."
                                 />
                              </div>
                           </div>
                        </div>
                      );
                   })()}
                 </div>
               )}
            </div>
          </div>
        );
      })()}


         {/* ========================================================== */}
         {/* STEP 3: FINANCIAL LEDGER                                   */}
         {/* ========================================================== */}
         {step === 3 && (editableSoW || sowData) && (() => {
            const milestones = (editableSoW || sowData).milestones || [];
            const totalEscrow = milestones.reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

            return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-28">
               <div className="max-w-4xl mx-auto space-y-8">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-3xl text-tertiary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                    <h3 className="text-2xl font-black text-on-surface font-headline leading-snug">Milestone Pricing</h3>
                    <p className="text-on-surface-variant mt-3 text-sm">Review each milestone amount before the project is posted for facilitator proposals.</p>
                  </div>

                  <div className="bg-surface border border-outline-variant/30 rounded-lg p-6 md:p-8 relative overflow-hidden">
                     <div className="space-y-6 relative z-10">
                        {milestones.map((m: any, idx: number) => (
                           <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface-container-low p-5 rounded-lg border border-outline-variant/10 hover:border-primary/30 transition-colors">
                              <div className="flex-1 space-y-2">
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                      <span className="text-primary font-black text-xs">{idx + 1}</span>
                                   </div>
                                   <p className="font-black text-lg text-on-surface">{m.title}</p>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface border border-outline-variant/20 px-2 py-1 rounded hidden sm:block">{m.estimated_duration_days || 0} Days</span>
                                 </div>
                                 <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 md:pl-11 opacity-80">{m.description || 'No technical summary provided.'}</p>
                              </div>
                              <div className="relative w-full md:w-56 shrink-0 md:pl-0 pl-11">
                                 <label className="text-[10px] uppercase font-bold tracking-widest text-secondary block mb-2">Milestone Amount</label>
                                 <div className="relative">
                                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-lg pointer-events-none">$</span>
                                   <input
                                      type="number"
                                      value={m.amount || ''}
                                      onChange={(e) => updateMilestoneField(idx, 'amount', Number(e.target.value))}
                                      className="w-full bg-surface border border-outline-variant/30 hover:border-primary/40 focus:border-primary rounded-lg py-4 pl-10 pr-4 text-on-surface font-black text-right text-xl transition-all outline-none focus:ring-4 focus:ring-primary/10"
                                   />
                                 </div>
                              </div>
                           </div>
                        ))}


                        {/* Bidding Window Deadline */}
                        <div className="mt-6 bg-surface-container-low border border-outline-variant/20 rounded-lg p-5">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Bidding Window</p>
                                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Facilitators must submit proposals before this date</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-auto flex-wrap">
                              {[3, 7, 14].map(n => {
                                const d = new Date(); d.setDate(d.getDate() + n);
                                const val = d.toISOString().split('T')[0];
                                return (
                                  <button key={n} type="button" onClick={() => setBiddingClosesAt(val)}
                                    className={"px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors " + (biddingClosesAt === val ? "bg-primary text-on-primary border-primary" : "border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-primary")}>{n}d</button>
                                );
                              })}
                              <input type="date" value={biddingClosesAt}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setBiddingClosesAt(e.target.value)}
                                className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-bold text-on-surface outline-none focus:border-primary transition-colors cursor-pointer" />
                            </div>
                          </div>
                        </div>
                        <div className="pt-8 mt-8 border-t border-outline-variant/20 flex flex-col items-center bg-surface-container-lowest -mx-8 -mb-8 p-10">
                           <p className="text-sm text-secondary uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">verified_user</span> Total Project Cost
                           </p>
                           <p className="text-3xl font-black text-on-surface tracking-tight">
                              {formatCurrency(totalEscrow)}
                           </p>
                        </div>
                     </div>
                   </div>
                </div>
             </div>
             );
          })()}


         {/* ========================================================== */}
         {/* STEP 4: SQUAD CONCIERGE MATCH ENGINE                       */}
         {/* ========================================================== */}
         {step === 4 && (editableSoW || sowData) && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">

               {isSquadLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                     <span className="material-symbols-outlined text-3xl text-on-surface-variant animate-spin mb-6" style={{ animationDuration: '3s' }}>radar</span>
                     <h3 className="text-xl font-bold font-headline text-on-surface">Reviewing facilitator fit...</h3>
                     <p className="text-on-surface-variant text-sm mt-2 max-w-sm text-center">Matching your statement of work against verified facilitator profiles.</p>
                  </div>
               ) : (
                  <div className="space-y-10">
                     <div className="text-center max-w-2xl mx-auto">
                       <span className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border mb-4 inline-block ${squad.length > 0 ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-surface-variant/20 text-on-surface-variant border-outline-variant/30'}`}>MATCH ANALYSIS COMPLETE</span>
                       <h3 className="text-2xl font-black text-on-surface font-headline leading-snug">
                         {squad.length > 0 ? 'Recommended Facilitators' : 'No Immediate Match Found'}
                       </h3>
                       <p className="text-on-surface-variant mt-3 text-sm">
                         {squad.length > 0
                           ? `We've found facilitators that match your project requirements.`
                           : `We couldn't find a perfect match right now, but you can post this to the Open Marketplace to gather bids.`}
                       </p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {squad.map((member) => {
                           const isSelected = selectedFacilitators.includes(member.id);
                           return (
                              <div
                                 key={member.id}
                                 onClick={() => {
                                    if(isSelected) setSelectedFacilitators(prev => prev.filter(id => id !== member.id));
                                    else setSelectedFacilitators(prev => [...prev, member.id]);
                                 }}
                                 className={`cursor-pointer transition-all duration-300 rounded-lg p-6 border relative overflow-hidden flex flex-col ${isSelected ? 'bg-secondary/5 border-secondary' : 'bg-surface border-outline-variant/20 hover:border-outline-variant/60'}`}
                              >
                                 <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-outline-variant/30 bg-surface-container-high shrink-0 flex items-center justify-center">
                                       <span className="text-sm font-black text-on-surface-variant">{(member.name || 'UF').slice(0, 2).toUpperCase()}</span>
                                    </div>
                                    <div className="text-right">
                                       <span className="text-[10px] font-headline uppercase tracking-widest font-bold text-on-surface-variant block mb-1">Match Score</span>
                                       <span className="text-2xl font-black text-secondary">{member.match_score}%</span>
                                    </div>
                                 </div>

                                 <div className="flex-1">
                                    <h4 className="text-lg font-bold font-headline">{member.name || 'Verified Facilitator'}</h4>
                                    <div className="flex items-center gap-1 text-tertiary mt-1 mb-4">
                                       <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                       <span className="text-xs font-bold">{member.trust_score || '98.5'} Trust</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-auto">
                                       <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant/10">
                                          <span className="block text-[9px] uppercase font-bold tracking-widest text-on-surface-variant">Milestones</span>
                                          <span className="block text-lg font-black text-on-surface mt-1">{member.total_sprints_completed || 14}</span>
                                       </div>
                                       <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant/10">
                                          <span className="block text-[9px] uppercase font-bold tracking-widest text-on-surface-variant">Audit Avg</span>
                                          <span className="block text-lg font-black text-on-surface mt-1">{member.average_ai_audit_score || 94}</span>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Selection Overlay */}
                                 <div className={`absolute top-4 left-4 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-secondary border-secondary text-surface' : 'border-outline-variant/30 text-transparent'}`}>
                                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>

      {/* ===== UNIVERSAL STICKY FOOTER ===== */}
      {step > 1 && (
         <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-outline-variant/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
               <button
                  onClick={() => {
                     if (step === 2 && activePhaseIndex > 0) setActivePhaseIndex(activePhaseIndex - 1);
                     else setStep(step - 1);
                  }}
                  className="text-on-surface-variant font-bold text-sm uppercase tracking-widest hover:text-on-surface transition-colors flex items-center gap-1.5"
               >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  {step === 2 && activePhaseIndex > 0 ? "Previous Phase" : "Go Back"}
               </button>

               <div className="flex items-center gap-4">
                  {step === 2 && activePhaseIndex < (editableSoW?.milestones?.length || 0) && (
                     <button
                        onClick={() => {
                           if (activeMilestoneQuality && !activeMilestoneQuality.passes) {
                              applyMilestoneQualityFixes(activePhaseIndex);
                           } else {
                              setActivePhaseIndex(activePhaseIndex + 1);
                           }
                        }}
                        className={`px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm flex items-center gap-3 transition-all ${activeMilestoneQuality && !activeMilestoneQuality.passes ? 'bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15 active:scale-95' : 'bg-primary text-on-primary hover:bg-primary/90 active:scale-95'}`}
                     >
                        {activeMilestoneQuality && !activeMilestoneQuality.passes ? 'Apply Safe Fixes' : activePhaseIndex === (editableSoW?.milestones?.length || 0) - 1 ? 'Review Master Timeline' : 'Next Phase'} <span className="material-symbols-outlined text-[18px]">{activeMilestoneQuality && !activeMilestoneQuality.passes ? 'auto_fix_high' : 'arrow_forward'}</span>
                     </button>
                  )}
                  {step === 2 && activePhaseIndex === (editableSoW?.milestones?.length || 0) && (
                     <button
                        onClick={() => setStep(3)}
                        disabled={!allMilestonesReady}
                        className={`px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm flex items-center gap-3 transition-all ${allMilestonesReady ? 'bg-on-surface text-surface hover:bg-on-surface/90 active:scale-95' : 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-80'}`}
                     >
                        {allMilestonesReady ? 'Approve Timeline & Set Pricing' : 'Resolve Milestone Issues'} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                     </button>
                  )}
                  {step === 3 && (
                     <>
                        <button
                           onClick={handleSkipAndPostToMarketplace}
                           disabled={isPending}
                           className={`bg-transparent border border-outline-variant/30 text-on-surface-variant px-6 py-3 rounded-lg font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-2 ${isPending ? 'opacity-80 cursor-not-allowed' : 'hover:border-primary/50 hover:text-primary hover:bg-primary/5 active:scale-95'}`}
                        >
                           Post to Open Marketplace
                        </button>
                        <button
                           onClick={() => {
                              // Wrap loadConciergeSquad trigger via setStep proxy
                              setStep(4);
                              loadConciergeSquad();
                           }}
                           className="bg-primary text-on-primary px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-primary/90 transition-all active:scale-95"
                        >
                           Review Recommended Facilitators <span className="material-symbols-outlined text-[18px]">group_add</span>
                        </button>
                     </>
                  )}
                  {step === 4 && (
                     <button
                        onClick={handlePostToMarketplace}
                        disabled={isPending}
                        className={`px-8 py-3 rounded-lg flex items-center gap-3 font-black text-sm uppercase tracking-widest transition-all ${isPending ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-80' : 'bg-on-surface text-surface hover:bg-on-surface/90 active:scale-95'}`}
                     >
                        {isPending ? (
                           <>
                            <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                            <span>Saving Project...</span>
                           </>
                        ) : selectedFacilitators.length > 0 ? (
                           <>Invite & Post Project <span className="material-symbols-outlined text-[18px]">send</span></>
                        ) : (
                           <>Post to Open Marketplace</>
                        )}
                     </button>
                  )}
               </div>
            </div>
         </div>
      )}
    </main>
  );
}
