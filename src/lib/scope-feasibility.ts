import {
  estimateProjectTargetBreakdown,
  extractCentralComponentConstraints,
  extractProjectTargets,
  extractRegionConstraints,
} from "./scope-constraints.ts";

export type ScopeFeasibilityEstimateDriver = {
  label: string;
  budget: number;
  days: number;
  detail?: string;
};

export type ScopeFeasibilityAssessment = {
  status: "missing" | "market_ready" | "aggressive" | "unrealistic";
  label: "Budget Needed" | "Ready to draft" | "Tight constraints" | "Needs revision";
  canPostExecution: boolean;
  estimatedMarketBudget: number | null;
  estimatedMarketDays: number | null;
  estimateBreakdown: ScopeFeasibilityEstimateDriver[];
  recommendedBudget: number | null;
  recommendedTimelineDays: number | null;
  phasedScopePrompt: string | null;
  budgetRatio: number | null;
  timelineRatio: number | null;
  reasons: string[];
  hints: string[];
  nextSteps: string[];
  leanScopeOptions: string[];
};

const BASE_PROJECT_COST = 4000;
const BASE_PROJECT_DAYS = 14;
const COMPONENT_COST = 2500;
const COMPONENT_DAYS = 5;
const MARKET_COST = 900;
const MARKET_DAYS = 2;
const COMPLIANCE_COST = 2500;
const COMPLIANCE_DAYS = 5;
const AI_COMPONENT_COST = 2500;
const AI_COMPONENT_DAYS = 5;

function roundTo(value: number, increment: number) {
  return Math.max(increment, Math.round(value / increment) * increment);
}

function hasComplianceLanguage(prompt: string) {
  return /\b(compliance|tax|payroll|regulated|audit|security|privacy|gdpr|hipaa|soc\s*2)\b/i.test(prompt);
}

function hasAIComponent(prompt: string) {
  return /\b(ai|chatbot|agent|llm|model|assistant)\b/i.test(prompt);
}

function buildPhasedScopePrompt(prompt: string, targets: string[], components: string[], markets: string[]) {
  const firstTargets = targets.slice(0, 2);
  const deferredTargets = targets.slice(2);
  const firstComponents = components.slice(0, 3);
  const deferredComponents = components.slice(3);
  const marketsText = markets.length > 0 ? ` for ${markets.join(", ")}` : "";
  const firstRelease = [
    ...firstTargets,
    ...firstComponents,
  ];
  const deferred = [
    ...deferredTargets,
    ...deferredComponents,
  ];

  if (firstRelease.length === 0) {
    return `${prompt.trim()} Focus the first release on one buyer-visible workflow with a working preview, clear acceptance checks, and evidence artifacts. Defer lower-priority enhancements to a later phase.`;
  }

  const firstReleaseText = firstRelease.join(", ");
  const deferredText = deferred.length > 0
    ? ` Defer ${deferred.join(", ")} to a follow-on phase unless budget and timeline are increased.`
    : " Defer non-essential polish, secondary integrations, and advanced automation to a follow-on phase.";

  return `Create a phased first release${marketsText} focused on ${firstReleaseText}. Keep the first scope milestone-based, buyer-verifiable, and launch-ready within the stated budget and timeline.${deferredText}`;
}

