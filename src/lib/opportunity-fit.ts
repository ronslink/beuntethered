import { EVIDENCE_SOURCE_GUIDE, type EvidenceSourceTypeValue } from "./delivery-evidence.ts";

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
  proof_capabilities?: string[] | null;
} | null;

const TIER_SCORE: Record<string, number> = {
  ELITE: 8,
  PRO: 5,
  STANDARD: 2,
};

const EVIDENCE_LABELS = new Map(EVIDENCE_SOURCE_GUIDE.map((item) => [item.type, item.label]));
const EVIDENCE_TYPES = new Set(EVIDENCE_SOURCE_GUIDE.map((item) => item.type));

const EVIDENCE_NEED_HINTS: Array<{ types: EvidenceSourceTypeValue[]; pattern: RegExp }> = [
  { types: ["GITHUB"], pattern: /\b(github|repo|repository|pull request|commit|branch|ci check|source code)\b/i },
  { types: ["VERCEL", "NETLIFY", "CLOUDFLARE"], pattern: /\b(vercel|netlify|cloudflare|preview url|deployment url|deploy preview|staging url|frontend|website|portal|dashboard)\b/i },
  { types: ["RAILWAY", "RENDER", "FLY", "DIGITALOCEAN", "HEROKU"], pattern: /\b(railway|render|fly\.io|digitalocean|heroku|backend|api|worker|cron|service url|health check|server logs?)\b/i },
  { types: ["SUPABASE"], pattern: /\b(supabase|database|postgres|migration|schema|rls|storage bucket|edge function)\b/i },
  { types: ["DOMAIN"], pattern: /\b(domain|dns|ssl|production url|launch|go-live|go live)\b/i },
];

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

function opportunityText(project: OpportunityProject) {
  return [
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
}

function normalizeEvidenceTypes(values?: string[] | null) {
  return Array.from(
    new Set((values ?? []).filter((value): value is EvidenceSourceTypeValue => EVIDENCE_TYPES.has(value as EvidenceSourceTypeValue)))
  );
}

function evidenceLabels(types: EvidenceSourceTypeValue[]) {
  return types.map((type) => EVIDENCE_LABELS.get(type) ?? type);
}

export function inferOpportunityEvidenceNeeds(project: OpportunityProject) {
  const text = opportunityText(project);
  const needs = new Set<EvidenceSourceTypeValue>();

  EVIDENCE_NEED_HINTS.forEach((hint) => {
    if (hint.pattern.test(text)) {
      hint.types.forEach((type) => needs.add(type));
    }
  });

  return Array.from(needs);
}

export function inferOpportunityTerms(project: OpportunityProject) {
  const text = opportunityText(project);

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
  const evidenceNeeds = inferOpportunityEvidenceNeeds(project);
  const proofCapabilities = normalizeEvidenceTypes(profile?.proof_capabilities);
  const matchedProofCapabilities = proofCapabilities.filter((type) => evidenceNeeds.includes(type)).slice(0, 6);
  const skillScore = Math.min(34, matchedTerms.length * 8);
  const proofCapabilityScore = Math.min(12, matchedProofCapabilities.length * 5);
  const trustScore = Math.min(16, Math.round((profile?.trust_score ?? 0) / 5));
  const auditScore = Math.min(8, Math.round((profile?.average_ai_audit_score ?? 0) / 12));
  const deliveryScore = Math.min(6, (profile?.total_sprints_completed ?? 0) * 2);
  const tierScore = TIER_SCORE[profile?.platform_tier ?? "STANDARD"] ?? 0;
  const readinessScore = (profile?.availability ? 3 : 0) + (profile?.portfolio_url ? 3 : 0);
  const invitedBoost = project.invites?.length ? 8 : 0;
  const score = Math.max(52, Math.min(98, 42 + skillScore + proofCapabilityScore + trustScore + auditScore + deliveryScore + tierScore + readinessScore + invitedBoost));

  const reasons = [
    matchedTerms.length > 0 ? `Matches ${matchedTerms.slice(0, 4).join(", ")}` : "No direct skill overlap detected",
    matchedProofCapabilities.length > 0 ? `Proof fit: ${evidenceLabels(matchedProofCapabilities).slice(0, 4).join(", ")}` : null,
    profile?.trust_score ? `${Math.round(profile.trust_score)} trust score` : "Trust score not established",
    profile?.average_ai_audit_score ? `${Math.round(profile.average_ai_audit_score)} average audit score` : "No audit history yet",
    project.invites?.length ? "Client invited you" : null,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    score,
    matchedTerms,
    evidenceNeeds,
    matchedProofCapabilities,
    reasons,
    source: matchedProofCapabilities.length > 0 ? "profile-proof-fit" : "profile-fallback",
  };
}
