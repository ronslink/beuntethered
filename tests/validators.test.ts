import assert from "node:assert/strict";
import test from "node:test";
import {
  agentMilestoneSubmissionInputSchema,
  auditCodeInputSchema,
  bidInputSchema,
  bidAnalysisInputSchema,
  byocInviteInputSchema,
  changeOrderCheckoutInputSchema,
  changeOrderProposalInputSchema,
  clientReviewInputSchema,
  displayNameInputSchema,
  disputeAnalysisInputSchema,
  disputeInputSchema,
  escrowReleaseInputSchema,
  milestonePaymentInputSchema,
  milestoneSubmissionInputSchema,
  notificationReadAllInputSchema,
  notificationReadInputSchema,
  notificationPreferencesInputSchema,
  onboardingStepInputSchema,
  organizationMemberInputSchema,
  organizationMemberRemovalInputSchema,
  organizationProfileInputSchema,
  passwordResetInputSchema,
  passwordResetRequestInputSchema,
  promptTriageInputSchema,
  projectRepositoryInputSchema,
  projectPostingSchema,
  projectInviteInputSchema,
  registrationInputSchema,
  savedSearchInputSchema,
  savedSearchUpdateInputSchema,
  sowGenerationInputSchema,
  systemNotificationInputSchema,
  userAIKeysInputSchema,
} from "../src/lib/validators.ts";

test("accepts a complete facilitator bid", () => {
  const parsed = bidInputSchema.safeParse({
    projectId: "project_1",
    proposedAmount: 2500,
    estimatedDays: 14,
    technicalApproach: "I will build the milestone against the acceptance criteria with a staging demo and test evidence.",
    requiredEscrowPct: 50,
  });

  assert.equal(parsed.success, true);
});

test("rejects incomplete bid approach", () => {
  const parsed = bidInputSchema.safeParse({
    projectId: "project_1",
    proposedAmount: 2500,
    estimatedDays: 14,
    technicalApproach: "short",
  });

  assert.equal(parsed.success, false);
});

test("validates project invites and saved searches", () => {
  assert.equal(projectInviteInputSchema.safeParse({
    projectId: "project_1",
    facilitatorId: "user_1",
    message: "Please review this project.",
  }).success, true);

  const saved = savedSearchInputSchema.parse({
    name: "AI app work",
    filters: { search: "agent", budget: "5K_20K" },
  });

  assert.equal(saved.alertFrequency, "DAILY");
  assert.equal(saved.enabled, true);

  assert.equal(savedSearchUpdateInputSchema.safeParse({
    savedSearchId: "search_1",
    alertFrequency: "WEEKLY",
  }).success, true);
  assert.equal(savedSearchUpdateInputSchema.safeParse({
    savedSearchId: "search_1",
  }).success, false);
});

test("validates BYOC invites as verifiable milestone scopes", () => {
  const valid = byocInviteInputSchema.parse({
    title: "Stripe Portal Repair",
    clientEmail: "Buyer@Example.COM",
    transitionMode: "RUNNING_PROJECT",
    currentState: "The buyer already has a staging billing portal with broken Stripe handoff.",
    priorWork: "Existing repository, staging URL, and Stripe test products are available.",
    remainingWork: "Untether will govern the repair, evidence report, and buyer acceptance checklist.",
    knownRisks: "Stripe webhook permissions may need buyer admin access.",
    executiveSummary: "Repair the Stripe portal flow so the buyer can validate billing access and event evidence.",
    totalAmount: 2500,
    milestones: [
      {
        title: "Stripe Portal Access",
        description: "Deliver a working customer billing portal flow with login handoff and Stripe test-mode evidence.",
        deliverables: ["Customer billing portal flow", "Stripe event evidence report"],
        acceptance_criteria: "Buyer can open the staging portal and reach the Stripe billing screen. Handoff includes screenshots or logs showing the Stripe test event evidence.",
        estimated_duration_days: 5,
        amount: 2500,
      },
    ],
  });

  assert.deepEqual(valid.milestones[0].acceptance_criteria, [
    "Buyer can open the staging portal and reach the Stripe billing screen.",
    "Handoff includes screenshots or logs showing the Stripe test event evidence.",
  ]);
  assert.equal(valid.clientEmail, "buyer@example.com");
  assert.equal(valid.transitionMode, "RUNNING_PROJECT");

  assert.equal(byocInviteInputSchema.safeParse({
    title: "Testing",
    executiveSummary: "Testing and bug fixes.",
    milestones: [
      {
        title: "Testing",
        description: "Testing and bug fixes.",
        deliverables: ["Testing"],
        acceptance_criteria: "Looks good.",
        estimated_duration_days: 1,
        amount: 500,
      },
    ],
  }).success, false);
});

