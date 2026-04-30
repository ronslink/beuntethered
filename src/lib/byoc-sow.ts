import { calculateMilestoneFees } from "./platform-fees.ts";

type BYOCMilestoneSnapshot = {
  title: string;
  description: string;
  amount: number;
  deliverables: string[];
  acceptance_criteria: string[];
  estimated_duration_days?: number | null;
};

type BYOCSowSnapshotInput = {
  title: string;
  executiveSummary: string;
  milestones: BYOCMilestoneSnapshot[];
  transitionMode?: string;
  currentState?: string;
  priorWork?: string;
  remainingWork?: string;
  knownRisks?: string;
};

export function calculateBYOCInviteTotals(milestones: { amount: number }[]) {
  return milestones.reduce(
    (totals, milestone) => {
      const fees = calculateMilestoneFees({ amount: milestone.amount, isByoc: true });
      return {
        grossAmountCents: totals.grossAmountCents + fees.grossAmountCents,
        platformFeeCents: totals.platformFeeCents + fees.platformFeeCents,
        clientTotalCents: totals.clientTotalCents + fees.clientTotalCents,
        facilitatorPayoutCents: totals.facilitatorPayoutCents + fees.facilitatorPayoutCents,
      };
    },
    {
      grossAmountCents: 0,
      platformFeeCents: 0,
      clientTotalCents: 0,
      facilitatorPayoutCents: 0,
    }
  );
}

function formatTransitionMode(value?: string) {
  if (!value) return "New external project";
  return value.replace(/_/g, " ").toLowerCase();
}

function pushOptionalLine(lines: string[], label: string, value?: string) {
  if (value?.trim()) {
    lines.push(`${label}: ${value.trim()}`);
  }
}

export function buildBYOCSowSnapshot({
  title,
  executiveSummary,
  milestones,
  transitionMode,
  currentState,
  priorWork,
  remainingWork,
  knownRisks,
}: BYOCSowSnapshotInput) {
  const totals = calculateBYOCInviteTotals(milestones);
  const lines = [
    `Private BYOC Scope: ${title}`,
    "",
    "Executive Summary",
    executiveSummary.trim(),
    "",
    "BYOC Transition Baseline",
    `Transition mode: ${formatTransitionMode(transitionMode)}`,
  ];

  pushOptionalLine(lines, "Current project state", currentState);
  pushOptionalLine(lines, "Prior work or existing assets", priorWork);
  pushOptionalLine(lines, "Remaining work to govern in Untether", remainingWork);
  pushOptionalLine(lines, "Known risks or open questions", knownRisks);

  lines.push(
    "Platform responsibility starts from the accepted packet and funded milestones onward. Prior work is recorded as context unless explicitly included in a funded milestone.",
    "",
    "Milestone Verification Schedule",
  );

  milestones.forEach((milestone, index) => {
    const fees = calculateMilestoneFees({ amount: milestone.amount, isByoc: true });
    lines.push(
      "",
      `${index + 1}. ${milestone.title}`,
      `Amount: $${milestone.amount.toLocaleString()} | Client total with BYOC platform fee: $${(fees.clientTotalCents / 100).toLocaleString()}`,
      milestone.estimated_duration_days ? `Estimated duration: ${milestone.estimated_duration_days} days` : "Estimated duration: To be confirmed",
      `Description: ${milestone.description.trim()}`,
      "Deliverables:",
      ...milestone.deliverables.map((item) => `- ${item}`),
      "Acceptance checks:",
      ...milestone.acceptance_criteria.map((item) => `- ${item}`)
    );
  });

  lines.push(
    "",
    "Trust And Payment Terms",
    "- Work is released by milestone after buyer review against the acceptance checks above.",
    "- The facilitator pays 0% marketplace fee on BYOC work.",
    "- The client pays the BYOC platform fee at escrow checkout.",
    `- Estimated client total: $${(totals.clientTotalCents / 100).toLocaleString()}.`,
    `- Estimated facilitator payout: $${(totals.facilitatorPayoutCents / 100).toLocaleString()}.`,
    "- Delivery evidence, audit results, payment records, and activity records remain attached to the project ledger.",
    "- BYOC projects are not eligible for Untether platform arbitration because the original client agreement originated outside the platform and cannot be certified by Untether."
  );

  return lines.join("\n");
}
