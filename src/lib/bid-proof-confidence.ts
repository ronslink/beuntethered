import type { FacilitatorProofLevel } from "./facilitator-trust-profile.ts";

export type BidProofLevel = "low" | "medium" | "high" | "audit_ready";

export type BidProofMilestoneLike = {
  title?: string | null;
  description?: string | null;
  deliverables?: unknown;
  acceptance_criteria?: unknown;
};

export type BidProofConfidenceInput = {
  technicalApproach?: string | null;
  techStackReason?: string | null;
  proposedTechStack?: string | null;
  proposedMilestones?: BidProofMilestoneLike[] | null;
  aiFlags?: string[];
  facilitatorProofScore?: number | null;
  facilitatorProofLevel?: FacilitatorProofLevel | null;
  connectedEvidenceProviderLabels?: string[];
  connectedEvidenceSourceCount?: number;
};

export type BidProofConfidence = {
  score: number;
  level: BidProofLevel;
  label: string;
  detectedEvidenceProviders: string[];
  strengths: string[];
  gaps: string[];
};

const PROVIDER_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "GitHub", pattern: /\b(github|repo|repository|pull request|pr\b|commit|branch|ci check|release tag)\b/i },
  { label: "Vercel", pattern: /\b(vercel|preview url|deployment url|deploy preview|staging url|production url)\b/i },
  { label: "Netlify", pattern: /\b(netlify|deploy preview)\b/i },
  { label: "Cloudflare", pattern: /\b(cloudflare|worker|pages|dns|edge route)\b/i },
  { label: "Railway", pattern: /\b(railway|service url|worker log)\b/i },
  { label: "Render", pattern: /\b(render|cron run|health check)\b/i },
  { label: "Fly.io", pattern: /\b(fly\.io|fly machine|region list)\b/i },
  { label: "DigitalOcean", pattern: /\b(digitalocean|app platform|droplet)\b/i },
  { label: "Heroku", pattern: /\b(heroku|dyno|review app|release version)\b/i },
  { label: "Supabase", pattern: /\b(supabase|migration|rls|edge function|storage bucket|database schema)\b/i },
  { label: "Domain", pattern: /\b(domain|dns txt|ssl|well-known|production domain)\b/i },
];

const ARTIFACT_PATTERN = /\b(acceptance|audit|evidence|demo|staging|release|handoff|verification|verified|artifact|report|criteria|test|quality|walkthrough|log|screenshot|recording)\b/i;
const STRONG_ARTIFACT_PATTERN = /\b(repository|pull request|commit|ci|deployment|preview url|staging url|production url|migration|health check|audit report|release report|dns txt)\b/i;

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function textFromMilestones(milestones?: BidProofMilestoneLike[] | null) {
  return (milestones ?? [])
    .flatMap((milestone) => [
      milestone.title,
      milestone.description,
      ...stringArray(milestone.deliverables),
      ...stringArray(milestone.acceptance_criteria),
    ])
    .filter(Boolean)
    .join(" ");
}

function levelForScore(score: number): BidProofLevel {
  if (score >= 82) return "audit_ready";
  if (score >= 68) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function labelForLevel(level: BidProofLevel) {
  if (level === "audit_ready") return "Audit-ready proof";
  if (level === "high") return "High proof confidence";
  if (level === "medium") return "Proof needs review";
  return "Thin proof plan";
}

export function getBidProofConfidence(input: BidProofConfidenceInput): BidProofConfidence {
  const milestoneText = textFromMilestones(input.proposedMilestones);
  const fullText = [
    input.technicalApproach,
    input.techStackReason,
    input.proposedTechStack,
    milestoneText,
  ]
    .filter(Boolean)
    .join(" ");
  const aiFlags = input.aiFlags ?? [];
  const facilitatorProofScore = Math.min(100, Math.max(0, input.facilitatorProofScore ?? 0));
  const connectedProviderLabels = input.connectedEvidenceProviderLabels ?? [];
  const connectedEvidenceSourceCount = input.connectedEvidenceSourceCount ?? 0;

  const mentionedProviders = PROVIDER_PATTERNS
    .filter((provider) => provider.pattern.test(fullText))
    .map((provider) => provider.label);
  const detectedEvidenceProviders = unique([...mentionedProviders, ...connectedProviderLabels]);

  const hasMilestones = Boolean(input.proposedMilestones?.length);
  const hasArtifactLanguage = ARTIFACT_PATTERN.test(fullText);
  const hasStrongArtifactLanguage = STRONG_ARTIFACT_PATTERN.test(fullText);
  const hasProviderSpecificProof = mentionedProviders.length > 0;
  const hasConnectedEvidenceHistory = connectedEvidenceSourceCount > 0 || connectedProviderLabels.length > 0;
  const hasRiskFlag = aiFlags.some((flag) => /\b(no clear|missing|risk|thin|unresolved|evidence|proof|acceptance)\b/i.test(flag));

  let score = 0;
  if (hasMilestones) score += 18;
  if (hasArtifactLanguage) score += 14;
  if (hasStrongArtifactLanguage) score += 12;
  if (hasProviderSpecificProof) score += 14;
  if (hasConnectedEvidenceHistory) score += Math.min(10, 4 + connectedEvidenceSourceCount * 2);
  score += Math.round(facilitatorProofScore * 0.28);
  if (input.facilitatorProofLevel === "enterprise_ready") score += 6;
  if (input.facilitatorProofLevel === "trusted") score += 3;
  if (hasRiskFlag) score -= 12;

  const strengths: string[] = [];
  const gaps: string[] = [];

  if (hasMilestones) strengths.push(`${input.proposedMilestones?.length ?? 0} proposed milestone${input.proposedMilestones?.length === 1 ? "" : "s"} to review.`);
  else gaps.push("Ask the facilitator to split the bid into verifiable milestone rows.");

  if (hasStrongArtifactLanguage) strengths.push("Proposal names durable artifacts such as repos, deployments, migrations, logs, or reports.");
  else if (hasArtifactLanguage) strengths.push("Proposal references reviewable evidence or acceptance checks.");
  else gaps.push("Ask what concrete artifact proves each milestone is complete.");

  if (hasProviderSpecificProof) strengths.push(`Proposal references ${mentionedProviders.slice(0, 3).join(", ")} proof.`);
  else gaps.push("Ask for provider-backed proof such as GitHub, deployment, database, or domain evidence rather than screenshots alone.");

  if (hasConnectedEvidenceHistory) strengths.push(`Facilitator has connected evidence history${connectedProviderLabels.length ? `: ${connectedProviderLabels.slice(0, 3).join(", ")}` : ""}.`);
  else gaps.push("No connected evidence provider history is visible for this facilitator.");

  if (facilitatorProofScore >= 70) strengths.push(`Facilitator proof readiness is ${Math.round(facilitatorProofScore)}/100.`);
  else gaps.push(`Facilitator proof readiness is ${Math.round(facilitatorProofScore)}/100; review trust setup before award.`);

  if (hasRiskFlag) gaps.unshift("AI bid review raised proof or risk flags that should be resolved before acceptance.");

  const finalScore = clampScore(score);
  const level = levelForScore(finalScore);

  return {
    score: finalScore,
    level,
    label: labelForLevel(level),
    detectedEvidenceProviders,
    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
  };
}