test("validates AI project intake prompts", () => {
  const triage = promptTriageInputSchema.safeParse({
    prompt: "Build a billing portal with Stripe checkout and customer invoice history.",
  });
  assert.equal(triage.success, true);

  assert.equal(promptTriageInputSchema.safeParse({ prompt: "app" }).success, false);

  const sow = sowGenerationInputSchema.parse({
    prompt: "Build a billing portal with Stripe checkout, role-based access, and invoice history.",
    category: "web_app",
    complexity: "complex",
    budgetAmount: 15000,
    timelineDays: 30,
  });
  assert.equal(sow.mode, "EXECUTION");
  assert.equal(sow.desiredTimeline, "");
  assert.equal(sow.conversationHistory, "");
  assert.equal(sow.budgetAmount, 15000);
  assert.equal(sow.timelineDays, 30);
  assert.equal(sow.category, "web_app");
  assert.equal(sow.complexity, "complex");

  const revisedSow = sowGenerationInputSchema.parse({
    prompt: "Build a billing portal with Stripe checkout, role-based access, and invoice history.",
    category: "web_app",
    complexity: "complex",
    budgetAmount: 15000,
    timelineDays: 30,
    conversationHistory: "Client revision instruction: keep the budget but split billing into two milestones.",
  });
  assert.match(revisedSow.conversationHistory, /split billing/);

  assert.equal(sowGenerationInputSchema.safeParse({
    prompt: "Build a billing portal with Stripe checkout and invoice history.",
    category: "physical_goods",
  }).success, false);
});

test("validates dispute submissions", () => {
  assert.equal(disputeInputSchema.safeParse({
    projectId: "project_1",
    milestoneId: "milestone_1",
    reason: "The submitted app does not satisfy the acceptance criteria.",
    codeDoesNotRun: true,
  }).success, true);

  assert.equal(disputeInputSchema.safeParse({
    projectId: "project_1",
    reason: "too short",
    codeDoesNotRun: false,
  }).success, false);
});

test("validates change order proposals and checkout requests", () => {
  assert.equal(changeOrderProposalInputSchema.safeParse({
    projectId: "project_1",
    description: "Add a reporting export and admin review workflow.",
    addedCost: 1200,
  }).success, true);

  assert.equal(changeOrderProposalInputSchema.safeParse({
    projectId: "project_1",
    description: "tiny",
    addedCost: 0,
  }).success, false);

  assert.equal(changeOrderCheckoutInputSchema.safeParse({
    changeOrderId: "change_1",
  }).success, true);

  assert.equal(changeOrderCheckoutInputSchema.safeParse({
    changeOrderId: "",
  }).success, false);
});

