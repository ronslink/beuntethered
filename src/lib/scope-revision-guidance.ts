export type RevisionMilestoneIssue = {
  title: string;
  issue: string;
  guidance: string;
};

export type ScopeRevisionGuidanceInput = {
  milestoneIssues: RevisionMilestoneIssue[];
  feasibilityStatus: "missing" | "market_ready" | "aggressive" | "unrealistic" | string;
  feasibilityNextSteps: string[];
  leanScopeOptions: string[];
  budgetAmount: number | null;
  timelineDays: number | null;
};

const HELP_REQUEST_PATTERNS = [
  /\bwhat\s+(do|should|would)\s+i\s+(need\s+to\s+)?(change|fix|adjust|improve)\b/i,
  /\bwhat\s+(needs?|should)\s+(change|be\s+changed|be\s+fixed|be\s+improved)\b/i,
  /\bwhat\s+is\s+(wrong|missing|needed)\b/i,
  /\bhow\s+(do|should|would)\s+i\s+(fix|change|improve|proceed|continue)\b/i,
  /\bhelp\s+(me\s+)?(fix|change|improve|understand|revise)\b/i,
  /\bwhy\s+(is|was)\s+this\s+(blocked|not\s+ready|failing)\b/i,
];

export function isScopeRevisionHelpRequest(note: string) {
  const text = note.trim();
  if (!text) return false;
  if (text.length > 140) return false;
  return HELP_REQUEST_PATTERNS.some((pattern) => pattern.test(text));
}

function formatMoney(value: number | null) {
  if (!value) return "the entered budget";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function buildScopeRevisionGuidance({
  milestoneIssues,
  feasibilityStatus,
  feasibilityNextSteps,
  leanScopeOptions,
  budgetAmount,
  timelineDays,
}: ScopeRevisionGuidanceInput) {
  const guidance: string[] = [];
  const suggestedChanges: string[] = [];

  if (feasibilityStatus === "unrealistic" || feasibilityStatus === "aggressive") {
    const marketStep = feasibilityNextSteps[0] || "Narrow the first release or adjust budget and timeline.";
    guidance.push(marketStep);
    suggestedChanges.push(marketStep);
  }

  for (const option of leanScopeOptions.slice(0, 2)) {
    if (!guidance.includes(option)) guidance.push(option);
    suggestedChanges.push(option);
  }

  for (const item of milestoneIssues.slice(0, 3)) {
    const title = item.title || "Untitled milestone";
    guidance.push(`${title}: ${item.guidance}`);
    suggestedChanges.push(`Tighten ${title} so it resolves "${item.issue}" by adding buyer-visible output and proof evidence.`);
  }

  if (guidance.length === 0) {
    guidance.push("The scope is close. Ask for a specific change, such as splitting a large milestone, adding a missing region, lowering risk, or moving a feature to a later checkpoint.");
    suggestedChanges.push("Make the SOW more specific by adding proof artifacts, pass/fail acceptance checks, and any missing buyer constraints.");
  }

  const constraints = [
    budgetAmount ? `keep the budget at ${formatMoney(budgetAmount)}` : "",
    timelineDays ? `keep the timeline at ${timelineDays} days` : "",
  ].filter(Boolean).join(" and ");

  const suggestedRevision = [
    "Revise the SOW to address these changes:",
    ...suggestedChanges.slice(0, 4).map((item) => `- ${item}`),
    constraints ? `Also ${constraints}.` : "",
  ].filter(Boolean).join("\n");

  return {
    guidance: guidance.slice(0, 5),
    suggestedRevision,
  };
}
