import {
  alignMilestoneAmountsToBudget,
  alignMilestoneDurationsToTimeline,
  assessMilestoneQuality,
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

export type SowGuardrailReportItem = {
  key: "budget" | "timeline" | "regions" | "components" | "milestoneEvidence";
  label: string;
  status: "passed" | "needs_attention" | "not_applicable";
  detail: string;
  expected?: string;
  actual?: string;
  present?: string[];
  missing?: string[];
};

export type SowGuardrailReport = {
  overallStatus: "passed" | "needs_attention";
  items: SowGuardrailReportItem[];
};

const REPORT_ITEM_KEYS = new Set<SowGuardrailReportItem["key"]>([
  "budget",
  "timeline",
  "regions",
  "components",
  "milestoneEvidence",
]);

const REPORT_ITEM_STATUSES = new Set<SowGuardrailReportItem["status"]>([
  "passed",
  "needs_attention",
  "not_applicable",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isSowGuardrailReport(value: unknown): value is SowGuardrailReport {
  if (!isPlainRecord(value)) return false;

  const { overallStatus, items } = value;
  if (overallStatus !== "passed" && overallStatus !== "needs_attention") return false;
  if (!Array.isArray(items)) return false;

  return items.every((item) => {
    if (!isPlainRecord(item)) return false;

    return (
      REPORT_ITEM_KEYS.has(item.key as SowGuardrailReportItem["key"]) &&
      REPORT_ITEM_STATUSES.has(item.status as SowGuardrailReportItem["status"]) &&
      typeof item.label === "string" &&
      typeof item.detail === "string"
    );
  });
}

export function getSowGuardrailReportFromMetadata(metadata: unknown): SowGuardrailReport | null {
  if (!isPlainRecord(metadata)) return null;

  const report = metadata.scope_validation_report;
  return isSowGuardrailReport(report) ? report : null;
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function milestonesOf(sow: GeneratedSowLike) {
  return Array.isArray(sow.milestones) ? sow.milestones : [];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text: string, term: string) {
  return new RegExp(escapeRegExp(term).replace(/\s+/g, "\\s+"), "i").test(text);
}

export function applySowGuardrails<T extends GeneratedSowLike>(
  draft: T,
  constraints: ScopeConstraints
): T {
  const normalized = normalizeGeneratedSow(draft);
  const timelineAligned = alignMilestoneDurationsToTimeline(normalized, constraints.timelineDays);
  const budgetAligned = alignMilestoneAmountsToBudget(timelineAligned, constraints.budgetAmount);

  return ensureSowPreservesScopeConstraints(budgetAligned, constraints);
}

export function buildSowGuardrailReport(
  sow: GeneratedSowLike,
  constraints: ScopeConstraints
): SowGuardrailReport {
  const milestones = milestonesOf(sow);
  const serialized = JSON.stringify({
    executiveSummary: sow.executiveSummary,
    milestones,
  });
  const totalAmount = milestones.reduce((sum, milestone) => (
    sum + numberValue((milestone as { amount?: unknown })?.amount)
  ), 0);
  const totalDays = milestones.reduce((sum, milestone) => (
    sum + numberValue((milestone as { estimated_duration_days?: unknown })?.estimated_duration_days)
  ), 0);
  const presentRegions = constraints.regions.filter((region) => containsTerm(serialized, region));
  const missingRegions = constraints.regions.filter((region) => !containsTerm(serialized, region));
  const presentComponents = constraints.components.filter((component) => containsTerm(serialized, component));
  const missingComponents = constraints.components.filter((component) => !containsTerm(serialized, component));
  const milestoneAssessments = milestones.map((milestone) => assessMilestoneQuality(milestone as Record<string, unknown>));
  const readyMilestones = milestoneAssessments.filter((assessment) => assessment.passes).length;
  const items: SowGuardrailReportItem[] = [
    constraints.budgetAmount
      ? {
          key: "budget",
          label: "Budget lock",
          status: Math.round(totalAmount) === Math.round(constraints.budgetAmount) ? "passed" : "needs_attention",
          expected: formatMoney(constraints.budgetAmount),
          actual: formatMoney(totalAmount),
          detail: Math.round(totalAmount) === Math.round(constraints.budgetAmount)
            ? "Milestone amounts match the buyer-entered budget."
            : "Milestone amounts need to be rebalanced before posting.",
        }
      : {
          key: "budget",
          label: "Budget lock",
          status: "not_applicable",
          detail: "No buyer budget was supplied.",
        },
    constraints.timelineDays
      ? {
          key: "timeline",
          label: "Timeline lock",
          status: Math.round(totalDays) === Math.round(constraints.timelineDays) ? "passed" : "needs_attention",
          expected: `${constraints.timelineDays} days`,
          actual: `${totalDays} days`,
          detail: Math.round(totalDays) === Math.round(constraints.timelineDays)
            ? "Milestone durations match the buyer-entered timeline."
            : "Milestone durations need to be rebalanced before posting.",
        }
      : {
          key: "timeline",
          label: "Timeline lock",
          status: "not_applicable",
          detail: "No buyer timeline was supplied.",
        },
    constraints.regions.length > 0
      ? {
          key: "regions",
          label: "Region coverage",
          status: missingRegions.length === 0 ? "passed" : "needs_attention",
          present: presentRegions,
          missing: missingRegions,
          detail: missingRegions.length === 0
            ? "All named regions are represented in the scope."
            : `Missing region coverage: ${missingRegions.join(", ")}.`,
        }
      : {
          key: "regions",
          label: "Region coverage",
          status: "not_applicable",
          detail: "No regions were supplied.",
        },
    constraints.components.length > 0
      ? {
          key: "components",
          label: "Component coverage",
          status: missingComponents.length === 0 ? "passed" : "needs_attention",
          present: presentComponents,
          missing: missingComponents,
          detail: missingComponents.length === 0
            ? "All named components appear in milestone evidence."
            : `Missing component coverage: ${missingComponents.join(", ")}.`,
        }
      : {
          key: "components",
          label: "Component coverage",
          status: "not_applicable",
          detail: "No required components were supplied.",
        },
    {
      key: "milestoneEvidence",
      label: "Milestone evidence",
      status: milestones.length > 0 && readyMilestones === milestones.length ? "passed" : "needs_attention",
      actual: `${readyMilestones}/${milestones.length} ready`,
      detail: milestones.length > 0 && readyMilestones === milestones.length
        ? "Every milestone has buyer-visible outputs and proof checks."
        : "Some milestones still need stronger deliverables, acceptance checks, or proof artifacts.",
    },
  ];

  return {
    overallStatus: items.some((item) => item.status === "needs_attention") ? "needs_attention" : "passed",
    items,
  };
}