test("validates milestone submissions", () => {
  assert.equal(milestoneSubmissionInputSchema.safeParse({
    milestoneId: "milestone_1",
    previewUrl: "https://preview.example.com",
    evidenceSummary: "The preview loads, the source archive is attached, and each acceptance check is documented.",
  }).success, true);

  assert.equal(milestoneSubmissionInputSchema.safeParse({
    milestoneId: "milestone_1",
    previewUrl: "not-a-url",
    evidenceSummary: "The preview loads, the source archive is attached, and each acceptance check is documented.",
  }).success, false);

  assert.equal(milestoneSubmissionInputSchema.safeParse({
    milestoneId: "milestone_1",
    previewUrl: "https://preview.example.com",
    evidenceSummary: "too short",
  }).success, false);

  assert.equal(agentMilestoneSubmissionInputSchema.safeParse({
    milestoneId: "milestone_1",
    previewUrl: "https://preview.example.com",
    payloadStoragePath: "https://storage.example.com/source.zip",
    evidenceSummary: "The agent submitted a source archive, preview URL, and evidence mapped to the acceptance checks.",
  }).success, true);

  assert.equal(agentMilestoneSubmissionInputSchema.safeParse({
    milestoneId: "milestone_1",
    previewUrl: "",
    payloadStoragePath: "https://storage.example.com/source.zip",
    evidenceSummary: "The agent submitted a source archive, preview URL, and evidence mapped to the acceptance checks.",
  }).success, false);
});

test("validates milestone payment requests", () => {
  assert.equal(milestonePaymentInputSchema.safeParse({ milestoneId: "milestone_1" }).success, true);
  assert.equal(milestonePaymentInputSchema.safeParse({ milestoneId: "" }).success, false);
  assert.equal(milestonePaymentInputSchema.safeParse({}).success, false);
});

test("validates AI audit requests", () => {
  assert.equal(auditCodeInputSchema.safeParse({
    milestone_id: "milestone_1",
    payload_url: "https://preview.example.com/build",
    evidence_summary: "The facilitator submitted a preview, source archive, and acceptance evidence.",
  }).success, true);

  assert.equal(auditCodeInputSchema.safeParse({
    milestone_id: "milestone_1",
    payload_url: "not-a-url",
  }).success, false);

  assert.equal(auditCodeInputSchema.safeParse({
    payload_url: "https://preview.example.com/build",
  }).success, false);
});

test("validates AI bid and dispute analysis requests", () => {
  assert.equal(bidAnalysisInputSchema.safeParse({ bidId: "bid_1" }).success, true);
  assert.equal(bidAnalysisInputSchema.safeParse({ bidId: "" }).success, false);

  const dispute = disputeAnalysisInputSchema.parse({
    disputeId: "dispute_1",
    reason: "The submitted delivery does not satisfy the accepted project scope.",
    sowText: "Build a project dashboard with documented acceptance criteria and handoff evidence.",
    acceptanceCriteria: ["Buyer can review the dashboard in staging."],
    evidenceUrls: ["https://example.com/evidence.png"],
  });
  assert.equal(dispute.milestoneTitle, "Milestone");
  assert.deepEqual(dispute.acceptanceCriteria, ["Buyer can review the dashboard in staging."]);

  assert.equal(disputeAnalysisInputSchema.safeParse({
    disputeId: "dispute_1",
    reason: "too short",
    sowText: "short",
    evidenceUrls: ["not-a-url"],
  }).success, false);
});

test("validates escrow release attestations", () => {
  assert.equal(escrowReleaseInputSchema.safeParse({
    milestoneId: "milestone_1",
    approvalAttestation: {
      testedPreview: true,
      reviewedEvidence: true,
      acceptsPaymentRelease: true,
      auditStatus: "SUCCESS",
      acceptedAt: new Date().toISOString(),
      failedAuditOverrideAccepted: false,
    },
  }).success, true);

  assert.equal(escrowReleaseInputSchema.safeParse({
    milestoneId: "milestone_1",
    approvalAttestation: {
      testedPreview: true,
      reviewedEvidence: true,
      acceptsPaymentRelease: true,
      auditStatus: "FAILED",
      failedAuditOverrideAccepted: true,
      failedAuditOverrideReason: "Buyer manually verified the flagged acceptance criterion.",
    },
  }).success, true);

  assert.equal(escrowReleaseInputSchema.safeParse({
    milestoneId: "milestone_1",
    approvalAttestation: {
      testedPreview: true,
      reviewedEvidence: false,
      acceptsPaymentRelease: true,
    },
  }).success, false);
});

