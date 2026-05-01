import type { EvidenceSourceStatusValue, EvidenceSourceTypeValue } from "./delivery-evidence.ts";

export type EvidenceVerificationMode = "system_check" | "provider_api" | "buyer_review";
export type EvidenceVerificationStage = "ready" | "pending" | "needs_attention";

export type EvidenceVerificationProfile = {
  type: EvidenceSourceTypeValue;
  label: string;
  setupOwner: "FACILITATOR" | "CLIENT" | "BOTH";
  confidenceTier: "strong" | "moderate" | "supporting";
  recognizedHosts: string[];
  setupSteps: string[];
  proves: string[];
  milestoneUse: string[];
  cannotProve: string[];
  checks: Array<{
    key: string;
    label: string;
    detail: string;
    mode: EvidenceVerificationMode;
  }>;
};

export type EvidenceSourceVerificationInput = {
  id?: string;
  type: EvidenceSourceTypeValue;
  label?: string | null;
  url?: string | null;
  status: EvidenceSourceStatusValue;
  metadata?: unknown;
};

export type EvidenceVerificationCheckResult = {
  key: string;
  label: string;
  detail: string;
  mode: EvidenceVerificationMode;
  status: "passed" | "pending" | "attention";
};

export type EvidenceSourceVerificationResult = {
  sourceType: EvidenceSourceTypeValue;
  providerLabel: string;
  stage: EvidenceVerificationStage;
  recommendedStatus: EvidenceSourceStatusValue;
  confidenceScore: number;
  summary: string;
  checks: EvidenceVerificationCheckResult[];
  blockers: string[];
  nextActions: string[];
  buyerReview: string[];
};

export type LinkedEvidenceVerificationItem = {
  id: string;
  type: EvidenceSourceTypeValue;
  label: string;
  url: string | null;
  status: EvidenceSourceStatusValue;
  providerLabel: string;
  stage: EvidenceVerificationStage;
  confidenceScore: number;
  summary: string;
  blockers: string[];
  nextActions: string[];
  buyerReview: string[];
};

export type LinkedEvidenceVerificationSummary = {
  total: number;
  readyCount: number;
  pendingCount: number;
  attentionCount: number;
  averageConfidence: number;
  releaseSummary: string;
  auditContext: string;
  buyerReview: string[];
  items: LinkedEvidenceVerificationItem[];
};

