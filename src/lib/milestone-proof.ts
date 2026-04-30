export type MilestoneProofInput = {
  title?: unknown;
  description?: unknown;
  deliverables?: unknown;
  acceptance_criteria?: unknown;
  live_preview_url?: unknown;
  payload_storage_path?: unknown;
  attachments?: { purpose?: unknown; name?: unknown }[];
};

export type ProofArtifactRequirement = {
  key: string;
  label: string;
  detail: string;
  required: boolean;
  available: boolean;
};

export type MilestoneProofPlan = {
  summary: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  requiredArtifacts: ProofArtifactRequirement[];
  reviewChecks: string[];
};

export const MILESTONE_VERIFICATION_PATTERNS = [
  {
    key: "working_preview",
    label: "Working preview",
    detail: "Use for apps, dashboards, websites, prototypes, workflows, and interactive screens. Evidence should be a staging URL, demo link, preview route, or release build the buyer can open.",
  },
  {
    key: "source_package",
    label: "Source or package archive",
    detail: "Use for software, integrations, APIs, automations, data pipelines, and anything the buyer must own or maintain. Evidence should be repository access, source archive, deployment package, schema, config notes, or setup instructions.",
  },
  {
    key: "behavioral_check",
    label: "Behavioral pass/fail check",
    detail: "Use for user-facing features and integrations. Criteria should name the actor, action, and result, such as buyer can fund a milestone, webhook records a payment, or API returns the expected payload.",
  },
  {
    key: "audit_trail",
    label: "Log or audit trail",
    detail: "Use for payments, webhooks, notifications, role changes, disputes, data processing, and admin operations. Evidence should be activity records, logs, webhook events, audit rows, or exported event history.",
  },
  {
    key: "visual_evidence",
    label: "Screenshot or screen recording",
    detail: "Use for UI, mobile, design, and workflow review. Evidence should show the completed screens, responsive states, important interactions, or before/after comparisons.",
  },
  {
    key: "document_handoff",
    label: "Document handoff",
    detail: "Use for design, writing, strategy, architecture, and operational work. Evidence should be editable files, exported documents, diagrams, runbooks, checklists, or handoff notes.",
  },
  {
    key: "quality_report",
    label: "Quality or defect evidence",
    detail: "Use when testing, QA, bug fixing, or release readiness matters. Evidence should be a QA report, test result summary, resolved defect log, known-issues note, or release checklist.",
  },
] as const;

export function getMilestoneVerificationPatternGuide() {
  return MILESTONE_VERIFICATION_PATTERNS
    .map((pattern) => `- ${pattern.label}: ${pattern.detail}`)
    .join("\n");
}

const INTERACTIVE_OUTPUT =
  /\b(app|application|portal|dashboard|screen|page|flow|workflow|site|website|checkout|login|registration|admin|customer|api|endpoint|integration|automation|preview|prototype|deployed|release|build)\b/i;

const SOURCE_OR_CONFIG_OUTPUT =
  /\b(code|source|repository|repo|archive|api|endpoint|schema|database|migration|integration|webhook|config|configuration|environment|deployment|build|application|app|portal|dashboard|automation)\b/i;

const DOCUMENT_OUTPUT =
  /\b(report|document|notes|handoff|roadmap|plan|wireframe|mockup|design|copy|content|file|export|checklist)\b/i;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function toList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }

  const text = clean(value);
  if (!text) return [];

  return text
    .split(/\n|;|\s-\s|(?:^|\s)\d+\.\s/g)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function hasAttachment(milestone: MilestoneProofInput, purpose: string) {
  return Array.isArray(milestone.attachments)
    ? milestone.attachments.some((attachment) => clean(attachment.purpose) === purpose)
    : false;
}

function artifactRequirement({
  key,
  label,
  detail,
  available,
}: {
  key: string;
  label: string;
  detail: string;
  available: boolean;
}): ProofArtifactRequirement {
  return { key, label, detail, required: true, available };
}

export function getMilestoneProofPlan(milestone: MilestoneProofInput): MilestoneProofPlan {
  const deliverables = toList(milestone.deliverables);
  const acceptanceCriteria = toList(milestone.acceptance_criteria);
  const context = [
    clean(milestone.title),
    clean(milestone.description),
    ...deliverables,
    ...acceptanceCriteria,
  ].join(" ");
  const needsInteractiveProof = INTERACTIVE_OUTPUT.test(context);
  const needsSourceArchive = SOURCE_OR_CONFIG_OUTPUT.test(context);
  const needsDocumentEvidence = DOCUMENT_OUTPUT.test(context) || !needsInteractiveProof;

  const requiredArtifacts: ProofArtifactRequirement[] = [
    artifactRequirement({
      key: "preview",
      label: needsInteractiveProof ? "Working preview URL" : "Reviewable artifact link",
      detail: needsInteractiveProof
        ? "A live preview, staging route, or demo link where the buyer can exercise the delivered flow."
        : "A link or file package where the buyer can inspect the completed deliverable.",
      available: Boolean(clean(milestone.live_preview_url)),
    }),
    artifactRequirement({
      key: "source",
      label: needsSourceArchive ? "Source or package archive" : "Original work files",
      detail: needsSourceArchive
        ? "A source archive, repository export, configuration notes, or deployment package for handoff."
        : "Editable files, exports, or originals needed for the buyer to own and reuse the work.",
      available: Boolean(clean(milestone.payload_storage_path)) || hasAttachment(milestone, "MILESTONE_SUBMISSION"),
    }),
    artifactRequirement({
      key: "criteria",
      label: "Acceptance evidence",
      detail:
        acceptanceCriteria.length > 0
          ? `${acceptanceCriteria.length} pass/fail check${acceptanceCriteria.length === 1 ? "" : "s"} must be evidenced in the submission.`
          : "Submission must include concrete proof mapped to the buyer-visible deliverables.",
      available: hasAttachment(milestone, "AUDIT_EVIDENCE") || hasAttachment(milestone, "MILESTONE_SUBMISSION"),
    }),
  ];

  if (needsDocumentEvidence) {
    requiredArtifacts.push(
      artifactRequirement({
        key: "handoff",
        label: "Handoff notes",
        detail: "Short notes explaining what changed, how to review it, and any setup needed after approval.",
        available: hasAttachment(milestone, "MILESTONE_SUBMISSION"),
      })
    );
  }

  const reviewChecks =
    acceptanceCriteria.length > 0
      ? acceptanceCriteria
      : deliverables.slice(0, 4).map((deliverable) => `Buyer can inspect and approve ${deliverable.toLowerCase()}.`);

  return {
    summary: `${deliverables.length || "No"} deliverable${deliverables.length === 1 ? "" : "s"} and ${
      reviewChecks.length || "no"
    } verification check${reviewChecks.length === 1 ? "" : "s"}`,
    deliverables,
    acceptanceCriteria,
    requiredArtifacts,
    reviewChecks,
  };
}
