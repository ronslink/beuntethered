"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { postProjectToMarketplace } from "@/app/actions/marketplace";
import { fetchRecommendedSquad } from "@/app/actions/concierge";
import {
  alignMilestoneAmountsToBudget,
  assessMilestoneQuality,
  extractRequestedTimelineDays,
  type MilestoneQualityAssessment,
} from "@/lib/milestone-quality";
import {
  extractBudgetAmountConstraint,
  extractBudgetConstraint,
  extractCentralComponentConstraints,
  extractProjectTargets,
  extractRegionConstraints,
  summarizeScopeConstraints,
} from "@/lib/scope-constraints";
import { assessScopeFeasibility } from "@/lib/scope-feasibility";
import { assessScopeIntake } from "@/lib/scope-intake-quality";
import { buildScopeRevisionGuidance, isScopeRevisionHelpRequest } from "@/lib/scope-revision-guidance";
import {
  PROJECT_PROBLEM_STARTERS,
  buildStarterPrompt,
  PROJECT_SCOPE_STARTERS,
  type ProjectProblemStarter,
  type ProjectScopeStarter,
} from "@/lib/project-scope-starters";
import { applySowGuardrails } from "@/lib/sow-guardrails";

const SCOPE_PROCESS_STEPS = [
  {
    icon: "edit_note",
    title: "Start",
    copy: "Choose a familiar project type or write the rough outcome in your own words.",
  },
  {
    icon: "fact_check",
    title: "Clarify",
    copy: "Answer missing details so the scope has users, systems, regions, evidence, budget, and timing.",
  },
  {
    icon: "price_check",
    title: "Validate",
    copy: "Untether checks whether the stated budget and timeline support the requested scope or need tradeoffs.",
  },
  {
    icon: "verified",
    title: "Milestone",
    copy: "Generate fundable milestones with deliverables, acceptance checks, and proof artifacts.",
  },
] as const;

