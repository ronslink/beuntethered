export type MilestoneDraft = {
  title?: unknown;
  description?: unknown;
  deliverables?: unknown;
  acceptance_criteria?: unknown;
  estimated_duration_days?: unknown;
  amount?: unknown;
};

export type NormalizedMilestoneDraft = {
  title: string;
  description: string;
  deliverables: string[];
  acceptance_criteria: string;
  estimated_duration_days: number;
  amount: number;
};

export type MilestoneStorageDraft = {
  title: string;
  description: string;
  deliverables: string[];
  acceptance_criteria: string[];
  estimated_duration_days: number;
  amount: number;
};

export type MilestoneQualityAssessment = {
  score: number;
  passes: boolean;
  blockingIssues: string[];
  warnings: string[];
  normalized: MilestoneStorageDraft;
};

type GeneratedSowLike = {
  milestones?: unknown;
  totalAmount?: unknown;
  [key: string]: unknown;
};

const TANGIBLE_OUTPUT_TERMS =
  /\b(report|log|checklist|build|release|released|deployed|document|file|files|screen|page|flow|endpoint|schema|dashboard|prototype|wireframe|mockup|copy|content|integration|configuration|handoff|runbook|roadmap|plan|link|export|archive|repository|source|demo|preview|artifact|component|api|database|module|portal|app|application|workflow|automation|template|dataset|migration|settings|admin|customer|invoice|billing|auth|login|registration|password)\b/i;

const VERIFIABLE_LANGUAGE =
  /\b(client can|buyer can|user can|users can|admin can|facilitator can|displays?|shows?|renders?|returns?|records?|creates?|updates?|deletes?|sends?|receives?|includes?|contains?|matches?|passes?|fails?|validates?|uploads?|downloads?|exports?|imports?|logs?|deploys?|is live|is available|is accessible|source archive|preview url|staging|report|evidence|screenshot|audit|webhook|test evidence|acceptance criteria|approval)\b/i;

const PROOF_EVIDENCE_LANGUAGE =
  /\b(preview|staging|demo|release build|source archive|repository|repo access|package archive|handoff|setup notes|configuration evidence|screenshot|screen recording|log|logs|audit|activity record|webhook event|event history|report|qa report|test result|test evidence|defect log|release checklist|exported files|editable files|diagram|runbook|checklist)\b/i;

const PROCESS_ONLY_DELIVERABLES = [
  /^testing$/i,
  /^testing\s+(and|&)\s+bug\s+fix(es)?$/i,
  /^bug\s+fix(es)?$/i,
  /^fixing\s+bugs$/i,
  /^qa$/i,
  /^qa\s+(and|&)\s+testing$/i,
  /^quality\s+assurance$/i,
  /^debugging$/i,
  /^polish$/i,
  /^revisions?$/i,
  /^feedback\s+rounds?$/i,
  /^meetings?$/i,
  /^communication$/i,
  /^support$/i,
  /^development$/i,
  /^deployment$/i,
  /^launch$/i,
];

const GENERIC_TITLE_PATTERNS = [
  /^phase\s*\d+$/i,
  /^milestone$/i,
  /^milestone\s*\d+$/i,
  /^sprint\s*\d+$/i,
  /^development$/i,
  /^development\s+(and|&)\s+launch$/i,
  /^core\s+(work|features?)$/i,
  /^testing\s+(and|&)\s+bug\s+fix(es)?$/i,
  /^qa$/i,
  /^deployment$/i,
  /^launch$/i,
  /^polish$/i,
];

export function cleanMilestoneText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function isProcessOnlyDeliverable(value: unknown) {
  const text = cleanMilestoneText(value);
  if (!text) return true;
  if (TANGIBLE_OUTPUT_TERMS.test(text)) return false;
  return PROCESS_ONLY_DELIVERABLES.some((pattern) => pattern.test(text));
}

function splitTextList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(cleanMilestoneText).filter(Boolean);
  }

  const text = cleanMilestoneText(value);
  if (!text) return [];

  return text
    .split(/\n|;|\s-\s|(?:^|\s)\d+\.\s/g)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter((item) => item.length > 0);
}

