import { z } from "zod";
import { assessMilestoneQuality } from "./milestone-quality.ts";
import { AI_PROVIDER_IDS } from "./ai-provider-config.ts";

const trimmed = z.string().trim();

export const projectCategoryOptions = [
  "software_mvp",
  "web_app",
  "internal_tool",
  "mobile_app",
  "api_integration",
  "ai_automation",
  "data_dashboard",
  "app_modernization",
  "qa_hardening",
  "discovery_sow",
  "other_software",
] as const;

export const projectComplexityOptions = ["simple", "medium", "complex"] as const;
export const byocTransitionModeOptions = ["NEW_EXTERNAL", "RUNNING_PROJECT", "RESCUE_TRANSITION", "ONGOING_TO_MILESTONES"] as const;

export const promptTriageInputSchema = z.object({
  prompt: trimmed
    .min(5, "Please describe what you need in at least a short sentence.")
    .max(4000, "Keep the project description under 4,000 characters."),
});

export const sowGenerationInputSchema = z.object({
  prompt: trimmed
    .min(10, "Describe the outcome you want before generating a scope.")
    .max(6000, "Keep the project description under 6,000 characters."),
  mode: z.enum(["DISCOVERY", "EXECUTION"]).default("EXECUTION"),
  desiredTimeline: trimmed.max(200, "Keep the timeline note under 200 characters.").default(""),
  budgetAmount: z.coerce.number().int().positive().max(5_000_000).optional(),
  timelineDays: z.coerce.number().int().min(1).max(365).optional(),
  category: z.enum(projectCategoryOptions).default("other_software"),
  complexity: z.enum(projectComplexityOptions).default("medium"),
  conversationHistory: trimmed.max(12000, "Keep the scope revision history under 12,000 characters.").optional().default(""),
});

const textListInput = z.union([
  trimmed,
  z.array(trimmed.min(1).max(1000)).max(10),
]).transform((value) => {
  if (Array.isArray(value)) return value;
  return value
    .split(/\n|;|(?<=\.)\s+/g)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
});

const byocMilestoneInputSchema = z.object({
  title: trimmed.min(3).max(160),
  description: trimmed.min(20).max(1200),
  deliverables: textListInput,
  acceptance_criteria: textListInput,
  estimated_duration_days: z.coerce.number().int().min(1).max(365),
  amount: z.coerce.number().positive().max(1_000_000),
});

export const byocInviteInputSchema = z.object({
  title: trimmed.min(3).max(160),
  executiveSummary: trimmed.min(20).max(5000),
  totalAmount: z.coerce.number().positive().max(5_000_000).optional(),
  transitionMode: z.enum(byocTransitionModeOptions).default("NEW_EXTERNAL"),
  currentState: trimmed.max(2000, "Keep the current project state under 2,000 characters.").optional(),
  priorWork: trimmed.max(2000, "Keep prior work notes under 2,000 characters.").optional(),
  remainingWork: trimmed.max(2000, "Keep remaining work notes under 2,000 characters.").optional(),
  knownRisks: trimmed.max(2000, "Keep risk notes under 2,000 characters.").optional(),
  clientEmail: z
    .union([trimmed.email().max(254), z.literal("")])
    .optional()
    .transform((value) => (value ? value.toLowerCase() : undefined)),
  milestones: z.array(byocMilestoneInputSchema).min(1).max(8),
}).superRefine((value, ctx) => {
  for (const [index, milestone] of value.milestones.entries()) {
    const assessment = assessMilestoneQuality(milestone);
    if (!assessment.passes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["milestones", index],
        message: assessment.blockingIssues.join(" "),
      });
    }
  }
});

