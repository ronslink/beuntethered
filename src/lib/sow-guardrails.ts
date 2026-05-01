import {
  alignMilestoneAmountsToBudget,
  alignMilestoneDurationsToTimeline,
  normalizeGeneratedSow,
} from "./milestone-quality.ts";
import {
  ensureSowPreservesScopeConstraints,
  type ScopeConstraints,
} from "./scope-constraints.ts";

type GeneratedSowLike = {
  executiveSummary?: unknown;
  milestones?: unknown;
  totalAmount?: unknown;
  [key: string]: unknown;
};

export function applySowGuardrails<T extends GeneratedSowLike>(
  draft: T,
  constraints: ScopeConstraints
): T {
  const normalized = normalizeGeneratedSow(draft);
  const timelineAligned = alignMilestoneDurationsToTimeline(normalized, constraints.timelineDays);
  const budgetAligned = alignMilestoneAmountsToBudget(timelineAligned, constraints.budgetAmount);

  return ensureSowPreservesScopeConstraints(budgetAligned, constraints);
}