function uniqueByLowercase(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function titleFromContext(milestone: MilestoneDraft) {
  return cleanMilestoneText(milestone.title) || "Milestone";
}

export function fallbackDeliverablesFor(milestone: MilestoneDraft) {
  const title = titleFromContext(milestone);
  const context = `${title} ${cleanMilestoneText(milestone.description)}`.toLowerCase();

  if (context.includes("auth") || context.includes("login") || context.includes("registration")) {
    return ["Working login and registration flow", "Role-based access control rules", "Password reset user flow"];
  }

  if (context.includes("stripe") || context.includes("billing") || context.includes("payment")) {
    return ["Stripe checkout and billing flow", "Payment status screen", "Payment webhook event records"];
  }

  if (context.includes("audit") || context.includes("log")) {
    return ["Admin audit log view", "Tracked activity event records", "Audit log filtering or export"];
  }

  if (context.includes("dashboard") || context.includes("project") || context.includes("status")) {
    return ["Customer project status dashboard", "Project update workflow", "Project status history"];
  }

  if (context.includes("design") || context.includes("wireframe") || context.includes("mockup")) {
    return ["Approved visual mockups", "Responsive screen designs", "Design handoff files"];
  }

  if (context.includes("api") || context.includes("integration") || context.includes("webhook")) {
    return ["Documented API endpoint flow", "Integration configuration records", "Webhook or event handling evidence"];
  }

  return [`Working ${title.toLowerCase()} flow`, `${title} handoff notes`, "Client-reviewable staging update"];
}

function deriveDeliverablesFromDescription(milestone: MilestoneDraft) {
  return cleanMilestoneText(milestone.description)
    .split(/[.;]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 10 && TANGIBLE_OUTPUT_TERMS.test(item))
    .slice(0, 4);
}

export function normalizeDeliverables(milestone: MilestoneDraft) {
  const raw = splitTextList(milestone.deliverables);
  const fromDescription = raw.length > 0 ? [] : deriveDeliverablesFromDescription(milestone);
  const candidateDeliverables = uniqueByLowercase([...raw, ...fromDescription]);
  const processOnlyItems = candidateDeliverables.filter(isProcessOnlyDeliverable);
  const deliverables = candidateDeliverables.filter((deliverable) => !isProcessOnlyDeliverable(deliverable));

  for (const fallback of fallbackDeliverablesFor(milestone)) {
    if (deliverables.length >= 2) break;
    if (!deliverables.some((item) => item.toLowerCase() === fallback.toLowerCase())) {
      deliverables.push(fallback);
    }
  }

  return {
    deliverables: deliverables.slice(0, 4),
    processOnlyItems,
    hadRawDeliverables: raw.length > 0,
  };
}

function fallbackCriteriaFor(milestone: MilestoneDraft, deliverables: string[]) {
  const title = titleFromContext(milestone);
  const primaryDeliverable = deliverables[0] || `the ${title.toLowerCase()} deliverable`;
  const secondaryDeliverable = deliverables[1] || "supporting evidence package";

  return [
    `Client can review ${primaryDeliverable.toLowerCase()} in a working preview or delivered artifact.`,
    `${secondaryDeliverable} includes enough evidence for approval, such as source files, screenshots, logs, or handoff notes.`,
  ];
}

export function normalizeAcceptanceCriteria(value: unknown, milestone: MilestoneDraft, deliverables?: string[]) {
  const normalizedDeliverables = deliverables ?? normalizeDeliverables(milestone).deliverables;
  const criteria = uniqueByLowercase(splitTextList(value));

  for (const fallback of fallbackCriteriaFor(milestone, normalizedDeliverables)) {
    if (criteria.length >= 2) break;
    criteria.push(fallback);
  }

  if (!criteria.some((criterion) => /\b(source|archive|preview|staging|report|evidence|log|screenshot|handoff)\b/i.test(criterion))) {
    criteria.push("Submission includes a preview link or evidence package that lets the buyer verify completion.");
  }

  return criteria.slice(0, 5);
}

function normalizeDuration(value: unknown) {
  const duration = Number(value);
  if (Number.isFinite(duration) && duration >= 1) {
    return Math.min(Math.round(duration), 365);
  }
  return 14;
}

function normalizeAmount(value: unknown) {
  const amount = Number(value);
  if (Number.isFinite(amount) && amount > 0) return amount;
  return 0;
}

export function normalizeGeneratedMilestone(milestone: MilestoneDraft): NormalizedMilestoneDraft {
  const { deliverables } = normalizeDeliverables(milestone);
  const criteria = normalizeAcceptanceCriteria(milestone.acceptance_criteria, milestone, deliverables);
  const title = titleFromContext(milestone);
  const description =
    cleanMilestoneText(milestone.description) ||
    `Delivery of ${deliverables.slice(0, 2).join(" and ")} for buyer review.`;

  return {
    ...milestone,
    title,
    description,
    deliverables,
    acceptance_criteria: criteria.join("\n"),
    estimated_duration_days: normalizeDuration(milestone.estimated_duration_days),
    amount: normalizeAmount(milestone.amount),
  };
}

export function normalizeGeneratedSow<T extends GeneratedSowLike>(sowData: T): T {
  if (!Array.isArray(sowData.milestones)) return sowData;

  const milestones = sowData.milestones.map((milestone) => normalizeGeneratedMilestone(milestone as MilestoneDraft));
  const totalAmount = milestones.reduce((sum, milestone) => sum + milestone.amount, 0);

  return {
    ...sowData,
    milestones,
    totalAmount: totalAmount > 0 ? totalAmount : sowData.totalAmount,
  };
}

export function normalizeMilestoneForStorage(milestone: MilestoneDraft): MilestoneStorageDraft {
  const normalized = normalizeGeneratedMilestone(milestone);

  return {
    ...normalized,
    acceptance_criteria: normalizeAcceptanceCriteria(milestone.acceptance_criteria, milestone, normalized.deliverables),
  };
}

function hasGenericTitle(title: string) {
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function verifiableCriteriaCount(criteria: string[]) {
  return criteria.filter((criterion) => VERIFIABLE_LANGUAGE.test(criterion)).length;
}

function proofEvidenceCriteriaCount(criteria: string[]) {
  return criteria.filter((criterion) => PROOF_EVIDENCE_LANGUAGE.test(criterion)).length;
}

export function assessMilestoneQuality(milestone: MilestoneDraft): MilestoneQualityAssessment {
  const normalized = normalizeMilestoneForStorage(milestone);
  const { processOnlyItems, hadRawDeliverables } = normalizeDeliverables(milestone);
  const rawCriteria = splitTextList(milestone.acceptance_criteria);
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  if (hasGenericTitle(normalized.title)) {
    blockingIssues.push("Use a specific outcome title instead of a generic phase name.");
  }

  if (!cleanMilestoneText(milestone.title)) {
    blockingIssues.push("Add a specific milestone title tied to a buyer-visible outcome.");
  }

  if (normalized.description.length < 35) {
    blockingIssues.push("Add a short description of what will be delivered and why it matters.");
  }

  if (normalized.deliverables.length < 2) {
    blockingIssues.push("Add at least two tangible deliverables the buyer can inspect.");
  }

  if (hadRawDeliverables && processOnlyItems.length > 0) {
    blockingIssues.push("Move process-only items like testing, bug fixes, QA, meetings, or support into acceptance criteria.");
  }

  if (rawCriteria.length < 2) {
    blockingIssues.push("Add at least two pass/fail acceptance criteria.");
  }

  if (verifiableCriteriaCount(normalized.acceptance_criteria) < 2) {
    blockingIssues.push("Make acceptance criteria verifiable with preview links, artifact checks, logs, reports, or user-visible behavior.");
  }

  if (proofEvidenceCriteriaCount(rawCriteria) < 1) {
    blockingIssues.push("Include at least one acceptance criterion that names the proof artifact, such as a preview link, source archive, log, screenshot, report, or handoff file.");
  }

  if (normalized.amount <= 0) {
    blockingIssues.push("Set a milestone amount greater than $0.");
  }

  if (normalized.estimated_duration_days < 1) {
    blockingIssues.push("Set a realistic duration of at least one day.");
  } else if (normalized.estimated_duration_days > 45) {
    warnings.push("Consider splitting milestones longer than 45 days into smaller fundable checkpoints.");
  }

  const score = Math.max(0, Math.min(100, 100 - blockingIssues.length * 16 - warnings.length * 6));

  return {
    score,
    passes: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    normalized,
  };
}