test("validates organization workspace identity", () => {
  assert.equal(organizationProfileInputSchema.safeParse({
    name: "Acme Software",
    type: "SMB",
    website: "https://acme.example",
    billingEmail: "billing@acme.example",
  }).success, true);

  assert.equal(organizationProfileInputSchema.safeParse({
    name: "A",
    website: "not-a-url",
    billingEmail: "not-email",
  }).success, false);
});

test("validates organization member management inputs", () => {
  assert.equal(organizationMemberInputSchema.safeParse({
    organizationId: "org_1",
    email: "buyer@example.com",
    role: "ADMIN",
  }).success, true);

  const member = organizationMemberInputSchema.parse({
    organizationId: "org_1",
    email: "buyer@example.com",
  });
  assert.equal(member.role, "MEMBER");

  assert.equal(organizationMemberInputSchema.safeParse({
    organizationId: "org_1",
    email: "bad-email",
    role: "OWNER",
  }).success, false);

  assert.equal(organizationMemberRemovalInputSchema.safeParse({
    organizationId: "org_1",
    memberId: "member_1",
  }).success, true);
});

test("validates profile settings inputs", () => {
  const displayName = displayNameInputSchema.parse({ name: "  Ron Onyango  " });
  assert.equal(displayName.name, "Ron Onyango");

  assert.equal(displayNameInputSchema.safeParse({ name: "" }).success, false);
  assert.equal(displayNameInputSchema.safeParse({ name: "x".repeat(101) }).success, false);

  assert.equal(notificationPreferencesInputSchema.safeParse({
    notify_payment_updates: true,
    notify_new_proposals: false,
    notify_milestone_reviews: true,
  }).success, true);

  assert.equal(notificationPreferencesInputSchema.safeParse({
    notify_payment_updates: "yes",
    notify_new_proposals: false,
    notify_milestone_reviews: true,
  }).success, false);
});

test("validates notification mutation inputs", () => {
  assert.equal(notificationReadInputSchema.safeParse({ notificationId: "notification_1" }).success, true);
  assert.equal(notificationReadInputSchema.safeParse({ notificationId: "" }).success, false);

  assert.equal(notificationReadAllInputSchema.safeParse({ userId: "user_1" }).success, true);
  assert.equal(notificationReadAllInputSchema.safeParse({}).success, true);

  assert.equal(systemNotificationInputSchema.safeParse({
    userId: "user_1",
    message: "Milestone review required.",
    type: "MILESTONE",
    href: "/command-center/project_1",
  }).success, true);

  assert.equal(systemNotificationInputSchema.safeParse({
    userId: "user_1",
    message: "",
    type: "NOT_REAL",
    href: "not-a-url-or-path",
  }).success, false);
});

test("validates onboarding and BYOK settings inputs", () => {
  assert.equal(onboardingStepInputSchema.safeParse({
    step: "profile",
    bio: "I build verified software workflows with AI-assisted delivery.",
    skills: ["Next.js", "Stripe"],
    aiAgentStack: ["OpenAI", "Cursor"],
    portfolioUrl: "https://example.com",
    availability: "AVAILABLE",
    yearsExperience: 7,
    preferredProjectSize: "MVP",
  }).success, true);

  assert.equal(onboardingStepInputSchema.safeParse({
    step: "profile",
    bio: "Bad URL",
    skills: [],
    aiAgentStack: [],
    portfolioUrl: "not-a-url",
    availability: "AVAILABLE",
    yearsExperience: 7,
    preferredProjectSize: "MVP",
  }).success, false);

  assert.equal(onboardingStepInputSchema.safeParse({
    step: "pricing",
    hourlyRate: "125",
  }).success, true);

  assert.equal(onboardingStepInputSchema.safeParse({
    step: "pricing",
    hourlyRate: -1,
  }).success, false);

  assert.equal(userAIKeysInputSchema.safeParse({
    preferred_llm: "gpt-4o",
    openai_key: "sk-test",
  }).success, true);

  assert.equal(userAIKeysInputSchema.safeParse({
    preferred_llm: "unknown-model",
  }).success, false);
});

