type OpportunityMilestone = {
  title?: string | null;
  description?: string | null;
  deliverables?: unknown;
  acceptance_criteria?: unknown;
};

type OpportunityProject = {
  title?: string | null;
  ai_generated_sow?: string | null;
  milestones?: OpportunityMilestone[] | null;
  invites?: unknown[] | null;
};

type OpportunityProfile = {
  skills?: string[] | null;
  ai_agent_stack?: string[] | null;
  trust_score?: number | null;
  average_ai_audit_score?: number | null;
  total_sprints_completed?: number | null;
  platform_tier?: string | null;
  availability?: string | null;
  portfolio_url?: string | null;
} | null;

const TIER_SCORE: Record<string, number> = {
  ELITE: 8,
  PRO: 5,
  STANDARD: 2,
};

export function normalizeOpportunityTerm(term: string) {
  return term
    .toLowerCase()
    .replace(/\.(js|ts)$/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

export function uniqueOpportunityTerms(value: string) {
  return Array.from(
    new Set(
      normalizeOpportunityTerm(value)
        .split(/\s+/)
        .filter((term) => term.length > 2)
    )
  );
}

function listValues(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function inferOpportunityTerms(project: OpportunityProject) {
  const text = [
    project.title,
    project.ai_generated_sow,
    ...(project.milestones ?? []).flatMap((milestone) => [
      milestone.title,
      milestone.description,
      ...listValues(milestone.deliverables),
      ...listValues(milestone.acceptance_criteria),
    ]),
  ]
    .filter(Boolean)
    .join(" ");

  const terms = new Set(uniqueOpportunityTerms(text));
  const lower = text.toLowerCase();
  const hints: Array<{ pattern: RegExp; terms: string[] }> = [
    { pattern: /\b(web|dashboard|portal|browser|site|frontend)\b/, terms: ["react", "next", "typescript", "tailwind", "node"] },
    { pattern: /\b(api|backend|database|auth|login|account|storage)\b/, terms: ["node", "typescript", "postgres", "prisma", "supabase", "redis"] },
    { pattern: /\b(ai|agent|automation|llm|model|generation)\b/, terms: ["openai", "anthropic", "python", "typescript", "agent"] },
    { pattern: /\b(mobile|ios|android|app store|native)\b/, terms: ["react native", "expo", "flutter", "swift", "kotlin", "mobile"] },
    { pattern: /\b(payment|checkout|billing|subscription|escrow)\b/, terms: ["stripe", "payments", "postgres", "prisma"] },
  ];

  hints.forEach((hint) => {
    if (hint.pattern.test(lower)) {
      hint.terms.flatMap(uniqueOpportunityTerms).forEach((term) => terms.add(term));
    }
  });

  return terms;
}

export function computeOpportunityFit(project: OpportunityProject, profile: OpportunityProfile) {
  const projectTerms = inferOpportunityTerms(project);
  const profileTerms = new Set([...(profile?.skills ?? []), ...(profile?.ai_agent_stack ?? [])].flatMap(uniqueOpportunityTerms));
  const matchedTerms = Array.from(profileTerms).filter((term) => projectTerms.has(term)).slice(0, 6);
  const skillScore = Math.min(34, matchedTerms.length * 8);
  const trustScore = Math.min(16, Math.round((profile?.trust_score ?? 0) / 5));
  const auditScore = Math.min(8, Math.round((profile?.average_ai_audit_score ?? 0) / 12));
  const deliveryScore = Math.min(6, (profile?.total_sprints_completed ?? 0) * 2);
  const tierScore = TIER_SCORE[profile?.platform_tier ?? "STANDARD"] ?? 0;
  const readinessScore = (profile?.availability ? 3 : 0) + (profile?.portfolio_url ? 3 : 0);
  const invitedBoost = project.invites?.length ? 8 : 0;
  const score = Math.max(52, Math.min(98, 42 + skillScore + trustScore + auditScore + deliveryScore + tierScore + readinessScore + invitedBoost));

  const reasons = [
    matchedTerms.length > 0 ? `Matches ${matchedTerms.slice(0, 4).join(", ")}` : "No direct skill overlap detected",
    profile?.trust_score ? `${Math.round(profile.trust_score)} trust score` : "Trust score not established",
    profile?.average_ai_audit_score ? `${Math.round(profile.average_ai_audit_score)} average audit score` : "No audit history yet",
    project.invites?.length ? "Client invited you" : null,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    score,
    matchedTerms,
    reasons,
    source: "profile-fallback",
  };
}
