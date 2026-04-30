import { extractCentralComponentConstraints, extractRegionConstraints } from "./scope-constraints.ts";

export type ScopeFeasibilityAssessment = {
  status: "missing" | "realistic" | "tight" | "underfunded";
  estimatedMarketBudget: number | null;
  estimatedMarketDays: number | null;
  budgetRatio: number | null;
  timelineRatio: number | null;
  reasons: string[];
  hints: string[];
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
      estimatedMarketBudget: null,
      estimatedMarketDays: null,
      budgetRatio: null,
      timelineRatio: null,
      reasons: ["Budget and timeline are required before scope generation."],
      hints: ["Enter a target budget and delivery duration so the scope can be checked against realistic marketplace rates."],
    };
  }

  const components = extractCentralComponentConstraints(prompt);
  const markets = extractRegionConstraints(prompt);
  const complianceMultiplier = hasComplianceLanguage(prompt) ? 1 : 0;
  const aiMultiplier = hasAIComponent(prompt) ? 1 : 0;
  const estimatedMarketBudget = roundTo(
    BASE_PROJECT_COST +
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
        components.length * COMPONENT_DAYS +
        markets.length * MARKET_DAYS +
        complianceMultiplier * COMPLIANCE_DAYS +
        aiMultiplier * AI_COMPONENT_DAYS
    )
  );
  const budgetRatio = budgetAmount / estimatedMarketBudget;
  const timelineRatio = timelineDays / estimatedMarketDays;
  const reasons: string[] = [];
  const hints: string[] = [];

  if (budgetRatio < 0.65) {
    reasons.push(`Budget is materially below the rough market estimate of about $${estimatedMarketBudget.toLocaleString("en-US")}.`);
    hints.push("Reduce the first release, move lower-priority components to later milestones, or raise the budget.");
  } else if (budgetRatio < 0.9) {
    reasons.push(`Budget is tight against the rough market estimate of about $${estimatedMarketBudget.toLocaleString("en-US")}.`);
    hints.push("Keep the first milestone set lean and reserve advanced features for follow-on work.");
  }

  if (timelineRatio < 0.65) {
    reasons.push(`Timeline is materially shorter than the rough delivery estimate of about ${estimatedMarketDays} days.`);
    hints.push("Extend the timeline, reduce market coverage, or phase complex components after launch.");
  } else if (timelineRatio < 0.9) {
    reasons.push(`Timeline is tight against the rough delivery estimate of about ${estimatedMarketDays} days.`);
    hints.push("Use smaller milestones and define what can be deferred if delivery risk appears.");
  }

  if (reasons.length === 0) {
    reasons.push("Budget and timeline are within a reasonable planning range for this scope.");
    hints.push("Proceed with milestone generation, then verify each milestone has buyer-visible evidence.");
  }

  const status = budgetRatio < 0.65 || timelineRatio < 0.65
    ? "underfunded"
    : budgetRatio < 0.9 || timelineRatio < 0.9
      ? "tight"
      : "realistic";

  return {
    status,
    estimatedMarketBudget,
    estimatedMarketDays,
    budgetRatio,
    timelineRatio,
    reasons,
    hints,
  };
}