test("validates auth, review, and integration mutation inputs", () => {
  const registration = registrationInputSchema.parse({
    email: "  Buyer@Example.com ",
    password: "pass12345",
    name: "  Buyer User  ",
    role: "CLIENT",
  });
  assert.equal(registration.email, "buyer@example.com");
  assert.equal(registration.name, "Buyer User");
  assert.equal(registrationInputSchema.safeParse({
    email: "bad-email",
    password: "short",
    role: "ADMIN",
  }).success, false);

  assert.equal(passwordResetRequestInputSchema.safeParse({ email: "ron@example.com" }).success, true);
  assert.equal(passwordResetRequestInputSchema.safeParse({ email: "not-email" }).success, false);
  assert.equal(passwordResetInputSchema.safeParse({
    token: "a".repeat(32),
    newPassword: "pass12345",
  }).success, true);
  assert.equal(passwordResetInputSchema.safeParse({ token: "short", newPassword: "pass12345" }).success, false);

  assert.equal(clientReviewInputSchema.safeParse({
    projectId: "project_1",
    facilitatorId: "facilitator_1",
    rating: 5,
    feedback: "Strong delivery evidence.",
  }).success, true);
  assert.equal(clientReviewInputSchema.safeParse({
    projectId: "project_1",
    facilitatorId: "facilitator_1",
    rating: 6,
  }).success, false);

  assert.equal(projectRepositoryInputSchema.safeParse({
    projectId: "project_1",
    repoUrl: "https://github.com/example/repo",
    token: "github_pat_example",
  }).success, true);
  assert.equal(projectRepositoryInputSchema.safeParse({
    projectId: "project_1",
    repoUrl: "not-a-url",
  }).success, false);
});

test("validates marketplace project milestones for verifiable delivery", () => {
  const valid = projectPostingSchema.safeParse({
    title: "Billing Portal Build",
    executiveSummary: "Build a buyer-facing billing portal with Stripe checkout and verifiable payment evidence.",
    guardrailReport: {
      overallStatus: "passed",
      items: [
        { key: "budget", label: "Budget lock", status: "passed", detail: "Budget matched.", expected: "$2,500", actual: "$2,500" },
        { key: "timeline", label: "Timeline lock", status: "passed", detail: "Timeline matched.", expected: "10 days", actual: "10 days" },
        { key: "milestoneEvidence", label: "Milestone evidence", status: "passed", detail: "Evidence is ready.", actual: "1/1 ready" },
      ],
    },
    milestones: [
      {
        title: "Billing Portal",
        description: "Build a customer billing portal where account owners can manage subscriptions, review invoices, and see payment state.",
        deliverables: ["Customer billing dashboard", "Stripe checkout and billing flow", "Invoice history screen"],
        acceptance_criteria: [
          "Client can open the billing dashboard and see current subscription state.",
          "Stripe webhook events record successful payment updates in the project activity log.",
          "Source archive includes setup notes and environment configuration evidence.",
        ],
        estimated_duration_days: 10,
        amount: 2500,
      },
    ],
  });

  assert.equal(valid.success, true);

  const invalid = projectPostingSchema.safeParse({
    title: "Testing Work",
    executiveSummary: "A weak project scope that should not be posted because it cannot be verified by the buyer.",
    milestones: [
      {
        title: "Testing and bug fixes",
        description: "Run testing and fix bugs.",
        deliverables: ["Testing and bug fixes"],
        acceptance_criteria: ["Test it"],
        estimated_duration_days: 5,
        amount: 500,
      },
    ],
  });

  assert.equal(invalid.success, false);
});