function buildEstimateBreakdown({
  targetBreakdown,
  components,
  markets,
  includesCompliance,
  includesAI,
}: {
  targetBreakdown: ScopeFeasibilityEstimateDriver[];
  components: string[];
  markets: string[];
  includesCompliance: boolean;
  includesAI: boolean;
}) {
  const breakdown: Array<ScopeFeasibilityEstimateDriver | null> = [
    {
      label: "Delivery wrapper",
      budget: BASE_PROJECT_COST,
      days: BASE_PROJECT_DAYS,
      detail: "Setup, project coordination, review checkpoints, QA evidence, and handoff.",
    },
    ...targetBreakdown.map((target) => ({
      ...target,
      detail: "Detected project archetype.",
    })),
    components.length > 0
      ? {
          label: `Named components (${components.length})`,
          budget: components.length * COMPONENT_COST,
          days: components.length * COMPONENT_DAYS,
          detail: components.join(", "),
        }
      : null,
    markets.length > 0
      ? {
          label: `Markets/regions (${markets.length})`,
          budget: markets.length * MARKET_COST,
          days: markets.length * MARKET_DAYS,
          detail: markets.join(", "),
        }
      : null,
    includesCompliance
      ? {
          label: "Compliance sensitivity",
          budget: COMPLIANCE_COST,
          days: COMPLIANCE_DAYS,
          detail: "Tax, payroll, privacy, security, or regulated workflow language was detected.",
        }
      : null,
    includesAI
      ? {
          label: "AI-assisted feature",
          budget: AI_COMPONENT_COST,
          days: AI_COMPONENT_DAYS,
          detail: "AI chatbot, agent, model, or assistant behavior needs prompt, guardrail, and evaluation evidence.",
        }
      : null,
  ];

  return breakdown.filter((entry): entry is ScopeFeasibilityEstimateDriver => entry !== null);
}

function buildLeanScopeOptions({
  targets,
  components,
  markets,
  includesCompliance,
  includesAI,
}: {
  targets: string[];
  components: string[];
  markets: string[];
  includesCompliance: boolean;
  includesAI: boolean;
}) {
  const options: string[] = [];

  if (targets.length > 1) {
    options.push(`Keep ${targets[0]} in the first release and move ${targets.slice(1).join(", ")} to follow-on milestones.`);
  }

  if (components.length > 3) {
    options.push(`Start with ${components.slice(0, 3).join(", ")} and make ${components.slice(3).join(", ")} explicit later-phase work.`);
  }

  if (markets.length > 1) {
    options.push(`Launch one region first, then add ${markets.slice(1).join(", ")} after the workflow and compliance evidence are verified.`);
  }

  if (includesCompliance) {
    options.push("Run a short discovery milestone first if tax, payroll, privacy, or regulated workflows are not already documented.");
  }

  if (includesAI) {
    options.push("Ship the AI feature as a bounded assistant with test prompts and fallback rules before expanding agent automation.");
  }

  if (options.length === 0) {
    options.push("Keep the first release to one buyer-visible workflow with proof artifacts before adding secondary enhancements.");
  }

  return options.slice(0, 4);
}