export const bidInputSchema = z.object({
  projectId: trimmed.min(1),
  proposedAmount: z.coerce.number().positive("Enter a proposal price greater than $0.").max(1_000_000),
  estimatedDays: z.coerce.number().int("Enter whole days for the delivery timeline.").positive("Enter a delivery timeline of at least 1 day.").max(365),
  technicalApproach: trimmed.min(20, "Add a technical approach of at least 20 characters before submitting.").max(5000),
  proposedTechStack: trimmed.max(1000).optional(),
  techStackReason: trimmed.max(2000).optional(),
  proposedMilestones: z
    .array(
      z.object({
        title: trimmed.min(1, "Every milestone needs a title before submitting.").max(160),
        amount: z.coerce.number().nonnegative(),
        days: z.coerce.number().int().positive("Every milestone needs a timeline of at least 1 day.").max(365),
        description: trimmed.max(1200).optional(),
        deliverables: z.array(trimmed.min(1).max(1000)).max(10).optional(),
        acceptance_criteria: z.array(trimmed.min(1).max(1000)).max(10).optional(),
      })
    )
    .optional(),
  requiredEscrowPct: z.coerce.number().int().min(10).max(100).optional(),
});

export const messageInputSchema = z.object({
  projectId: trimmed.min(1),
  content: trimmed.min(1).max(4000),
  milestoneId: trimmed.min(1).optional(),
});

export const messageWithAttachmentsInputSchema = z.object({
  projectId: trimmed.min(1),
  content: trimmed.max(4000),
  milestoneId: trimmed.min(1).optional(),
});

export const disputeInputSchema = z.object({
  projectId: trimmed.min(1),
  milestoneId: trimmed.min(1).optional(),
  reason: trimmed.min(10).max(5000),
  codeDoesNotRun: z.boolean().default(false),
});

export const changeOrderProposalInputSchema = z.object({
  projectId: trimmed.min(1),
  description: trimmed
    .min(10, "Describe the added scope before proposing a change order.")
    .max(3000),
  addedCost: z.coerce
    .number()
    .positive("Enter a change order cost greater than $0.")
    .max(250_000),
});

export const changeOrderCheckoutInputSchema = z.object({
  changeOrderId: trimmed.min(1),
});

export const milestonePaymentInputSchema = z.object({
  milestoneId: trimmed.min(1),
});

export const milestoneSubmissionInputSchema = z.object({
  milestoneId: trimmed.min(1),
  previewUrl: trimmed.url().max(2048),
  evidenceSummary: trimmed
    .min(20, "Explain how this delivery satisfies the acceptance criteria.")
    .max(5000),
});

export const agentMilestoneSubmissionInputSchema = z.object({
  milestoneId: trimmed.min(1),
  previewUrl: trimmed.url().max(2048),
  payloadStoragePath: trimmed.url().max(2048),
  evidenceSummary: trimmed
    .min(20, "Explain how this delivery satisfies the acceptance criteria.")
    .max(5000),
});

export const auditCodeInputSchema = z.object({
  milestone_id: trimmed.min(1),
  payload_url: trimmed.url().max(2048),
  evidence_summary: trimmed.max(5000).optional(),
  agent_key: trimmed.max(256).optional(),
});

export const bidAnalysisInputSchema = z.object({
  bidId: trimmed.min(1),
});

export const disputeAnalysisInputSchema = z.object({
  disputeId: trimmed.min(1),
  reason: trimmed.min(10).max(5000),
  sowText: trimmed.min(20).max(50000),
  milestoneTitle: trimmed.max(200).default("Milestone"),
  acceptanceCriteria: z.array(trimmed.max(1000)).default([]),
  evidenceUrls: z.array(trimmed.url().max(2048)).optional(),
  disputeEvidence: z
    .array(
      z.object({
        name: trimmed.max(240).optional(),
        url: trimmed.url().max(2048).optional(),
        contentType: trimmed.max(120).nullable().optional(),
        sizeBytes: z.coerce.number().int().nonnegative().nullable().optional(),
      })
    )
    .optional(),
  deliveryEvidenceContext: z.unknown().optional(),
});

const requiredTrue = (message: string) =>
  z.boolean().refine((value) => value === true, { message });

