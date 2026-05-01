import { getEvidenceSourceBidConfidence, type ProjectEvidenceSourceInput } from "./delivery-evidence.ts";

type ProposalMilestoneLike = {
  title?: string | null;
  description?: string | null;
  deliverables?: unknown;
  acceptance_criteria?: unknown;
  amount?: number | string | { toString(): string } | null;
  estimated_duration_days?: number | null;
};

type ProposalProjectLike = {
  title: string;
  ai_generated_sow?: string | null;
  milestones: ProposalMilestoneLike[];
  evidence_sources?: ProjectEvidenceSourceInput[];
};

export type ProposalAdvisorPacket = {
  positioning: string;
  buyerBudgetTotal: number | null;
  buyerTimelineDays: number | null;
  milestoneStrategy: {
    title: string;
    buyerAmount: number | null;
    buyerDays: number | null;
    outcome: string;
  }[];
  evidencePlan: string[];
  evidenceConfidence: ReturnType<typeof getEvidenceSourceBidConfidence>;
  buyerQuestions: string[];
  riskNotes: string[];
  assumptions: string[];
};

function asNumber(value: ProposalMilestoneLike["amount"]) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function compact(value: string | null | undefined, fallback: string) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!text) return fallback;
  return text.length > 140 ? `${text.slice(0, 140).trim()}...` : text;
}

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function buildProposalAdvisorPacket(project: ProposalProjectLike): ProposalAdvisorPacket {
  const scopeText = [
    project.title,
    project.ai_generated_sow ?? "",
    ...project.milestones.flatMap((milestone) => [
      milestone.title ?? "",
      milestone.description ?? "",
      ...asList(milestone.deliverables),
      ...asList(milestone.acceptance_criteria),
    ]),
  ].join(" ").toLowerCase();

  const buyerBudgetTotal = project.milestones.reduce((total, milestone) => total + asNumber(milestone.amount), 0);
  const buyerTimelineDays = project.milestones.reduce(
    (total, milestone) => total + (milestone.estimated_duration_days ?? 0),
    0,
  );
  const evidenceConfidence = getEvidenceSourceBidConfidence(project.evidence_sources ?? []);

  const milestoneStrategy =
    project.milestones.length > 0
      ? project.milestones.slice(0, 5).map((milestone) => ({
          title: milestone.title || "Outcome milestone",
          buyerAmount: asNumber(milestone.amount) || null,
          buyerDays: milestone.estimated_duration_days ?? null,
          outcome: compact(milestone.description, "Deliver the buyer-visible outcome and attach review evidence."),
        }))
      : [
          {
            title: "Discovery and verification baseline",
            buyerAmount: null,
            buyerDays: null,
            outcome: "Convert the buyer SOW into priced milestones with evidence and acceptance checks.",
          },
        ];

  const evidence = new Set<string>([
    "Milestone acceptance checklist mapped to each deliverable",
    "Short handoff note explaining what changed and how to review it",
  ]);

  if (includesAny(scopeText, [/\b(app|dashboard|portal|website|workflow|screen|frontend|ui)\b/])) {
    evidence.add("Staging URL or recorded walkthrough for buyer review");
    evidence.add("Screenshots of completed responsive states");
  }
  if (includesAny(scopeText, [/\b(api|integration|webhook|stripe|payment|database|supabase|postgres|prisma)\b/])) {
    evidence.add("Repository branch or source package with setup notes");
    evidence.add("Test event, log, or webhook evidence for critical flows");
  }
  if (includesAny(scopeText, [/\b(ai|llm|agent|automation|model|prompt)\b/])) {
    evidence.add("Prompt/model assumptions and sample output review notes");
  }
  if (includesAny(scopeText, [/\b(migration|legacy|data import|existing system)\b/])) {
    evidence.add("Before/after data sample or migration validation report");
  }
  evidenceConfidence.strengths.forEach((strength) => {
    if (!/no connected/i.test(strength)) evidence.add(`Use connected ${strength} to support proposal confidence`);
  });

  const questions = new Set<string>([
    "Who is the final approver for each milestone?",
    "What environment or credentials will be available before work starts?",
  ]);
  if (includesAny(scopeText, [/\b(stripe|payment|billing|checkout|subscription)\b/])) {
    questions.add("Which payment scenarios must pass in test mode before release?");
  }
  if (includesAny(scopeText, [/\b(github|repo|repository|code|deployment)\b/])) {
    questions.add("Which repository, branch, and deployment target should be used?");
  }
  if (includesAny(scopeText, [/\b(ai|llm|model|agent)\b/])) {
    questions.add("Which model/provider constraints and evaluation examples should guide acceptance?");
  }

  const risks = new Set<string>();
  if (buyerBudgetTotal === 0) risks.add("Buyer budget is not explicit; price after clarification instead of guessing.");
  if (buyerTimelineDays === 0) risks.add("Buyer timeline is not explicit; confirm delivery window before quoting.");
  if (project.milestones.length <= 1 && buyerBudgetTotal > 5000) {
    risks.add("Buyer baseline is concentrated in one milestone; consider proposing smaller funded checkpoints.");
  }
  if (evidenceConfidence.level === "low") {
    risks.add("Proposal confidence is lower until live deployment, PaaS service, repository, or database evidence is connected.");
  }
  if (includesAny(scopeText, [/\b(legacy|migration|data import|existing system)\b/])) {
    risks.add("Existing-system access could change scope; make access a start condition.");
  }
  if (risks.size === 0) risks.add("Scope appears bid-ready; keep assumptions explicit and evidence attached.");

  return {
    positioning: `Propose outcome-based delivery for ${project.title}, with facilitator-led execution and AI-assisted evidence preparation.`,
    buyerBudgetTotal: buyerBudgetTotal > 0 ? buyerBudgetTotal : null,
    buyerTimelineDays: buyerTimelineDays > 0 ? buyerTimelineDays : null,
    milestoneStrategy,
    evidencePlan: Array.from(evidence).slice(0, 6),
    evidenceConfidence,
    buyerQuestions: Array.from(questions).slice(0, 5),
    riskNotes: Array.from(risks).slice(0, 4),
    assumptions: [
      "Proposal should preserve buyer milestone approval rights.",
      "Payment should remain milestone escrow, not hourly staffing.",
      "Each release should include artifacts a non-technical buyer can inspect.",
    ],
  };
}
