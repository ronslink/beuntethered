type ProjectMilestoneLike = {
  title?: string | null;
  description?: string | null;
  deliverables?: unknown;
  acceptance_criteria?: unknown;
  amount?: number | string | { toString(): string } | null;
  estimated_duration_days?: number | null;
};

type ProjectForBidAnalysis = {
  ai_generated_sow?: string | null;
  milestones: ProjectMilestoneLike[];
};

type ProposedMilestoneLike = {
  title?: string | null;
  amount?: number | string | { toString(): string } | null;
  days?: number | null;
  description?: string | null;
};

export type BidScoreCard = {
  price: {
    signal: "FAIR" | "REVIEW" | "OUTLIER";
    delta_pct: number;
    band: { low: number; high: number } | null;
  };
  timeline: {
    signal: "UNKNOWN" | "REALISTIC" | "TIGHT" | "UNREALISTIC";
    delta_pct: number;
  };
  stack_compatibility: number;
  milestone_count: number;
  flags: string[];
  recommendation: "TOP_PICK" | "STRONG" | "REVIEW" | "CAUTION";
  generated_at: string;
};

function numberValue(value: number | string | { toString(): string } | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStackTerm(term: string) {
  return term
    .toLowerCase()
    .replace(/\.(js|ts)$/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

function uniqueTerms(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,/|]+/)
        .flatMap((part) => normalizeStackTerm(part).split(/\s+/))
        .filter((term) => term.length > 1)
    )
  );
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function inferProjectStackTerms(projectText: string) {
  const inferred = new Set(uniqueTerms(projectText));
  const hints: Array<{ pattern: RegExp; terms: string[] }> = [
    {
      pattern: /\b(iphone|ios|mobile|app store|native app)\b/,
      terms: ["ios", "iphone", "mobile", "react", "react native", "expo", "flutter", "swift", "xcode", "typescript"],
    },
    {
      pattern: /\b(store|storage|database|history|records|saved|account|login|auth)\b/,
      terms: ["postgres", "postgresql", "sqlite", "supabase", "firebase", "mongodb", "prisma", "redis"],
    },
    {
      pattern: /\b(ai|ml|model|agent|generation|analysis|recommendation|pattern)\b/,
      terms: ["python", "typescript", "node", "openai", "minimax", "vector", "postgres", "tensorflow", "pytorch"],
    },
    {
      pattern: /\b(web|dashboard|portal|site|browser)\b/,
      terms: ["react", "next", "vue", "typescript", "javascript", "node"],
    },
    {
      pattern: /\b(payment|checkout|escrow|billing|subscription)\b/,
      terms: ["stripe", "postgres", "prisma", "typescript"],
    },
  ];

  hints.forEach((hint) => {
    if (hint.pattern.test(projectText)) {
      hint.terms.forEach((term) => uniqueTerms(term).forEach((normalized) => inferred.add(normalized)));
    }
  });

  return inferred;
}