export const EVIDENCE_VERIFICATION_PROFILES: Record<EvidenceSourceTypeValue, EvidenceVerificationProfile> = {
  GITHUB: {
    type: "GITHUB",
    label: "GitHub",
    setupOwner: "FACILITATOR",
    confidenceTier: "strong",
    recognizedHosts: ["github.com"],
    setupSteps: ["Connect a repository URL.", "Add a read-only token only when the repository is private.", "Map milestone work to a branch, PR, commit, or release tag."],
    proves: ["Repository exists", "Code change can be inspected", "Commit or PR can be mapped to delivery"],
    milestoneUse: ["Source handoff", "Code review", "CI/check evidence", "Deployment commit mapping"],
    cannotProve: ["The deployed URL is running the exact commit unless deployment evidence also maps to it."],
    checks: [
      {
        key: "repo_reference",
        label: "Repository reference",
        detail: "Repository, branch, PR, commit, or tag is available for review.",
        mode: "system_check",
      },
      {
        key: "ci_or_review",
        label: "CI or review trail",
        detail: "Automated checks, review status, or merged PR evidence should be visible.",
        mode: "provider_api",
      },
      {
        key: "buyer_code_review",
        label: "Buyer code review",
        detail: "Buyer or audit agent confirms the change satisfies acceptance criteria.",
        mode: "buyer_review",
      },
    ],
  },
  VERCEL: {
    type: "VERCEL",
    label: "Vercel",
    setupOwner: "FACILITATOR",
    confidenceTier: "strong",
    recognizedHosts: ["vercel.app", "vercel.com"],
    setupSteps: ["Add preview or production deployment URL.", "Include deployment ID or build status in the note when available.", "Map deployment to the Git commit used for delivery."],
    proves: ["Preview or production deployment exists", "Buyer can exercise a live workflow", "Deployment can be tied to release evidence"],
    milestoneUse: ["Working preview", "Frontend acceptance testing", "Launch-readiness review"],
    cannotProve: ["Business correctness without buyer workflow testing."],
    checks: [
      {
        key: "deployment_url",
        label: "Deployment URL",
        detail: "Preview or production URL is present and reviewable.",
        mode: "system_check",
      },
      {
        key: "build_status",
        label: "Build status",
        detail: "Deployment/build status and commit mapping can be verified through provider metadata.",
        mode: "provider_api",
      },
      {
        key: "workflow_review",
        label: "Workflow review",
        detail: "Buyer completes acceptance flows in the preview before release.",
        mode: "buyer_review",
      },
    ],
  },
  NETLIFY: {
    type: "NETLIFY",
    label: "Netlify",
    setupOwner: "FACILITATOR",
    confidenceTier: "strong",
    recognizedHosts: ["netlify.app", "netlify.com"],
    setupSteps: ["Add deploy preview or production URL.", "Record deploy ID/build status when available.", "Attach function logs for serverless behavior."],
    proves: ["Deploy preview exists", "Frontend/functions are reachable", "Build evidence can be inspected"],
    milestoneUse: ["Working preview", "Frontend acceptance testing", "Function behavior proof"],
    cannotProve: ["Backend dependencies or third-party API behavior without additional logs."],
    checks: [
      {
        key: "deploy_preview",
        label: "Deploy preview",
        detail: "Deploy preview or production URL is present and reviewable.",
        mode: "system_check",
      },
      {
        key: "deploy_metadata",
        label: "Deploy metadata",
        detail: "Build status, deploy ID, and commit mapping can be verified through provider metadata.",
        mode: "provider_api",
      },
      {
        key: "buyer_flow",
        label: "Buyer flow check",
        detail: "Buyer confirms visible behavior and acceptance criteria in the deployment.",
        mode: "buyer_review",
      },
    ],
  },
  CLOUDFLARE: {
    type: "CLOUDFLARE",
    label: "Cloudflare",
    setupOwner: "BOTH",
    confidenceTier: "strong",
    recognizedHosts: ["pages.dev", "workers.dev", "cloudflare.com"],
    setupSteps: ["Attach Pages preview, Worker route, or DNS evidence.", "Add deployment ID, route, or log sample.", "Use DNS evidence when the client controls the domain."],
    proves: ["Edge route exists", "Pages/Worker deployment is reachable", "DNS or routing evidence can support launch readiness"],
    milestoneUse: ["Edge preview", "Worker/API proof", "Domain and DNS launch checks"],
    cannotProve: ["Data correctness or backend state unless logs/test results are attached."],
    checks: [
      {
        key: "edge_route",
        label: "Edge route",
        detail: "Pages URL, Worker route, or Cloudflare-backed domain is present.",
        mode: "system_check",
      },
      {
        key: "edge_metadata",
        label: "Edge metadata",
        detail: "Deployment status, route binding, DNS status, or log sample can be verified.",
        mode: "provider_api",
      },
      {
        key: "buyer_route_review",
        label: "Buyer route review",
        detail: "Buyer confirms the routed workflow behaves as accepted.",
        mode: "buyer_review",
      },
    ],
  },
  RAILWAY: {
    type: "RAILWAY",
    label: "Railway",
    setupOwner: "FACILITATOR",
    confidenceTier: "strong",
    recognizedHosts: ["railway.app", "railway.com"],
    setupSteps: ["Attach service URL or deployment URL.", "Record deployment/build evidence and environment mapping.", "Include health check or log proof for APIs/workers."],
    proves: ["Service exists", "Backend/API/worker can be reached", "Deployment evidence can be inspected"],
    milestoneUse: ["API delivery", "Worker delivery", "Backend deployment proof", "Service health checks"],
    cannotProve: ["Secret values or production data correctness without client-owned validation."],
    checks: [
      {
        key: "service_url",
        label: "Service URL",
        detail: "Service, deployment, or public endpoint is present.",
        mode: "system_check",
      },
      {
        key: "service_health",
        label: "Service health",
        detail: "Deployment, health check, log, or environment mapping can be verified.",
        mode: "provider_api",
      },
      {
        key: "buyer_api_review",
        label: "Buyer API review",
        detail: "Buyer or audit agent confirms the API/worker meets acceptance criteria.",
        mode: "buyer_review",
      },
    ],
  },
  RENDER: {
    type: "RENDER",
    label: "Render",
    setupOwner: "FACILITATOR",
    confidenceTier: "strong",
    recognizedHosts: ["onrender.com", "render.com"],
    setupSteps: ["Attach service URL or deploy event link.", "Add health check, worker, cron, or database proof.", "Map service evidence to milestone acceptance criteria."],
    proves: ["Managed service exists", "Deploy event or health signal can be reviewed", "Backend/worker delivery is inspectable"],
    milestoneUse: ["Backend service proof", "Worker/cron run proof", "Health check evidence"],
    cannotProve: ["End-to-end business workflow without buyer test data."],
    checks: [
      {
        key: "managed_service",
        label: "Managed service",
        detail: "Service URL, deploy event, worker, cron, or health check reference is present.",
        mode: "system_check",
      },
      {
        key: "render_health",
        label: "Render health evidence",
        detail: "Deploy status, health check, worker run, or cron evidence can be verified.",
        mode: "provider_api",
      },
      {
        key: "buyer_service_review",
        label: "Buyer service review",
        detail: "Buyer confirms service behavior maps to the milestone.",
        mode: "buyer_review",
      },
    ],
  },
  FLY: {
    type: "FLY",
    label: "Fly.io",
    setupOwner: "FACILITATOR",
    confidenceTier: "strong",
    recognizedHosts: ["fly.dev", "fly.io"],
    setupSteps: ["Attach app URL or deployment reference.", "Record machine, region, and health evidence.", "Attach logs for background services."],
    proves: ["Containerized app exists", "Region/machine health can be inspected", "Low-latency service proof can be reviewed"],
    milestoneUse: ["Container service proof", "Regional deployment evidence", "Health check evidence"],
    cannotProve: ["User acceptance without client workflow testing."],
    checks: [
      {
        key: "fly_app",
        label: "Fly app reference",
        detail: "App URL, deployment, machine, or region reference is present.",
        mode: "system_check",
      },
      {
        key: "machine_health",
        label: "Machine health",
        detail: "Machine status, region list, or health check can be verified.",
        mode: "provider_api",
      },
      {
        key: "buyer_runtime_review",
        label: "Buyer runtime review",
        detail: "Buyer confirms the deployed behavior meets acceptance criteria.",
        mode: "buyer_review",
      },
    ],
  },
  DIGITALOCEAN: {
    type: "DIGITALOCEAN",
    label: "DigitalOcean",
    setupOwner: "FACILITATOR",
    confidenceTier: "moderate",
    recognizedHosts: ["ondigitalocean.app", "digitalocean.com"],
    setupSteps: ["Attach App Platform URL or deployment evidence.", "Record component status and managed database proof where relevant.", "Attach logs or health checks for services."],
    proves: ["Managed app or service exists", "Deployment/component evidence can be inspected", "Database/platform evidence can support handoff"],
    milestoneUse: ["App Platform proof", "Managed database proof", "Deployment log evidence"],
    cannotProve: ["Infrastructure ownership transfer unless client-owned account evidence is attached."],
    checks: [
      {
        key: "do_app",
        label: "App Platform reference",
        detail: "App URL, deployment log, component status, or database reference is present.",
        mode: "system_check",
      },
      {
        key: "do_component_status",
        label: "Component status",
        detail: "Deployment and component health can be verified through provider metadata.",
        mode: "provider_api",
      },
      {
        key: "buyer_platform_review",
        label: "Buyer platform review",
        detail: "Buyer confirms the platform handoff and acceptance behavior.",
        mode: "buyer_review",
      },
    ],
  },
  HEROKU: {
    type: "HEROKU",
    label: "Heroku",
    setupOwner: "FACILITATOR",
    confidenceTier: "moderate",
    recognizedHosts: ["herokuapp.com", "heroku.com"],
    setupSteps: ["Attach review app or production app URL.", "Record release version, dyno/process status, or pipeline evidence.", "Attach add-on proof when databases/queues matter."],
    proves: ["Dyno or review app exists", "Release/process evidence can be inspected", "Pipeline handoff can be reviewed"],
    milestoneUse: ["Review app proof", "Release proof", "Dyno/process status evidence"],
    cannotProve: ["Long-term operability without monitoring and client-owned account access."],
    checks: [
      {
        key: "heroku_app",
        label: "Heroku app reference",
        detail: "Review app, production app, release, or pipeline reference is present.",
        mode: "system_check",
      },
      {
        key: "release_status",
        label: "Release status",
        detail: "Release version, dyno/process status, or add-on status can be verified.",
        mode: "provider_api",
      },
      {
        key: "buyer_app_review",
        label: "Buyer app review",
        detail: "Buyer confirms the app and handoff satisfy acceptance criteria.",
        mode: "buyer_review",
      },
    ],
  },
  SUPABASE: {
    type: "SUPABASE",
    label: "Supabase",
    setupOwner: "BOTH",
    confidenceTier: "moderate",
    recognizedHosts: ["supabase.co", "supabase.com"],
    setupSteps: ["Attach migration, schema, RLS, edge function, or storage evidence.", "Use read-only metadata or exported evidence instead of service-role keys.", "Client should verify ownership-sensitive production settings."],
    proves: ["Database/schema evidence exists", "Migration or RLS work can be reviewed", "Edge/storage proof can be attached"],
    milestoneUse: ["Migration proof", "RLS/security checklist", "Database handoff evidence", "Edge function proof"],
    cannotProve: ["Production data correctness without client test records and acceptance checks."],
    checks: [
      {
        key: "supabase_reference",
        label: "Supabase reference",
        detail: "Migration, schema, function, storage, or dashboard-safe reference is present.",
        mode: "system_check",
      },
      {
        key: "schema_metadata",
        label: "Schema metadata",
        detail: "Migration status, schema snapshot, RLS checklist, or edge function status can be verified.",
        mode: "provider_api",
      },
      {
        key: "buyer_data_review",
        label: "Buyer data review",
        detail: "Buyer confirms data behavior and security expectations using safe test records.",
        mode: "buyer_review",
      },
    ],
  },
  DOMAIN: {
    type: "DOMAIN",
    label: "Domain",
    setupOwner: "CLIENT",
    confidenceTier: "moderate",
    recognizedHosts: [],
    setupSteps: ["Client adds DNS TXT or .well-known verification proof.", "Record SSL and DNS target evidence.", "Confirm the domain points to the expected deployment."],
    proves: ["Domain control", "DNS target or SSL status", "Launch-readiness routing"],
    milestoneUse: ["Launch verification", "DNS handoff", "Production URL proof"],
    cannotProve: ["Application correctness behind the domain without deployment and workflow evidence."],
    checks: [
      {
        key: "domain_control",
        label: "Domain control",
        detail: "DNS TXT, .well-known file, SSL status, or DNS target evidence is present.",
        mode: "system_check",
      },
      {
        key: "dns_resolution",
        label: "DNS resolution",
        detail: "DNS and SSL status can be verified against the expected deployment.",
        mode: "provider_api",
      },
      {
        key: "buyer_launch_review",
        label: "Buyer launch review",
        detail: "Buyer confirms the production domain serves the expected workflow.",
        mode: "buyer_review",
      },
    ],
  },
  OTHER: {
    type: "OTHER",
    label: "Other evidence",
    setupOwner: "BOTH",
    confidenceTier: "supporting",
    recognizedHosts: [],
    setupSteps: ["Attach a reviewable artifact or note.", "Explain which milestone and acceptance criteria it supports.", "Prefer system evidence when possible."],
    proves: ["Supporting context exists", "Human-reviewable artifact is available"],
    milestoneUse: ["QA reports", "Screen recordings", "Handoff documents", "External proof"],
    cannotProve: ["System state or ownership without stronger provider-backed evidence."],
    checks: [
      {
        key: "supporting_artifact",
        label: "Supporting artifact",
        detail: "File, report, recording, or external artifact is available for review.",
        mode: "system_check",
      },
      {
        key: "artifact_mapping",
        label: "Artifact mapping",
        detail: "The artifact maps clearly to milestone acceptance criteria.",
        mode: "buyer_review",
      },
    ],
  },
};

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
}