export function assessScopeFeasibility({
  prompt,
  budgetAmount,
  timelineDays,
}: {
  prompt: string;
  budgetAmount: number | null;
  timelineDays: number | null;
}): ScopeFeasibilityAssessment {
  if (!budgetAmount || !timelineDays) {
    return {
      status: "missing",
      label: "Budget Needed",
      canPostExecution: false,
      estimatedMarketBudget: null,
      estimatedMarketDays: null,
      estimateBreakdown: [],
      recommendedBudget: null,
      recommendedTimelineDays: null,
      phasedScopePrompt: null,
      budgetRatio: null,
      timelineRatio: null,
      reasons: ["Budget and timeline are required before scope generation."],
      hints: ["Enter the amount the buyer can fund and the delivery duration the team can actually support."],
      nextSteps: [
        "Enter the maximum budget the buyer can actually fund.",
        "Enter the latest acceptable launch or review date as a number of days.",
        "Describe the smallest useful first release if the full idea is flexible.",
      ],
      leanScopeOptions: [
        "Start with the smallest buyer-visible workflow if the full budget or launch date is still uncertain.",
      ],
    };
  }

  const components = extractCentralComponentConstraints(prompt);
  const markets = extractRegionConstraints(prompt);
  const targets = extractProjectTargets(prompt);
  const targetBreakdown = estimateProjectTargetBreakdown(targets);
  const targetEstimate = targetBreakdown.reduce(
    (estimate, target) => ({
      budget: estimate.budget + target.budget,
      days: estimate.days + target.days,
    }),
    { budget: 0, days: 0 }
  );
  const includesCompliance = hasComplianceLanguage(prompt);
  const includesAI = hasAIComponent(prompt);
  const estimateBreakdown = buildEstimateBreakdown({
    targetBreakdown,
    components,
    markets,
    includesCompliance,
    includesAI,
  });
  const complianceMultiplier = includesCompliance ? 1 : 0;
  const aiMultiplier = includesAI ? 1 : 0;
  const estimatedMarketBudget = roundTo(
    BASE_PROJECT_COST +
      targetEstimate.budget +
      components.length * COMPONENT_COST +
      markets.length * MARKET_COST +
      complianceMultiplier * COMPLIANCE_COST +
      aiMultiplier * AI_COMPONENT_COST,
    500
  );
  const estimatedMarketDays = Math.max(
    7,
    Math.round(
      BASE_PROJECT_DAYS +
        targetEstimate.days +
        components.length * COMPONENT_DAYS +
        markets.length * MARKET_DAYS +
        complianceMultiplier * COMPLIANCE_DAYS +
        aiMultiplier * AI_COMPONENT_DAYS
    )
  );
  const budgetRatio = budgetAmount / estimatedMarketBudget;
  const timelineRatio = timelineDays / estimatedMarketDays;
  const recommendedBudget = roundTo(estimatedMarketBudget, 500);
  const recommendedTimelineDays = Math.max(7, Math.ceil(estimatedMarketDays / 7) * 7);
  const phasedScopePrompt = buildPhasedScopePrompt(prompt, targets, components, markets);
  const leanScopeOptions = buildLeanScopeOptions({
    targets,
    components,
    markets,
    includesCompliance,
    includesAI,
  });
  const reasons: string[] = [];
  const hints: string[] = [];
  const nextSteps: string[] = [];

  if (budgetRatio < 0.65) {
    reasons.push("Budget appears materially below the planning range for the detected scope, components, and delivery risk.");
    hints.push(targets.length > 0 ? `Reduce or phase major targets such as ${targets.join(", ")}, or raise the budget.` : "Reduce the first release, move lower-priority components to later milestones, or raise the budget.");
    nextSteps.push("Increase the buyer budget or narrow the first release until each milestone can be funded and verified.");
  } else if (budgetRatio < 0.9) {
    reasons.push("Budget is tight for the detected scope and should be treated as a constraint, not an automatic price.");
    hints.push("Keep the first milestone set lean and reserve advanced features for follow-on work.");
    nextSteps.push("Keep only the buyer-critical workflow in the first release and make optional items later milestones.");
  }

  if (timelineRatio < 0.65) {
    reasons.push("Timeline appears materially shorter than the delivery effort implied by the detected scope.");
    hints.push(targets.length > 0 ? `Extend the timeline or phase added targets such as ${targets.join(", ")} after launch.` : "Extend the timeline, reduce market coverage, or phase complex components after launch.");
    nextSteps.push("Extend the timeline or split the idea into discovery plus a smaller first delivery scope.");
  } else if (timelineRatio < 0.9) {
    reasons.push("Timeline is tight for the detected scope and should be protected with smaller review checkpoints.");
    hints.push("Use smaller milestones and define what can be deferred if delivery risk appears.");
    nextSteps.push("Ask for a smaller launch slice and require clear evidence on each milestone.");
  }

  if (reasons.length === 0) {
    reasons.push("Budget and timeline are within a reasonable planning range for this scope.");
    hints.push("Proceed with milestone generation, then verify each milestone has buyer-visible evidence.");
    nextSteps.push("Generate the SOW and review every milestone for evidence, acceptance criteria, and payment clarity.");
  }

  const status = budgetRatio < 0.65 || timelineRatio < 0.65
    ? "unrealistic"
    : budgetRatio < 0.9 || timelineRatio < 0.9
      ? "aggressive"
      : "market_ready";

  return {
    status,
    label: status === "market_ready"
      ? "Ready to draft"
      : status === "aggressive"
        ? "Tight constraints"
        : "Needs revision",
    canPostExecution: status !== "unrealistic",
    estimatedMarketBudget,
    estimatedMarketDays,
    estimateBreakdown,
    recommendedBudget,
    recommendedTimelineDays,
    phasedScopePrompt,
    budgetRatio,
    timelineRatio,
    reasons,
    hints,
    nextSteps,
    leanScopeOptions,
  };
}