export default function ProjectCreationWizard() {
  const router = useRouter();
  const intakeGuidanceRef = useRef<HTMLDivElement | null>(null);

  // State Machine Arrays
  const [step, setStep] = useState<number>(1);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"EXECUTION" | "DISCOVERY">("EXECUTION");
  const [desiredTimeline, setDesiredTimeline] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [timelineInput, setTimelineInput] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sowData, setSowData] = useState<any>(null);
  const [scopeConversation, setScopeConversation] = useState<string[]>([]);
  const [scopeRevisionNote, setScopeRevisionNote] = useState("");
  const [scopeRevisionHelp, setScopeRevisionHelp] = useState<string[]>([]);
  const [suggestedScopeRevision, setSuggestedScopeRevision] = useState("");
  const [intakeGuidanceActive, setIntakeGuidanceActive] = useState(false);

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
       setEditableSoW(sowData);
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

  const showIntakeGuidance = (message: string) => {
    setIntakeGuidanceActive(true);
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 2800);
    setTimeout(() => {
      intakeGuidanceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const getMilestoneDeliverables = (milestone: any) => (
    Array.isArray(milestone?.deliverables)
      ? milestone.deliverables.map((item: unknown) => String(item ?? ""))
      : []
  );

  const updateMilestoneField = (index: number, field: string, value: string | number) => {
    if (!editableSoW) return;
    const newMilestones = Array.isArray(editableSoW.milestones) ? [...editableSoW.milestones] : [];
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
    const requestedTimelineDays = Number(timelineInput) || extractRequestedTimelineDays(desiredTimeline, prompt);
    const nextSow = {
      ...editableSoW,
      milestones: newMilestones,
    };
    setEditableSoW(applySowGuardrails(
      nextSow,
      buildGuardrailConstraints(
        Number(budgetInput) || extractBudgetAmountConstraint(prompt),
        requestedTimelineDays
      )
    ));
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
    const newMilestones = Array.isArray(editableSoW.milestones) ? [...editableSoW.milestones] : [];
    const newDeliverables = getMilestoneDeliverables(newMilestones[milestoneIdx]);
    newDeliverables[deliverableIdx] = value;
    newMilestones[milestoneIdx] = { ...(newMilestones[milestoneIdx] || {}), deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const addDeliverable = (milestoneIdx: number) => {
    if (!editableSoW) return;
    const newMilestones = Array.isArray(editableSoW.milestones) ? [...editableSoW.milestones] : [];
    const newDeliverables = [
      ...getMilestoneDeliverables(newMilestones[milestoneIdx]),
      "Client-reviewable output with proof artifact",
    ];
    newMilestones[milestoneIdx] = { ...(newMilestones[milestoneIdx] || {}), deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const removeDeliverable = (milestoneIdx: number, deliverableIdx: number) => {
    if (!editableSoW) return;
    const newMilestones = Array.isArray(editableSoW.milestones) ? [...editableSoW.milestones] : [];
    const newDeliverables = getMilestoneDeliverables(newMilestones[milestoneIdx]).filter((_: string, i: number) => i !== deliverableIdx);
    newMilestones[milestoneIdx] = { ...(newMilestones[milestoneIdx] || {}), deliverables: newDeliverables };
    setEditableSoW({ ...editableSoW, milestones: newMilestones });
  };

  const buildGuardrailConstraints = (budgetAmount: number | null, timelineDays: number | null) => ({
    regions: extractRegionConstraints(prompt),
    targets: extractProjectTargets(prompt),
    components: extractCentralComponentConstraints(prompt),
    budget: budgetAmount
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(budgetAmount)
      : extractBudgetConstraint(prompt),
    budgetAmount,
    timelineDays,
  });

  const normalizeSowToBuyerConstraints = (
    draft: any,
    budgetAmount: number | null,
    timelineDays: number | null
  ) => applySowGuardrails(draft, buildGuardrailConstraints(budgetAmount, timelineDays));

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
      const requiredBudgetAmount = Number(budgetInput);
      const requiredTimelineDays = Number(timelineInput);
      if (!Number.isFinite(requiredBudgetAmount) || requiredBudgetAmount <= 0 || !Number.isFinite(requiredTimelineDays) || requiredTimelineDays <= 0) {
        showIntakeGuidance("Add the required budget and timeline before generating scope.");
        setIsGenerating(false);
        return;
      }

      const intakeAssessment = assessScopeIntake(prompt);
      if (intakeAssessment.status === "needs_detail") {
        showIntakeGuidance("Answer the advisor questions or use the guided rewrite before generating.");
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

      const effectiveDesiredTimeline = `${requiredTimelineDays} days`;

      // Step 2: Generate SOW routed by category + complexity
      const response = await fetch("/api/ai/generate-sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          desiredTimeline: effectiveDesiredTimeline,
          budgetAmount: requiredBudgetAmount,
          timelineDays: requiredTimelineDays,
          category: triage.category,
          complexity: triage.complexity,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const constrainedData = normalizeSowToBuyerConstraints(data, requiredBudgetAmount, requiredTimelineDays);

      setSowData(constrainedData);
      setScopeConversation([
        `Client rough draft: ${prompt}`,
        `AI first SOW draft: ${JSON.stringify(constrainedData)}`,
      ]);
    } catch (err: any) {
      console.error(err);
      setRejectionMessage(err.message || "Something went wrong generating your scope. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineScope = async () => {
    if (!editableSoW || !scopeRevisionNote.trim() || !triageResult) return;

    if (isScopeRevisionHelpRequest(scopeRevisionNote)) {
      const guidance = buildCurrentScopeRevisionGuidance();
      setScopeRevisionHelp(guidance.guidance);
      setSuggestedScopeRevision(guidance.suggestedRevision);
      setToastMessage("I added guidance below. Refine Scope needs a concrete change to apply.");
      setTimeout(() => setToastMessage(""), 2800);
      return;
    }

    setScopeRevisionHelp([]);
    setSuggestedScopeRevision("");
    setIsGenerating(true);
    setLoadingStatus("Refining your scope with the full conversation...");

    try {
      const requiredBudgetAmount = Number(budgetInput);
      const requestedTimelineDays = Number(timelineInput) || extractRequestedTimelineDays(desiredTimeline, prompt);
      const effectiveDesiredTimeline = requestedTimelineDays ? `${requestedTimelineDays} days` : desiredTimeline.trim();
      const revisionHistory = [
        ...scopeConversation,
        `Current editable SOW before revision: ${JSON.stringify(editableSoW)}`,
        `Client revision instruction: ${scopeRevisionNote.trim()}`,
      ].join("\n\n");

      const response = await fetch("/api/ai/generate-sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          desiredTimeline: effectiveDesiredTimeline,
          budgetAmount: requiredBudgetAmount || undefined,
          timelineDays: requestedTimelineDays || undefined,
          category: triageResult.category,
          complexity: triageResult.complexity,
          conversationHistory: revisionHistory,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const normalized = normalizeSowToBuyerConstraints(
        data,
        requiredBudgetAmount || null,
        requestedTimelineDays || null
      );
      setSowData(normalized);
      setEditableSoW(normalized);
      setScopeConversation([
        ...scopeConversation,
        `Client revision instruction: ${scopeRevisionNote.trim()}`,
        `AI revised SOW draft: ${JSON.stringify(normalized)}`,
      ]);
      setScopeRevisionNote("");
      setToastMessage("Scope refined with your latest instruction.");
      setTimeout(() => setToastMessage(""), 2400);
    } catch (err: any) {
      console.error(err);
      setToastMessage(err.message || "Unable to refine the scope right now.");
      setTimeout(() => setToastMessage(""), 2400);
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

  const blockUnrealisticExecutionPost = () => {
    if (mode === "DISCOVERY" || feasibilityAssessment.canPostExecution) return false;
    setStep(1);
    setToastMessage("Revise unrealistic constraints or convert this to discovery before posting.");
    setTimeout(() => setToastMessage(""), 2800);
    return true;
  };

  const convertToDiscoveryScope = () => {
    setMode("DISCOVERY");
    setBudgetInput("1000");
    setTimelineInput("7");
    setDesiredTimeline("7 days");
    setToastMessage("Converted to a 7-day $1,000 discovery sprint.");
    setTimeout(() => setToastMessage(""), 2400);
  };

  const applyPhasedScopePrompt = () => {
    if (!feasibilityAssessment.phasedScopePrompt) return;
    setPrompt(feasibilityAssessment.phasedScopePrompt);
    setToastMessage("Reframed this as a phased first release.");
    setTimeout(() => setToastMessage(""), 2400);
  };

  const addGuidedQuestionStarter = (question: string) => {
    const starter = `\n\n${question}\nAnswer: `;
    setPrompt((current) => `${current.trim()}${starter}`);
    setIntakeGuidanceActive(true);
  };

  const applyGuidedRewrite = () => {
    setPrompt(intakeAssessment.suggestedPrompt);
    setIntakeGuidanceActive(true);
    setToastMessage("Guided rewrite loaded. Replace bracketed items with what you know.");
    setTimeout(() => setToastMessage(""), 2800);
  };

  const appendGuidedQuestionPrompts = () => {
    if (intakeAssessment.guidingQuestions.length === 0) {
      showIntakeGuidance("No extra questions are needed. Add budget and timeline if they are missing.");
      return;
    }

    const prompts = intakeAssessment.guidingQuestions
      .map((question) => `${question}\nAnswer: `)
      .join("\n\n");
    setPrompt((current) => `${current.trim()}\n\n${prompts}`);
    setIntakeGuidanceActive(true);
    setToastMessage("Question prompts added. Answer what you know, then generate again.");
    setTimeout(() => setToastMessage(""), 2800);
  };

  const handleResolveScopeDetails = () => {
    showIntakeGuidance("Use the guidance panel to answer missing details before generating.");
  };

  const applyProjectStarter = (starter: ProjectScopeStarter) => {
    setMode("EXECUTION");
    setPrompt(buildStarterPrompt(starter));
    setBudgetInput("");
    setTimelineInput("");
    setDesiredTimeline("");
    setToastMessage(`${starter.label} loaded. Add your budget and timeline next.`);
    setTimeout(() => setToastMessage(""), 2400);
  };

  const applyProblemStarter = (starter: ProjectProblemStarter) => {
    setMode("EXECUTION");
    setPrompt(starter.prompt);
    setBudgetInput("");
    setTimelineInput("");
    setDesiredTimeline("");
    setToastMessage(`${starter.label} loaded. Add your details, budget, and timeline next.`);
    setTimeout(() => setToastMessage(""), 2400);
  };

  const handleSkipAndPostToMarketplace = () => {
    if (blockUnrealisticExecutionPost()) return;

    startTransition(async () => {
      const finalPayload = {
         ...(editableSoW || sowData),
         mode,
         marketFit: feasibilityAssessment.status,
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
    if (blockUnrealisticExecutionPost()) return;

    startTransition(async () => {
      // Package the data mapping dynamically
      const finalPayload = {
         ...(editableSoW || sowData),
         mode,
         marketFit: feasibilityAssessment.status,
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
  const requestedTimelineDays = Number(timelineInput) || extractRequestedTimelineDays(desiredTimeline, prompt);
  const capturedBudgetAmount = Number(budgetInput) || extractBudgetAmountConstraint(prompt);
  const capturedScopeConstraints = summarizeScopeConstraints({
    regions: extractRegionConstraints(prompt),
    targets: extractProjectTargets(prompt),
    components: extractCentralComponentConstraints(prompt),
    budget: capturedBudgetAmount ? formatCurrency(capturedBudgetAmount) : extractBudgetConstraint(prompt),
    budgetAmount: capturedBudgetAmount,
    timelineDays: requestedTimelineDays,
  });
  const intakeAssessment = assessScopeIntake(prompt);
  const intakeBlockers = intakeAssessment.issues.filter((issue) => issue.severity === "blocker");
  const intakeWarnings = intakeAssessment.issues.filter((issue) => issue.severity === "warning");
  const missingBudgetOrTimeline = !capturedBudgetAmount || !requestedTimelineDays;
  const planningInputIssues = [
    !capturedBudgetAmount
      ? {
          code: "missing_required_budget",
          label: "Required budget is missing",
          why: "The SOW needs a buyer-funded budget so generated milestones can preserve the commercial constraint instead of inventing a price.",
          hint: "Enter the maximum project budget the buyer can actually fund in the Required Budget field.",
          severity: "blocker" as const,
        }
      : null,
    !requestedTimelineDays
      ? {
          code: "missing_required_timeline",
          label: "Required timeline is missing",
          why: "The SOW needs a target duration so milestones can be sized into realistic checkpoints.",
          hint: "Enter the target delivery window as a number of days in the Required Timeline field.",
          severity: "blocker" as const,
        }
      : null,
  ].filter((issue): issue is NonNullable<typeof issue> => issue !== null);
  const feasibilityAssessment = assessScopeFeasibility({
    prompt,
    budgetAmount: capturedBudgetAmount,
    timelineDays: requestedTimelineDays,
  });
  const feasibilityPanelClass = feasibilityAssessment.status === "unrealistic"
    ? "border-error/25 bg-error/5"
    : feasibilityAssessment.status === "aggressive"
      ? "border-tertiary/25 bg-tertiary/5"
      : feasibilityAssessment.status === "missing"
        ? "border-outline-variant/30 bg-surface-container-low/60"
        : "border-secondary/20 bg-secondary/5";
  const feasibilityTextClass = feasibilityAssessment.status === "unrealistic"
    ? "text-error"
    : feasibilityAssessment.status === "aggressive"
      ? "text-tertiary"
      : feasibilityAssessment.status === "missing"
        ? "text-on-surface-variant"
        : "text-secondary";
  const feasibilityHeadline = feasibilityAssessment.status === "missing"
    ? "Budget and timeline are required."
    : feasibilityAssessment.status === "unrealistic"
      ? "Constraints need revision before posting."
      : feasibilityAssessment.status === "aggressive"
        ? "Tight constraints need clear tradeoffs."
        : "Ready to draft a first scope.";
  const hasIntakeBlockers = prompt.trim().length >= 5 && (intakeBlockers.length > 0 || missingBudgetOrTimeline);
  const shouldShowScopeAdvisor = prompt.trim().length >= 5 && (
    intakeAssessment.issues.length > 0 ||
    planningInputIssues.length > 0 ||
    intakeGuidanceActive
  );
  const scopeAdvisorNeedsDetail = intakeAssessment.status === "needs_detail" || planningInputIssues.length > 0;

  const buildCurrentScopeRevisionGuidance = () => {
    const milestoneIssues = Array.isArray(editableSoW?.milestones)
      ? editableSoW.milestones.flatMap((milestone: any) => {
          const assessment = assessMilestoneQuality(milestone);
          const title = String(milestone?.title || "Untitled milestone");
          return assessment.blockingIssues.slice(0, 2).map((issue) => ({
            title,
            issue,
            guidance: guidanceForIssue(issue),
          }));
        })
      : [];

    return buildScopeRevisionGuidance({
      milestoneIssues,
      feasibilityStatus: feasibilityAssessment.status,
      feasibilityNextSteps: feasibilityAssessment.nextSteps,
      leanScopeOptions: feasibilityAssessment.leanScopeOptions,
      budgetAmount: capturedBudgetAmount,
      timelineDays: requestedTimelineDays,
    });
  };

  const resolveMilestoneIssues = () => {
    const firstFailingIndex = milestoneQualityAssessments.findIndex((assessment) => !assessment.passes);

    if (firstFailingIndex < 0) {
      setStep(3);
      return;
    }

    setActivePhaseIndex(firstFailingIndex);
    applyMilestoneQualityFixes(firstFailingIndex);
  };

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
                 <p className="text-xs text-on-surface-variant">
                   {toastMessage.includes("Creating") || toastMessage.includes("Successfully")
                     ? "Redirecting..."
                     : "Review the highlighted scope details."}
                 </p>
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

                        <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/50 p-4">
                           <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scope process</p>
                                 <h3 className="mt-1 text-sm font-black text-on-surface">From rough idea to verifiable milestones</h3>
                              </div>
                              <p className="max-w-md text-xs leading-5 text-on-surface-variant">
                                 The AI keeps your budget, timeline, and edits in the loop while it pressure-tests whether the work can be posted as outcome-based delivery.
                              </p>
                           </div>
                           <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              {SCOPE_PROCESS_STEPS.map((processStep, index) => (
                                 <div key={processStep.title} className="rounded-lg border border-outline-variant/20 bg-surface p-3">
                                    <div className="flex items-center gap-2">
                                       <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                          <span className="material-symbols-outlined text-[16px]">{processStep.icon}</span>
                                       </span>
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Step {index + 1}</p>
                                          <p className="text-xs font-black text-on-surface">{processStep.title}</p>
                                       </div>
                                    </div>
                                    <p className="mt-3 text-xs leading-5 text-on-surface-variant">{processStep.copy}</p>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {prompt.trim().length < 5 && (
                           <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/50 p-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Problem framing</p>
                                    <h3 className="mt-1 text-sm font-black text-on-surface">Choose a broad frame, then make it yours</h3>
                                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                                       These are intentionally generic. Add your actual users, systems, regions, evidence, budget, and timeline before validation.
                                    </p>
                                 </div>
                              </div>
                              <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-3">
                                 {PROJECT_PROBLEM_STARTERS.map((starter) => (
                                    <button
                                      key={starter.label}
                                      type="button"
                                      onClick={() => applyProblemStarter(starter)}
                                      className="group flex flex-col gap-3 rounded-lg border border-outline-variant/20 bg-surface p-3 text-left transition-colors hover:border-secondary/40 hover:bg-secondary/5"
                                    >
                                       <span className="flex items-start gap-3">
                                          <span className="material-symbols-outlined mt-0.5 text-[18px] text-secondary">{starter.icon}</span>
                                          <span className="min-w-0">
                                             <span className="block text-xs font-black text-on-surface">{starter.label}</span>
                                          </span>
                                       </span>
                                       <span className="text-xs leading-5 text-on-surface-variant">{starter.problem}</span>
                                    </button>
                                 ))}
                              </div>
                           </div>
                        )}

                        {prompt.trim().length < 5 && (
                           <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/50 p-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Common starting points</p>
                                    <h3 className="mt-1 text-sm font-black text-on-surface">Start from a familiar software scope</h3>
                                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                                       Choose a starter to prefill editable scope language. Add your actual budget and target timeline before validation.
                                    </p>
                                 </div>
                              </div>
                              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                 {PROJECT_SCOPE_STARTERS.map((starter) => (
                                    <button
                                      key={starter.label}
                                      type="button"
                                      onClick={() => applyProjectStarter(starter)}
                                      className="group flex items-start gap-3 rounded-lg border border-outline-variant/20 bg-surface p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                                    >
                                       <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary">{starter.icon}</span>
                                       <span className="min-w-0">
                                          <span className="block text-xs font-black text-on-surface">{starter.label}</span>
                                       </span>
                                    </button>
                                 ))}
                              </div>
                           </div>
                        )}

                        <div className="relative group">
                           <textarea
                             value={prompt}
                             onChange={(e) => setPrompt(e.target.value)}
                             placeholder="Example: I want to stop doing a manual business process by giving the right users a clear workflow, proof, and reporting they can review."
                             className="w-full h-[320px] bg-surface border border-outline-variant/30 focus-within:border-primary/50 rounded-lg p-6 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 resize-none text-sm focus:outline-none relative z-10 custom-scrollbar leading-relaxed"
                           />
                        </div>

                        {prompt.trim().length >= 30 && intakeAssessment.inputStyle === "problem_statement" && (
                           <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Problem statement detected</p>
                                    <h3 className="mt-1 text-sm font-black text-on-surface">We can translate this into a SOW</h3>
                                    <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">
                                       Before generating milestones, add the systems, trigger, users, exceptions, and proof that would make the result easy to approve.
                                    </p>
                                 </div>
                                 <button
                                   type="button"
                                   onClick={applyGuidedRewrite}
                                   className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-secondary/30 bg-surface px-3 py-2 text-[10px] font-black uppercase tracking-widest text-secondary transition-colors hover:bg-secondary/10"
                                 >
                                    <span className="material-symbols-outlined text-[14px]">conversion_path</span>
                                    Structure It
                                 </button>
                              </div>

                              {intakeAssessment.problemPattern && (
                                 <div className="mt-3 rounded-md border border-secondary/15 bg-surface p-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Detected pattern</p>
                                          <p className="mt-1 text-xs font-black text-on-surface">{intakeAssessment.problemPattern.label}</p>
                                          <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">{intakeAssessment.problemPattern.description}</p>
                                       </div>
                                       <div className="flex flex-wrap gap-1.5 md:max-w-sm md:justify-end">
                                          {intakeAssessment.problemPattern.proofExamples.map((proof) => (
                                             <span
                                               key={proof}
                                               className="rounded-md border border-secondary/15 bg-secondary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary"
                                             >
                                                {proof}
                                             </span>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                              )}

                              {intakeAssessment.guidingQuestions.length > 0 && (
                                 <div className="mt-3 grid gap-2 md:grid-cols-2">
                                    {intakeAssessment.guidingQuestions.slice(0, 4).map((question) => (
                                       <button
                                         key={question}
                                         type="button"
                                         onClick={() => addGuidedQuestionStarter(question)}
                                         className="flex items-start gap-2 rounded-md border border-secondary/15 bg-surface p-3 text-left text-xs font-bold leading-5 text-on-surface transition-colors hover:border-secondary/35 hover:bg-secondary/5"
                                       >
                                          <span className="material-symbols-outlined mt-0.5 text-[15px] text-secondary">help</span>
                                          {question}
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                        )}

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

                        {shouldShowScopeAdvisor && (
                           <div
                              ref={intakeGuidanceRef}
                              className={`rounded-lg border p-4 ${scopeAdvisorNeedsDetail ? "border-error/25 bg-error/5" : "border-tertiary/25 bg-tertiary/5"}`}
                           >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                 <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${scopeAdvisorNeedsDetail ? "text-error" : "text-tertiary"}`}>
                                       Scope advisor
                                    </p>
                                    <h3 className="mt-1 text-sm font-black text-on-surface">
                                       {scopeAdvisorNeedsDetail
                                         ? "Not ready to generate yet."
                                         : "This can be scoped, but these details would improve the result."}
                                    </h3>
                                    <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">
                                       Milestones need a buyer-visible outcome, required budget and timeline, realistic delivery boundaries, and evidence the client can inspect before approval.
                                    </p>
                                 </div>
                                 <div className="rounded-md border border-outline-variant/20 bg-surface px-3 py-2 text-right">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Readiness</p>
                                    <p className="text-lg font-black text-on-surface">{intakeAssessment.score}%</p>
                                 </div>
                              </div>

                              {scopeAdvisorNeedsDetail && intakeGuidanceActive && (
                                 <div className="mt-4 rounded-lg border border-primary/20 bg-surface p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Recommended next steps</p>
                                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                                       <div className="rounded-md border border-outline-variant/15 bg-surface-container-low/40 p-3">
                                          <p className="text-xs font-black text-on-surface">1. Structure the idea</p>
                                          <p className="mt-1 text-xs leading-5 text-on-surface-variant">Use the guided rewrite when the request is rough, vague, or written as a business problem.</p>
                                       </div>
                                       <div className="rounded-md border border-outline-variant/15 bg-surface-container-low/40 p-3">
                                          <p className="text-xs font-black text-on-surface">2. Answer gaps</p>
                                          <p className="mt-1 text-xs leading-5 text-on-surface-variant">Add what you know about users, systems, proof, exceptions, regions, budget, and timeline.</p>
                                       </div>
                                       <div className="rounded-md border border-outline-variant/15 bg-surface-container-low/40 p-3">
                                          <p className="text-xs font-black text-on-surface">3. Generate again</p>
                                          <p className="mt-1 text-xs leading-5 text-on-surface-variant">When required fields are present, Untether will draft verifiable milestones from the full context.</p>
                                       </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                       <button
                                          type="button"
                                          onClick={applyGuidedRewrite}
                                          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary transition-colors hover:bg-primary/90"
                                       >
                                          <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                          Use Guided Rewrite
                                       </button>
                                       {intakeAssessment.guidingQuestions.length > 0 && (
                                          <button
                                             type="button"
                                             onClick={appendGuidedQuestionPrompts}
                                             className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
                                          >
                                             <span className="material-symbols-outlined text-[14px]">playlist_add</span>
                                             Add Question Prompts
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              )}

                              <div className="mt-4 grid gap-3">
                                 {[...planningInputIssues, ...intakeBlockers, ...intakeWarnings].map((issue) => (
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

                              {intakeAssessment.guidingQuestions.length > 0 && (
                                 <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Answer these to unlock a better scope</p>
                                    <div className="mt-3 grid gap-2">
                                       {intakeAssessment.guidingQuestions.map((question) => (
                                          <div key={question} className="flex flex-col gap-2 rounded-md border border-outline-variant/15 bg-surface-container-low/40 p-3 md:flex-row md:items-center md:justify-between">
                                             <p className="text-xs font-bold leading-5 text-on-surface">{question}</p>
                                             <button
                                                type="button"
                                                onClick={() => addGuidedQuestionStarter(question)}
                                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
                                             >
                                                <span className="material-symbols-outlined text-[14px]">add_comment</span>
                                                Add Answer
                                             </button>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-3">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-primary">Try adding this kind of detail</p>
                                 <p className="mt-2 text-xs leading-5 text-on-surface-variant">{intakeAssessment.suggestedPrompt}</p>
                                 <button
                                   type="button"
                                   onClick={applyGuidedRewrite}
                                   className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary transition-colors hover:bg-primary/90"
                                 >
                                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                    Use Guided Rewrite
                                 </button>
                              </div>
                           </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                           <div className="flex-1 relative">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">payments</span> Required Budget</span>
                              </label>
                              <input
                                 type="number"
                                 min="1"
                                 value={budgetInput}
                                 onChange={(e) => setBudgetInput(e.target.value)}
                                 placeholder="15000"
                                 className="w-full bg-surface border border-outline-variant/30 focus:border-primary/50 rounded-lg p-4 text-on-surface text-sm focus:ring-0 focus:outline-none relative z-10 placeholder:text-on-surface-variant/40"
                              />
                           </div>
                           <div className="flex-1 relative">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">schedule</span> Required Timeline</span>
                              </label>
                              <div className="flex items-center gap-2">
                                 <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={timelineInput}
                                    onChange={(e) => {
                                      setTimelineInput(e.target.value);
                                      setDesiredTimeline(e.target.value ? `${e.target.value} days` : "");
                                    }}
                                    placeholder="30"
                                    className="w-full bg-surface border border-outline-variant/30 focus:border-primary/50 rounded-lg p-4 text-on-surface text-sm focus:ring-0 focus:outline-none relative z-10 placeholder:text-on-surface-variant/40"
                                 />
                                 <span className="shrink-0 rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Days</span>
                              </div>
                           </div>
                           {mode === "DISCOVERY" && (
                              <div className="md:col-span-2 flex items-end">
                                 <div className="w-full bg-primary/5 border border-primary/20 rounded-lg p-4">
                                    <p className="text-xs text-primary font-bold">Discovery Mode locks to a 7-day architecture sprint at $1,000.</p>
                                 </div>
                              </div>
                           )}
                        </div>

                        {prompt.trim().length >= 5 && (
                           <div className={`rounded-lg border p-4 ${feasibilityPanelClass}`}>
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                 <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${feasibilityTextClass}`}>
                                      Constraint fit check: {feasibilityAssessment.label}
                                    </p>
                                    <h3 className="mt-1 text-sm font-black text-on-surface">
                                      {feasibilityHeadline}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                      {feasibilityAssessment.reasons.map((reason) => (
                                        <p key={reason} className="text-xs leading-5 text-on-surface-variant">{reason}</p>
                                      ))}
                                    </div>
                                 </div>
                                 {feasibilityAssessment.estimateBreakdown.length > 0 && (
                                    <div className="rounded-md border border-outline-variant/20 bg-surface px-3 py-2 text-right">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Complexity Signals</p>
                                      <p className="text-sm font-black text-on-surface">{feasibilityAssessment.estimateBreakdown.length}</p>
                                    </div>
                                 )}
                              </div>
                              {feasibilityAssessment.estimateBreakdown.length > 0 && (
                                 <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface p-3">
                                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Complexity signals</p>
                                          <p className="mt-1 text-xs leading-5 text-on-surface-variant">These are the factors currently adding delivery risk. They guide scope tradeoffs without publishing a generic project price.</p>
                                       </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                                       {feasibilityAssessment.estimateBreakdown.map((driver) => (
                                          <div key={`${driver.label}-${driver.budget}-${driver.days}`} className="rounded-md border border-outline-variant/15 bg-surface-container-low/40 p-3">
                                             <div className="flex items-start justify-between gap-3">
                                                <div>
                                                   <p className="text-xs font-black text-on-surface">{driver.label}</p>
                                                   {driver.detail && <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{driver.detail}</p>}
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                              <div className="mt-3 flex flex-wrap gap-2">
                                 {feasibilityAssessment.hints.map((hint) => (
                                    <span key={hint} className="rounded-md border border-outline-variant/15 bg-surface px-3 py-2 text-xs font-bold text-on-surface">
                                      {hint}
                                    </span>
                                 ))}
                              </div>
                              {feasibilityAssessment.status !== "market_ready" && (
                                 <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Guided recovery</p>
                                          <h4 className="mt-1 text-sm font-black text-on-surface">Choose the path that matches what you know</h4>
                                          <div className="mt-2 space-y-1">
                                             {feasibilityAssessment.nextSteps.map((stepText) => (
                                                <p key={stepText} className="text-xs leading-5 text-on-surface-variant">{stepText}</p>
                                             ))}
                                          </div>
                                          {feasibilityAssessment.leanScopeOptions.length > 0 && (
                                             <div className="mt-3 rounded-md border border-outline-variant/15 bg-surface-container-low/50 p-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Lean scope options</p>
                                                <div className="mt-2 space-y-1.5">
                                                   {feasibilityAssessment.leanScopeOptions.map((option) => (
                                                      <p key={option} className="flex gap-2 text-xs leading-5 text-on-surface-variant">
                                                         <span className="material-symbols-outlined mt-0.5 text-[14px] text-primary">arrow_right_alt</span>
                                                         <span>{option}</span>
                                                      </p>
                                                   ))}
                                                </div>
                                             </div>
                                          )}
                                       </div>
                                       <div className="grid min-w-56 gap-2">
                                          {feasibilityAssessment.phasedScopePrompt && (
                                             <button
                                                type="button"
                                                onClick={applyPhasedScopePrompt}
                                                className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
                                             >
                                                <span className="material-symbols-outlined text-[14px]">account_tree</span>
                                                Phase First Release
                                             </button>
                                          )}
                                          {feasibilityAssessment.status === "unrealistic" && mode !== "DISCOVERY" && (
                                             <button
                                                type="button"
                                                onClick={convertToDiscoveryScope}
                                                className="inline-flex items-center justify-center gap-2 rounded-md bg-error px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-error transition-colors hover:bg-error/90"
                                             >
                                                <span className="material-symbols-outlined text-[14px]">travel_explore</span>
                                                Discovery Sprint
                                             </button>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                        <div className="flex justify-end pt-4">
                           <button
                             type={hasIntakeBlockers ? "button" : "submit"}
                             onClick={hasIntakeBlockers ? handleResolveScopeDetails : undefined}
                             disabled={prompt.trim().length < 5 || isGenerating}
                             className={`px-8 py-3 rounded-md flex items-center gap-3 font-bold uppercase tracking-widest text-sm transition-all ${prompt.trim().length < 5 || isGenerating ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-70' : hasIntakeBlockers ? 'bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
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

               <div className="max-w-4xl mx-auto rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scope revision loop</p>
                        <h3 className="mt-1 text-sm font-black text-on-surface">Refine with the full interaction history</h3>
                        <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                           Add what changed or what the AI missed. The next draft receives the rough prompt, previous SOW, current edits, and your latest instruction.
                        </p>
                     </div>
                     <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                        {capturedBudgetAmount && <span className="rounded-md border border-primary/20 bg-surface px-2 py-1 text-primary">{formatCurrency(capturedBudgetAmount)} locked</span>}
                        {requestedTimelineDays && <span className="rounded-md border border-primary/20 bg-surface px-2 py-1 text-primary">{requestedTimelineDays} days locked</span>}
                     </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                     <textarea
                        value={scopeRevisionNote}
                        onChange={(e) => {
                           setScopeRevisionNote(e.target.value);
                           if (scopeRevisionHelp.length > 0) setScopeRevisionHelp([]);
                           if (suggestedScopeRevision) setSuggestedScopeRevision("");
                        }}
                        rows={3}
                        className="min-h-24 flex-1 resize-none rounded-lg border border-outline-variant/30 bg-surface p-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary/50"
                        placeholder="Example: Keep the $15,000 budget and 30-day duration, but split compliance into its own milestone and make the chatbot a later checkpoint."
                     />
                     <button
                        type="button"
                        onClick={handleRefineScope}
                        disabled={isGenerating || scopeRevisionNote.trim().length < 5}
                        className={`inline-flex min-w-40 items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${isGenerating || scopeRevisionNote.trim().length < 5 ? 'bg-surface-variant text-on-surface-variant opacity-70' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
                     >
                        <span className="material-symbols-outlined text-[16px]">sync</span>
                        Refine Scope
                     </button>
                  </div>
                  {scopeRevisionHelp.length > 0 && (
                     <div className="mt-4 rounded-lg border border-secondary/20 bg-secondary/5 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Revision guidance</p>
                              <h4 className="mt-1 text-sm font-black text-on-surface">Here is what needs attention</h4>
                              <div className="mt-3 space-y-2">
                                 {scopeRevisionHelp.map((item) => (
                                    <p key={item} className="flex gap-2 text-xs leading-5 text-on-surface-variant">
                                       <span className="material-symbols-outlined mt-0.5 text-[14px] text-secondary">arrow_right_alt</span>
                                       <span>{item}</span>
                                    </p>
                                 ))}
                              </div>
                           </div>
                           {suggestedScopeRevision && (
                              <button
                                type="button"
                                onClick={() => {
                                   setScopeRevisionNote(suggestedScopeRevision);
                                   setScopeRevisionHelp([]);
                                }}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-secondary transition-colors hover:bg-secondary/90"
                              >
                                 <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                 Use Suggested Revision
                              </button>
                           )}
                        </div>
                     </div>
                  )}
               </div>

               <div className={`max-w-4xl mx-auto rounded-lg border p-4 ${feasibilityPanelClass}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                     <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${feasibilityTextClass}`}>
                           Scope controls: {feasibilityAssessment.label}
                        </p>
                        <h3 className="mt-1 text-sm font-black text-on-surface">{feasibilityHeadline}</h3>
                        <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                           These are the buyer-entered constraints the SOW should preserve through edits, revisions, matching, and posting.
                        </p>
                     </div>
                     {feasibilityAssessment.estimateBreakdown.length > 0 && (
                        <div className="rounded-md border border-outline-variant/20 bg-surface px-3 py-2 text-right">
                           <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Complexity Signals</p>
                           <p className="text-sm font-black text-on-surface">{feasibilityAssessment.estimateBreakdown.length}</p>
                        </div>
                     )}
                  </div>
                  {capturedScopeConstraints.length > 0 && (
                     <div className="mt-4 flex flex-wrap gap-2">
                        {capturedScopeConstraints.map((constraint) => (
                           <span key={constraint} className="rounded-md border border-outline-variant/15 bg-surface px-3 py-2 text-xs font-bold text-on-surface">
                              {constraint}
                           </span>
                        ))}
                     </div>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                     {feasibilityAssessment.hints.map((hint) => (
                        <div key={hint} className="flex items-start gap-2 rounded-md border border-outline-variant/15 bg-surface/60 p-3 text-xs leading-5 text-on-surface-variant">
                           <span className={`material-symbols-outlined mt-0.5 text-[15px] ${feasibilityTextClass}`}>tips_and_updates</span>
                           <span>{hint}</span>
                        </div>
                     ))}
                  </div>
                  {feasibilityAssessment.status === "unrealistic" && mode !== "DISCOVERY" && (
                     <div className="mt-4 flex flex-col gap-3 rounded-md border border-error/25 bg-surface p-3 md:flex-row md:items-center md:justify-between">
                        <div>
                           <p className="text-xs font-black uppercase tracking-widest text-error">Posting is blocked until the buyer chooses a recovery path</p>
                           <div className="mt-2 space-y-1">
                              {feasibilityAssessment.nextSteps.map((stepText) => (
                                 <p key={stepText} className="text-xs leading-5 text-on-surface-variant">{stepText}</p>
                              ))}
                           </div>
                        </div>
                        <div className="grid shrink-0 gap-2">
                           <button
                              type="button"
                              onClick={applyPhasedScopePrompt}
                              className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
                           >
                              <span className="material-symbols-outlined text-[15px]">account_tree</span>
                              Phase Scope
                           </button>
                           <button
                              type="button"
                              onClick={convertToDiscoveryScope}
                              className="inline-flex items-center justify-center gap-2 rounded-md bg-error px-3 py-2 text-xs font-black uppercase tracking-widest text-on-error transition-colors hover:bg-error/90"
                           >
                              <span className="material-symbols-outlined text-[15px]">travel_explore</span>
                              Discovery Sprint
                           </button>
                        </div>
                     </div>
                  )}
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
                      const deliverables = getMilestoneDeliverables(m);
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
                                 Reviewable Outputs ({deliverables.length})
                              </p>

                              <div className="space-y-4">
                                 {deliverables.length === 0 && (
                                    <div className="rounded-lg border border-tertiary/20 bg-tertiary/5 p-4 text-xs leading-5 text-on-surface-variant">
                                       Add at least two outputs the buyer can inspect, open, run, or download. Good examples include a working screen, source archive, report export, integration log, staging link, or handoff file.
                                    </div>
                                 )}
                                 {deliverables.map((d: string, dIdx: number) => (
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
            const budgetDelta = capturedBudgetAmount ? totalEscrow - capturedBudgetAmount : 0;
            const pricingMatchesBudget = !capturedBudgetAmount || Math.abs(budgetDelta) <= 1;

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
                        {capturedBudgetAmount && (
                           <div className={`rounded-lg border p-4 ${pricingMatchesBudget ? 'border-secondary/20 bg-secondary/5' : 'border-tertiary/25 bg-tertiary/5'}`}>
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                 <div className="flex items-start gap-3">
                                    <span className={`material-symbols-outlined text-[20px] ${pricingMatchesBudget ? 'text-secondary' : 'text-tertiary'}`}>
                                       {pricingMatchesBudget ? 'price_check' : 'price_change'}
                                    </span>
                                    <div>
                                       <p className="text-xs font-black uppercase tracking-widest text-on-surface">Budget Fit</p>
                                       <p className="mt-1 text-sm text-on-surface-variant">
                                          {pricingMatchesBudget
                                             ? `Milestone pricing matches the buyer-entered budget of ${formatCurrency(capturedBudgetAmount)}.`
                                             : `Milestone pricing is ${formatCurrency(Math.abs(budgetDelta))} ${budgetDelta > 0 ? 'above' : 'below'} the buyer-entered budget of ${formatCurrency(capturedBudgetAmount)}.`}
                                       </p>
                                    </div>
                                 </div>
                                 {!pricingMatchesBudget && (
                                    <button
                                       type="button"
                                       onClick={() => setEditableSoW(alignMilestoneAmountsToBudget(editableSoW || sowData, capturedBudgetAmount))}
                                       className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-on-primary hover:bg-primary/90 active:scale-95"
                                    >
                                       <span className="material-symbols-outlined text-[16px]">balance</span>
                                       Rebalance to budget
                                    </button>
                                 )}
                              </div>
                           </div>
                        )}

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
                        onClick={() => {
                           if (allMilestonesReady) {
                              setStep(3);
                           } else {
                              resolveMilestoneIssues();
                           }
                        }}
                        className={`px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm flex items-center gap-3 transition-all ${allMilestonesReady ? 'bg-on-surface text-surface hover:bg-on-surface/90 active:scale-95' : 'bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15 active:scale-95'}`}
                     >
                        {allMilestonesReady ? 'Approve Timeline & Set Pricing' : 'Resolve Milestone Issues'} <span className="material-symbols-outlined text-[18px]">{allMilestonesReady ? 'arrow_forward' : 'auto_fix_high'}</span>
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