export function parseBidMilestones(value: unknown): ProposedMilestoneLike[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as ProposedMilestoneLike[];
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function buildBidScoreCard({
  project,
  proposedAmount,
  estimatedDays,
  technicalApproach,
  proposedTechStack,
  proposedMilestones,
  generatedAt = new Date(),
}: {
  project: ProjectForBidAnalysis;
  proposedAmount: number;
  estimatedDays: number;
  technicalApproach?: string | null;
  proposedTechStack?: string | null;
  proposedMilestones?: ProposedMilestoneLike[];
  generatedAt?: Date;
}): BidScoreCard {
  const originalTotal = project.milestones.reduce((acc, milestone) => acc + numberValue(milestone.amount), 0);
  const originalDays = project.milestones.reduce(
    (acc, milestone) => acc + (milestone.estimated_duration_days || 0),
    0
  );

  const priceDelta = originalTotal > 0 ? Math.abs(proposedAmount - originalTotal) / originalTotal : 0;
  const priceSignal = priceDelta < 0.25 ? "FAIR" : priceDelta < 0.5 ? "REVIEW" : "OUTLIER";
  const priceBand = originalTotal > 0
    ? { low: Math.round(originalTotal * 0.75), high: Math.round(originalTotal * 1.25) }
    : null;

  const daysDelta = originalDays > 0 ? Math.abs(estimatedDays - originalDays) / originalDays : 0;
  const timelineSignal = originalDays === 0
    ? "UNKNOWN"
    : daysDelta < 0.3
      ? "REALISTIC"
      : daysDelta < 0.6
        ? "TIGHT"
        : "UNREALISTIC";

  const projectText = [
    project.ai_generated_sow,
    ...project.milestones.flatMap((milestone) => [
      milestone.title,
      milestone.description,
      ...stringArray(milestone.deliverables),
      ...stringArray(milestone.acceptance_criteria),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const inferredProjectTerms = inferProjectStackTerms(projectText);
  let stackScore = 75;
  if (proposedTechStack) {
    const stackKeywords = uniqueTerms(proposedTechStack).filter((term) => term.length > 2);
    const matches = stackKeywords.filter((term) => inferredProjectTerms.has(term)).length;
    stackScore = stackKeywords.length > 0 ? Math.min(100, Math.round((matches / stackKeywords.length) * 100)) : 70;
  }

  const flags: string[] = [];
  const milestones = proposedMilestones && proposedMilestones.length > 0
    ? proposedMilestones
    : project.milestones.map((milestone) => ({
        title: milestone.title,
        amount: milestone.amount,
        days: milestone.estimated_duration_days ?? undefined,
        description: milestone.description,
      }));
  const milestoneCount = milestones.length;
  const approachText = typeof technicalApproach === "string" ? technicalApproach.trim() : "";

  if (milestoneCount === 0) flags.push("No milestones defined - high delivery risk.");
  if (milestoneCount === 1 && proposedAmount > 5000) {
    flags.push("Single milestone for a large project - consider splitting for client protection.");
  }
  if (stackScore < 50) {
    flags.push("Proposed stack has limited overlap with the project signals - ask for the facilitator's implementation rationale.");
  } else if (stackScore < 70) {
    flags.push("Stack fit needs a short rationale before acceptance.");
  }

  const hasAcceptanceEvidence = `${JSON.stringify(milestones)} ${approachText}`
    .toLowerCase()
    .match(/\b(acceptance|audit|evidence|demo|staging|release|handoff|verification|verified|artifact|report|criteria|test|quality)\b/);
  if (!hasAcceptanceEvidence) {
    flags.push("No clear acceptance evidence described - ask what artifact, demo, or report proves each milestone is done.");
  }
  if (!approachText) flags.push("Technical approach is missing - ask for delivery assumptions before accepting.");
  if (proposedAmount < originalTotal * 0.5 && originalTotal > 0) {
    flags.push("Proposed price is significantly below the client's budget - ensure deliverables are not scoped down.");
  }

  let recommendation: BidScoreCard["recommendation"] = "STRONG";
  if (flags.length >= 3 || priceSignal === "OUTLIER" || timelineSignal === "UNREALISTIC" || stackScore < 35) {
    recommendation = "CAUTION";
  } else if (flags.length === 0 && priceSignal === "FAIR" && timelineSignal === "REALISTIC" && stackScore >= 80) {
    recommendation = "TOP_PICK";
  } else if (flags.length >= 2 || priceSignal === "REVIEW" || stackScore < 70) {
    recommendation = "REVIEW";
  }

  return {
    price: { signal: priceSignal, delta_pct: Math.round(priceDelta * 100), band: priceBand },
    timeline: { signal: timelineSignal, delta_pct: Math.round(daysDelta * 100) },
    stack_compatibility: stackScore,
    milestone_count: milestoneCount,
    flags,
    recommendation,
    generated_at: generatedAt.toISOString(),
  };
}

export function summarizeBidScoreCard(scoreCard: BidScoreCard) {
  return [
    `Stack compatibility ${scoreCard.stack_compatibility}%`,
    `Price ${scoreCard.price.signal.toLowerCase()}`,
    `Timeline ${scoreCard.timeline.signal.toLowerCase()}`,
  ].join(" | ");
}