export const escrowReleaseInputSchema = z.object({
  milestoneId: trimmed.min(1),
  approvalAttestation: z.object({
    testedPreview: requiredTrue("Confirm that you tested the submitted preview."),
    reviewedEvidence: requiredTrue("Confirm that you reviewed the proof package and audit evidence."),
    acceptsPaymentRelease: requiredTrue("Confirm that approval releases escrow and accepts the submitted work."),
    acceptedAt: trimmed.optional(),
    auditStatus: z.enum(["PENDING", "SUCCESS", "FAILED", "NONE"]).optional(),
    failedAuditOverrideAccepted: z.boolean().optional(),
    failedAuditOverrideReason: trimmed.max(1000).optional(),
  }),
});

export const projectInviteInputSchema = z.object({
  projectId: trimmed.min(1),
  facilitatorId: trimmed.min(1),
  message: trimmed.max(1000).optional(),
});

export const savedSearchInputSchema = z.object({
  name: trimmed.min(1).max(80),
  filters: z.record(z.string(), z.unknown()).default({}),
  alertFrequency: z.enum(["DAILY", "WEEKLY", "NEVER"]).default("DAILY"),
  enabled: z.boolean().default(true),
});

export const savedSearchUpdateInputSchema = z.object({
  savedSearchId: trimmed.min(1),
  alertFrequency: z.enum(["DAILY", "WEEKLY", "NEVER"]).optional(),
  enabled: z.boolean().optional(),
}).refine((value) => value.alertFrequency !== undefined || value.enabled !== undefined, {
  message: "Choose an alert setting to update.",
});

export const organizationProfileInputSchema = z.object({
  organizationId: trimmed.min(1).optional(),
  name: trimmed.min(2).max(160),
  type: trimmed.max(80).optional(),
  website: z.union([trimmed.url().max(2048), z.literal("")]).optional(),
  billingEmail: z.union([trimmed.email().max(254), z.literal("")]).optional(),
});

export const organizationMemberInputSchema = z.object({
  organizationId: trimmed.min(1),
  email: trimmed.email().max(254),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const organizationMemberRemovalInputSchema = z.object({
  organizationId: trimmed.min(1),
  memberId: trimmed.min(1),
});

export const displayNameInputSchema = z.object({
  name: trimmed.min(1, "Name cannot be empty.").max(100, "Name too long."),
});

export const notificationPreferencesInputSchema = z.object({
  notify_payment_updates: z.boolean(),
  notify_new_proposals: z.boolean(),
  notify_milestone_reviews: z.boolean(),
});

export const notificationReadInputSchema = z.object({
  notificationId: trimmed.min(1),
});

export const notificationReadAllInputSchema = z.object({
  userId: trimmed.min(1).optional(),
});

export const systemNotificationInputSchema = z.object({
  userId: trimmed.min(1),
  message: trimmed.min(1).max(500),
  type: z
    .enum(["INFO", "SUCCESS", "WARNING", "ERROR", "MILESTONE", "MESSAGE", "BID", "ALERT"])
    .optional(),
  href: z.union([trimmed.startsWith("/").max(2048), trimmed.url().max(2048)]).optional(),
});

export const userAIKeysInputSchema = z.object({
  preferred_llm: z.enum(AI_PROVIDER_IDS),
  openai_key: trimmed.max(4000).optional(),
  anthropic_key: trimmed.max(4000).optional(),
  google_key: trimmed.max(4000).optional(),
});

export const onboardingStepInputSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("legal"),
    addressLine1: trimmed.max(160),
    addressCity: trimmed.max(100),
    addressState: trimmed.max(100),
    addressZip: trimmed.max(40),
    addressCountry: trimmed.max(80).default("US"),
    tosAccepted: z.boolean(),
  }),
  z.object({
    step: z.literal("profile"),
    bio: trimmed.max(2000),
    skills: z.array(trimmed.min(1).max(80)).max(30).default([]),
    aiAgentStack: z.array(trimmed.min(1).max(80)).max(30).default([]),
    portfolioUrl: z.union([trimmed.url().max(2048), z.literal("")]).default(""),
    availability: trimmed.max(80),
    yearsExperience: z.coerce.number().int().min(0).max(80).default(0),
    preferredProjectSize: trimmed.max(80),
  }),
  z.object({
    step: z.literal("pricing"),
    hourlyRate: z.coerce.number().min(0).max(10000).default(0),
  }),
  z.object({
    step: z.literal("byoc"),
    openaiKey: trimmed.max(4000).optional(),
    anthropicKey: trimmed.max(4000).optional(),
    googleKey: trimmed.max(4000).optional(),
  }),
  z.object({
    step: z.literal("preferences"),
    companyName: trimmed.max(160),
    companyType: trimmed.max(80),
    preferredBidType: trimmed.max(80),
    typicalProjectBudget: trimmed.max(80),
  }),
]);