function metadataText(metadata: unknown, key: string) {
  const value = metadataRecord(metadata)[key];
  return typeof value === "string" ? value.trim() : "";
}

function getHostname(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function hasRecognizedHost(profile: EvidenceVerificationProfile, url: string | null | undefined) {
  const hostname = getHostname(url);
  if (!hostname) return false;
  return profile.recognizedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function checkStatus(
  condition: boolean,
  pendingWhenFalse = true,
): "passed" | "pending" | "attention" {
  if (condition) return "passed";
  return pendingWhenFalse ? "pending" : "attention";
}

export function getEvidenceVerificationProfile(type: EvidenceSourceTypeValue | string) {
  return EVIDENCE_VERIFICATION_PROFILES[type as EvidenceSourceTypeValue] ?? EVIDENCE_VERIFICATION_PROFILES.OTHER;
}

export function evaluateEvidenceSourceVerification(source: EvidenceSourceVerificationInput): EvidenceSourceVerificationResult {
  const profile = getEvidenceVerificationProfile(source.type);
  const note = metadataText(source.metadata, "verification_note");
  const access = metadataText(source.metadata, "access");
  const proofUse = metadataText(source.metadata, "proof_use");
  const hasUrl = Boolean(source.url);
  const urlRequired = source.type !== "OTHER";
  const hasContext = note.length >= 20 || Boolean(access) || Boolean(proofUse);
  const recognizedHost = hasRecognizedHost(profile, source.url);
  const hostCheckApplies = profile.recognizedHosts.length > 0;
  const blockers: string[] = [];

  if (urlRequired && !hasUrl) {
    blockers.push(`${profile.label} needs a reviewable URL or provider link before it can support milestone verification.`);
  }

  if (!hasContext) {
    blockers.push("Add a verification note that maps this source to a milestone, commit, deployment, run, or acceptance check.");
  }

  const checks: EvidenceVerificationCheckResult[] = [
    {
      key: "reviewable_reference",
      label: urlRequired ? "Reviewable provider link" : "Reviewable artifact",
      detail: urlRequired
        ? "The source has a URL or provider link that can be opened during milestone review."
        : "The supporting artifact is described well enough for review.",
      mode: "system_check",
      status: checkStatus(!urlRequired || hasUrl, false),
    },
    {
      key: "provider_fit",
      label: "Provider fit",
      detail: hostCheckApplies
        ? "The URL matches a known provider host, or a custom domain is explained for buyer review."
        : "Provider fit is established through artifact context and buyer review.",
      mode: "system_check",
      status: hostCheckApplies ? checkStatus(recognizedHost || hasUrl) : "passed",
    },
    {
      key: "milestone_mapping",
      label: "Milestone mapping",
      detail: "The source explains which milestone, acceptance criteria, deployment, commit, or run it supports.",
      mode: "buyer_review",
      status: checkStatus(hasContext),
    },
    ...profile.checks.map((check) => ({
      ...check,
      status:
        check.mode === "provider_api"
          ? "pending" as const
          : check.mode === "buyer_review"
            ? "pending" as const
            : checkStatus(hasUrl || source.type === "OTHER"),
    })),
  ];

  const passedCount = checks.filter((check) => check.status === "passed").length;
  const attentionCount = checks.filter((check) => check.status === "attention").length;
  const recommendedStatus: EvidenceSourceStatusValue =
    attentionCount > 0 || blockers.some((blocker) => blocker.startsWith(`${profile.label} needs`))
      ? "NEEDS_ATTENTION"
      : blockers.length === 0
        ? "CONNECTED"
        : "PENDING_VERIFICATION";
  const stage: EvidenceVerificationStage =
    recommendedStatus === "CONNECTED" ? "ready" : recommendedStatus === "NEEDS_ATTENTION" ? "needs_attention" : "pending";
  const confidenceBase = profile.confidenceTier === "strong" ? 35 : profile.confidenceTier === "moderate" ? 25 : 12;
  const confidenceScore = Math.min(
    100,
    confidenceBase +
      (hasUrl ? 20 : 0) +
      (recognizedHost || !hostCheckApplies ? 15 : 5) +
      (hasContext ? 20 : 0) +
      (source.status === "CONNECTED" ? 10 : 0) +
      Math.min(10, passedCount * 2),
  );
  const nextActions = [
    ...blockers,
    ...profile.checks
      .filter((check) => check.mode === "provider_api")
      .slice(0, 1)
      .map((check) => `Future provider API check: ${check.detail}`),
  ].slice(0, 4);
  const buyerReview = [
    ...profile.checks.filter((check) => check.mode === "buyer_review").map((check) => check.detail),
    ...profile.cannotProve.map((item) => `Cannot prove automatically: ${item}`),
  ].slice(0, 4);

  return {
    sourceType: profile.type,
    providerLabel: profile.label,
    stage,
    recommendedStatus,
    confidenceScore,
    summary:
      stage === "ready"
        ? `${profile.label} is ready to support milestone evidence. Provider API checks and buyer acceptance still complete the final proof.`
        : stage === "needs_attention"
          ? `${profile.label} needs attention before it can be trusted as milestone evidence.`
          : `${profile.label} has been captured and needs more context before it is ready for milestone verification.`,
    checks,
    blockers,
    nextActions,
    buyerReview,
  };
}

export function buildLinkedEvidenceVerificationSummary(
  sources: EvidenceSourceVerificationInput[],
): LinkedEvidenceVerificationSummary {
  const items: LinkedEvidenceVerificationItem[] = sources.map((source, index) => {
    const result = evaluateEvidenceSourceVerification(source);

    return {
      id: source.id ?? `${source.type}-${index}`,
      type: result.sourceType,
      label: source.label?.trim() || result.providerLabel,
      url: source.url ?? null,
      status: source.status,
      providerLabel: result.providerLabel,
      stage: result.stage,
      confidenceScore: result.confidenceScore,
      summary: result.summary,
      blockers: result.blockers,
      nextActions: result.nextActions,
      buyerReview: result.buyerReview,
    };
  });
  const total = items.length;
  const readyCount = items.filter((item) => item.stage === "ready").length;
  const pendingCount = items.filter((item) => item.stage === "pending").length;
  const attentionCount = items.filter((item) => item.stage === "needs_attention").length;
  const averageConfidence = total
    ? Math.round(items.reduce((acc, item) => acc + item.confidenceScore, 0) / total)
    : 0;
  const buyerReview = Array.from(new Set(items.flatMap((item) => item.buyerReview))).slice(0, 5);
  const strongestSources = [...items]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 3);

  return {
    total,
    readyCount,
    pendingCount,
    attentionCount,
    averageConfidence,
    releaseSummary:
      total === 0
        ? "No provider-backed evidence sources were linked to this submission."
        : readyCount > 0 && attentionCount === 0
          ? `${readyCount} of ${total} linked evidence sources are ready for buyer review. Average confidence is ${averageConfidence}%.`
          : attentionCount > 0
            ? `${attentionCount} linked evidence source${attentionCount === 1 ? "" : "s"} need attention before this proof package is strong. Average confidence is ${averageConfidence}%.`
            : `Linked evidence was captured, but it needs more context before it can be treated as verified proof. Average confidence is ${averageConfidence}%.`,
    auditContext:
      total === 0
        ? "No provider-backed evidence sources were linked to this milestone submission."
        : strongestSources
            .map((item) =>
              `${item.providerLabel}: ${item.stage}, ${item.confidenceScore}% confidence, status ${item.status}. ${item.summary}`,
            )
            .join("\n"),
    buyerReview:
      buyerReview.length > 0
        ? buyerReview
        : ["Open the submitted preview and compare the result against each acceptance check before releasing escrow."],
    items,
  };
}

export function getVerificationModeLabel(mode: EvidenceVerificationMode) {
  switch (mode) {
    case "system_check":
      return "System check";
    case "provider_api":
      return "Provider API";
    case "buyer_review":
      return "Buyer review";
  }
}