export const registrationInputSchema = z.object({
  email: trimmed.email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters.").max(256),
  name: trimmed.max(100).optional(),
  role: z.enum(["CLIENT", "FACILITATOR"]),
  openai_key: trimmed.max(4000).optional(),
  anthropic_key: trimmed.max(4000).optional(),
});

export const passwordResetRequestInputSchema = z.object({
  email: trimmed.email().max(254).transform((value) => value.toLowerCase()),
});

export const passwordResetInputSchema = z.object({
  token: trimmed.min(16, "Invalid or expired reset token.").max(256),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").max(256),
});

export const clientReviewInputSchema = z.object({
  projectId: trimmed.min(1),
  facilitatorId: trimmed.min(1),
  rating: z.coerce.number().int().min(1).max(5),
  feedback: trimmed.max(2000).default(""),
});

export const projectRepositoryInputSchema = z.object({
  projectId: trimmed.min(1),
  repoUrl: trimmed.url().max(2048),
  token: trimmed.max(4000).optional(),
});

export const projectEvidenceSourceTypeOptions = ["GITHUB", "VERCEL", "SUPABASE", "DOMAIN", "OTHER"] as const;

export const projectEvidenceSourceInputSchema = z.object({
  projectId: trimmed.min(1),
  type: z.enum(projectEvidenceSourceTypeOptions),
  label: trimmed.min(2, "Name the evidence source.").max(120),
  url: z.union([trimmed.url().max(2048), z.literal("")]).default(""),
  verificationNote: trimmed.max(1000).optional().default(""),
}).superRefine((value, ctx) => {
  if (value.type !== "OTHER" && !value.url) {
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message: "Add a reviewable URL or provider link for this evidence source.",
    });
  }
});

const scopeValidationReportSchema = z.object({
  overallStatus: z.enum(["passed", "needs_attention"]),
  items: z.array(z.object({
    key: z.enum(["budget", "timeline", "regions", "components", "milestoneEvidence"]),
    label: trimmed.min(1).max(80),
    status: z.enum(["passed", "needs_attention", "not_applicable"]),
    detail: trimmed.min(1).max(500),
    expected: trimmed.max(120).optional(),
    actual: trimmed.max(120).optional(),
    present: z.array(trimmed.max(160)).optional(),
    missing: z.array(trimmed.max(160)).optional(),
  })).max(8),
});

export const projectPostingSchema = z.object({
  title: trimmed.min(3).max(180),
  executiveSummary: trimmed.min(20).max(20000),
  mode: trimmed.optional(),
  selected_facilitators: z.array(z.object({ id: trimmed.min(1) })).default([]),
  biddingClosesAt: trimmed.optional(),
  guardrailReport: scopeValidationReportSchema.optional(),
  milestones: z.array(
    z.object({
      title: trimmed.min(1).max(180),
      description: trimmed.max(2000).optional(),
      acceptance_criteria: z.union([trimmed, z.array(trimmed)]).optional(),
      deliverables: z.array(trimmed).optional(),
      estimated_duration_days: z.coerce.number().int().positive().max(365).optional(),
      amount: z.coerce.number().positive().max(1_000_000),
    })
  ).min(1),
}).superRefine((data, ctx) => {
  data.milestones.forEach((milestone, index) => {
    const quality = assessMilestoneQuality(milestone);

    for (const issue of quality.blockingIssues) {
      ctx.addIssue({
        code: "custom",
        message: issue,
        path: ["milestones", index],
      });
    }
  });
});
