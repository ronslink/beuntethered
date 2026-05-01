import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChatWidget from "@/components/dashboard/command-center/ChatWidget";
import IntegrationsTab from "@/components/dashboard/IntegrationsTab";
import { FacilitatorSubmitGateway, ClientReviewGateway, ClientFundGateway } from "@/components/dashboard/AtomicSwapGateway";
import PostProjectReviewClient from "@/components/dashboard/command-center/PostProjectReviewClient";
import OpenDisputeButton from "@/components/dashboard/command-center/OpenDisputeButton";
import CommitSyncTimeline from "@/components/dashboard/command-center/CommitSyncTimeline";
import ChangeOrderPanel from "@/components/dashboard/command-center/ChangeOrderPanel";
import ProjectActivityLedger from "@/components/dashboard/ProjectActivityLedger";
import { getMilestoneReadiness } from "@/lib/milestone-readiness";
import { getMilestoneProofPlan } from "@/lib/milestone-proof";
import { buildDisputeEvidenceContext } from "@/lib/dispute-evidence";
import { getBYOCTransitionBaseline } from "@/lib/byoc-transition";
import { buildMilestoneEvidencePacket, getProjectEvidenceSourceCoverage } from "@/lib/delivery-evidence";
import { formatReleaseAttestationValue, getReleaseAttestation } from "@/lib/release-attestation";
import { BYOC_DISPUTE_EXCLUSION_MESSAGE, getProjectDisputeEligibility } from "@/lib/dispute-rules";

type LinkedEvidenceSource = {
  id: string;
  type: string;
  label: string;
  url: string | null;
  status: string;
};

function isLinkedEvidenceSource(value: unknown): value is LinkedEvidenceSource {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "type" in value &&
    "label" in value &&
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    typeof value.label === "string"
  );
}

function getSubmittedLinkedEvidenceSources(
  logs: Array<{ action: string; metadata: unknown; created_at: Date }>
) {
  const submissionLog = logs.find((log) => log.action === "MILESTONE_SUBMITTED");
  const metadata = submissionLog?.metadata;
  if (!metadata || typeof metadata !== "object" || !("linked_evidence_sources" in metadata)) return [];
  const sources = metadata.linked_evidence_sources;
  return Array.isArray(sources) ? sources.filter(isLinkedEvidenceSource) : [];
}

function getClientEvidenceReviewHints(sources: LinkedEvidenceSource[]) {
  const hints = new Set<string>();
  if (sources.some((source) => source.type === "VERCEL")) {
    hints.add("Open the deployment link and complete the main workflow as a real user.");
  }
  if (sources.some((source) => source.type === "RAILWAY")) {
    hints.add("Ask the facilitator to open the Railway service URL or logs and show that the backend, worker, or API is running with the expected environment.");
  }
  if (sources.some((source) => source.type === "GITHUB")) {
    hints.add("You do not need to read the code. Confirm the repository or pull request is attached for handoff and future maintenance.");
  }
  if (sources.some((source) => source.type === "SUPABASE")) {
    hints.add("Ask the facilitator to show the migration, sample record, or admin data view that proves the backend change worked.");
  }
  if (sources.some((source) => source.type === "DOMAIN")) {
    hints.add("Visit the domain in a private browser window and confirm the live site, SSL lock, and key pages load correctly.");
  }
  if (sources.some((source) => source.type === "OTHER")) {
    hints.add("Review the linked report, recording, screenshot, or handoff note against the acceptance checks.");
  }
  if (hints.size === 0) {
    hints.add("Open the submitted preview and compare the result against each acceptance check before releasing escrow.");
  }
  hints.add("If anything is unclear, ask for a walkthrough or screenshot before approving payment.");
  return Array.from(hints).slice(0, 5);
}

export default async function ProjectCommandCenter({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab || "war-room";
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      organization: {
        select: {
          members: {
            where: { user_id: user.id },
            select: { role: true },
          },
        },
      },
      milestones: {
        orderBy: { id: "asc" },
        include: {
          facilitator: true,
          audits: { orderBy: { created_at: "desc" }, include: { attachments: true } },
          attachments: { orderBy: { created_at: "desc" } },
          payment_records: { orderBy: { created_at: "desc" } },
          activity_logs: { orderBy: { created_at: "desc" }, take: 8 },
        },
      },
      bids: { include: { developer: true } },
      timeline_events: { orderBy: { timestamp: "desc" } },
      activity_logs: {
        orderBy: { created_at: "desc" },
        take: 12,
        include: { actor: { select: { name: true, email: true, role: true } } },
      },
      evidence_sources: {
        orderBy: { created_at: "desc" },
        include: { created_by: { select: { name: true, email: true, role: true } } },
      },
      disputes: {
        orderBy: { created_at: "desc" },
        include: {
          milestone: { select: { id: true, title: true, status: true } },
          client: { select: { id: true, name: true, email: true } },
          facilitator: { select: { id: true, name: true, email: true } },
          attachments: { orderBy: { created_at: "desc" } },
        },
      },
      change_orders: { orderBy: { added_cost: "desc" } },
    },
  });

  if (!project) notFound();

  const isClientOwner = user.role === "CLIENT" && project.client_id === user.id;
  const isClient =
    user.role === "CLIENT" &&
    (isClientOwner || project.creator_id === user.id || (project.organization?.members.length ?? 0) > 0);
  const isFacilitator =
    user.role === "FACILITATOR" &&
    project.milestones.some((m) => m.facilitator_id === user.id);

  if (!isClient && !isFacilitator) redirect("/dashboard");

  const activeMilestone =
    project.milestones.find((m) => m.status !== "APPROVED_AND_PAID") ||
    project.milestones[0];

  const completedMilestones = project.milestones.filter(
    (m) => m.status === "APPROVED_AND_PAID"
  ).length;
  const totalMilestones = project.milestones.length;
  const progressPercent =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  const isRetainer = project.billing_type === "HOURLY_RETAINER";
  const isHubLocked = isRetainer && !project.github_repo_url;
  const isCompleted = project.status === "COMPLETED";
  const disputeEligibility = getProjectDisputeEligibility({
    status: project.status,
    isByoc: project.is_byoc,
  });
  const totalValue = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
  const transitionBaseline = project.is_byoc ? getBYOCTransitionBaseline(project.ai_generated_sow) : null;
  const transitionBaselineFields = transitionBaseline
    ? [
        ["Mode", transitionBaseline.transitionMode],
        ["Current state", transitionBaseline.currentState],
        ["Prior work/assets", transitionBaseline.priorWork],
        ["Remaining governed work", transitionBaseline.remainingWork],
        ["Known risks", transitionBaseline.knownRisks],
      ].filter((entry): entry is [string, string] => Boolean(entry[1]))
    : [];
  const integrationProject = {
    id: project.id,
    title: project.title,
    status: project.status,
    billing_type: project.billing_type,
    is_byoc: project.is_byoc,
    github_repo_url: project.github_repo_url,
    has_github_token: !!project.github_access_token,
    evidence_sources: project.evidence_sources.map((source) => ({
      id: source.id,
      type: source.type,
      label: source.label,
      url: source.url,
      status: source.status,
      metadata: source.metadata,
      created_at: source.created_at.toISOString(),
      created_by: source.created_by
        ? {
            name: source.created_by.name,
            email: source.created_by.email,
            role: source.created_by.role,
          }
        : null,
    })),
    evidence_source_coverage: getProjectEvidenceSourceCoverage(project.evidence_sources),
    milestone_evidence_packets: project.milestones.map((milestone) => buildMilestoneEvidencePacket(milestone)),
  };
  const submissionEvidenceSources = project.evidence_sources.map((source) => ({
    id: source.id,
    type: source.type,
    label: source.label,
    url: source.url,
    status: source.status,
  }));
  const timelineEvents = project.timeline_events.map((event) => ({
    id: event.id,
    type: event.type,
    timestamp: event.timestamp.toISOString(),
    description: event.description,
    status: event.status,
    author: event.author,
    commitHash: event.commitHash,
  }));
  const changeOrders = project.change_orders.map((order) => ({
    id: order.id,
    description: order.description,
    added_cost: Number(order.added_cost),
    status: order.status,
  }));
  const disputeCases = project.disputes.map((dispute) => ({
    id: dispute.id,
    status: dispute.status,
    reason: dispute.reason,
    createdAt: dispute.created_at,
    milestone: dispute.milestone,
    clientName: dispute.client.name || dispute.client.email,
    facilitatorName: dispute.facilitator.name || dispute.facilitator.email,
    openedByRole: dispute.reason.startsWith("[CODE DOES NOT RUN]")
      ? "Evidence issue"
      : "Dispute case",
    aiReport: dispute.ai_fact_finding_report,
    attachmentCount: dispute.attachments.length,
  }));

  let hasReviewed = false;
  let primaryFacilitator: any = null;

  if (isCompleted && isClientOwner) {
    const fnMilestone = project.milestones.find((m) => m.facilitator);
    primaryFacilitator = fnMilestone?.facilitator;
    if (primaryFacilitator) {
      const reviewCount = await prisma.review.count({
        where: { project_id: id, client_id: user.id, facilitator_id: primaryFacilitator.id },
      });
      hasReviewed = reviewCount > 0;
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };
  const formatAuditTimestamp = (value: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(value);

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    PENDING:               { label: "Awaiting Funding",  color: "text-on-surface-variant bg-surface-container-high border-outline-variant/30",  icon: "hourglass_empty" },
    FUNDED_IN_ESCROW:      { label: "Funded in Escrow",  color: "text-primary bg-primary/10 border-primary/20",                                  icon: "lock" },
    SUBMITTED_FOR_REVIEW:  { label: "In Review",         color: "text-secondary bg-secondary/10 border-secondary/20",                            icon: "rate_review" },
    APPROVED_AND_PAID:     { label: "Completed",         color: "text-tertiary bg-tertiary/10 border-tertiary/20",                               icon: "check_circle" },
    DISPUTED:              { label: "Disputed",          color: "text-error bg-error/10 border-error/20",                                        icon: "gavel" },
  };
  const readinessStatusConfig = {
    complete: { icon: "check_circle", color: "text-tertiary bg-tertiary/10 border-tertiary/20" },
    pending: { icon: "pending", color: "text-on-surface-variant bg-surface-container-high border-outline-variant/30" },
    attention: { icon: "error", color: "text-error bg-error/10 border-error/20" },
  };

  const tabs = [
    { key: "war-room",     label: "Milestones",     icon: "layers" },
    { key: "messages",     label: "Messages",       icon: "chat" },
    { key: "integrations", label: "Evidence & Integrations",   icon: "hub" },
    { key: "contract",     label: "Agreement",      icon: "verified_user" },
  ];

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Compact Project Header ── */}
      <header className="relative z-10 mb-8 px-4 lg:px-0 max-w-[1400px]">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5 text-xs">
          <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors font-bold uppercase tracking-widest flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">arrow_back</span>
            Dashboard
          </Link>
          <span className="text-outline-variant/50">/</span>
          <span className="text-on-surface-variant font-medium truncate max-w-[240px]">{project.title}</span>
        </div>

        {/* Title + Stats Strip */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                isCompleted
                  ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}>
                {isCompleted ? "Completed" : "Active"}
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                #{project.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">·</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                {isClient ? "Client View" : "Facilitator View"}
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
              {project.title}
            </h1>
          </div>

          {/* Stats Strip */}
          <div className="flex items-stretch gap-3 flex-wrap shrink-0">
            {/* Progress */}
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 flex items-center gap-3">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-outline-variant/20" />
                <circle
                  cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" strokeWidth="3"
                  className="text-primary transition-all duration-700"
                  strokeDasharray="100.5"
                  strokeDashoffset={100.5 - (100.5 * progressPercent) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Progress</p>
                <p className="text-lg font-black text-on-surface leading-none">{progressPercent}%</p>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Phases</p>
              <p className="text-lg font-black text-on-surface">{completedMilestones}/{totalMilestones}</p>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Contract Value</p>
              <p className="text-lg font-black text-on-surface">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="flex border-b border-outline-variant/20 mb-8 overflow-x-auto custom-scrollbar px-4 lg:px-0 relative z-10 w-full max-w-[1400px]">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/command-center/${project.id}?tab=${t.key}`}
            className={`px-6 py-3.5 font-bold font-headline uppercase tracking-widest text-xs whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeTab === t.key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {activeTab === "messages" ? (
        <div className="px-4 lg:px-0 relative z-10 max-w-[1400px]">
          <ChatWidget projectId={project.id} currentUserId={user.id} />
        </div>

      ) : activeTab === "integrations" ? (
        <div className="px-4 lg:px-0 relative z-10 w-full max-w-[1400px]">
          <IntegrationsTab project={integrationProject} viewerRole={isFacilitator ? "FACILITATOR" : "CLIENT"} />
        </div>

      ) : activeTab === "contract" ? (
        <div className="px-4 lg:px-0 relative z-10 w-full max-w-3xl space-y-6">
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant/20 pb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <div>
                <h2 className="text-xl font-black font-headline tracking-tight text-on-surface">Untether Service Agreement</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Immutable Contract · {project.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant font-medium leading-relaxed mb-6">
              This agreement binds the Scope of Work between the funding client and executing facilitator. It serves as the source of truth for escrow release and dispute review.
            </p>

            {transitionBaseline && transitionBaselineFields.length > 0 && (
              <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                  <span className="material-symbols-outlined text-[13px]">assignment_turned_in</span>
                  BYOC Transition Baseline
                </p>
                <p className="text-sm font-bold text-on-surface">Governed scope from claim forward</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {transitionBaselineFields.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-primary/15 bg-surface p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-on-surface-variant">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-surface rounded-2xl border border-outline-variant/20 border-l-4 border-l-secondary p-5 mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px]">lock</span> Locked Scope of Work
              </p>
              <p className="text-sm text-on-surface font-medium leading-relaxed whitespace-pre-wrap">{project.ai_generated_sow}</p>
            </div>

            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px]">gavel</span> IP Transfer Clause
              </p>
              <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                The facilitator retains Intellectual Property rights until the client approves the milestone and releases escrow.{" "}
                <strong className="text-on-surface">Upon escrow release, 100% of IP transfers permanently to the client.</strong>{" "}
                Disputes are resolved exclusively against the locked Scope above.
              </p>
            </div>
          </div>
        </div>

      ) : (
        /* ── War Room: Milestones + Timeline ── */
        <div className="px-4 lg:px-0 relative z-10 w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Milestone Timeline */}
          <div className="lg:col-span-2 space-y-3">
            {transitionBaseline && transitionBaselineFields.length > 0 && (
              <section className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                      <span className="material-symbols-outlined text-[14px]">assignment_turned_in</span>
                      BYOC Transition Baseline
                    </p>
                    <h2 className="mt-1 text-lg font-black text-on-surface">Governed scope from claim forward</h2>
                    <p className="mt-2 text-xs font-medium leading-5 text-on-surface-variant">
                      This running project entered Untether through a private delivery packet. Prior work is recorded as context unless it appears inside a funded milestone; payment, evidence, audits, and activity records attach from this accepted packet forward. Platform arbitration remains excluded for BYOC origin agreements.
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/20 bg-surface px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                    <span className="material-symbols-outlined text-[13px]">lock_clock</span>
                    Claim baseline
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {transitionBaselineFields.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-primary/15 bg-surface p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-on-surface-variant">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black font-headline uppercase tracking-widest text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">layers</span>
                Sprint Milestones
              </h2>
              <span className="text-xs text-on-surface-variant font-medium">{completedMilestones} of {totalMilestones} complete</span>
            </div>

            {project.milestones.length === 0 ? (
              <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-3xl p-16 text-center">
                <span className="material-symbols-outlined text-[60px] text-outline-variant/40 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>assignment_late</span>
                <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Milestones Defined</h3>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                  {isClient ? "Add milestones to track progress and manage payments." : "The client will define milestones to track your work."}
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical spine */}
                <div className="absolute left-5 top-6 bottom-6 w-px bg-outline-variant/20 hidden md:block" />

                <div className="space-y-3">
                  {project.milestones.map((milestone, idx) => {
                    const isActive = milestone.id === activeMilestone?.id;
                    const isDone = milestone.status === "APPROVED_AND_PAID";
                    const latestAudit = milestone.audits[0];
                    const latestFunding = milestone.payment_records.find((record) => record.kind === "MILESTONE_FUNDING");
                    const latestRelease = milestone.payment_records.find((record) => record.kind === "ESCROW_RELEASE" && record.status === "SUCCEEDED");
                    const releaseAttestation = getReleaseAttestation(latestRelease?.metadata);
                    const submissionAttachments = milestone.attachments.filter(
                      (attachment) => attachment.purpose === "MILESTONE_SUBMISSION"
                    );
                    const linkedSubmissionSources = getSubmittedLinkedEvidenceSources(milestone.activity_logs);
                    const visibleSubmissionAttachments = milestone.attachments.filter(
                      (attachment) =>
                        attachment.purpose === "MILESTONE_SUBMISSION" &&
                        attachment.url !== milestone.payload_storage_path
                    );
                    const proofPlan = getMilestoneProofPlan(milestone);
                    const disputeReviewContext = buildDisputeEvidenceContext(milestone);
                    const readiness = getMilestoneReadiness({
                      status: milestone.status,
                      acceptanceCriteriaCount: milestone.acceptance_criteria.length,
                      deliverablesCount: milestone.deliverables.length,
                      hasPreviewUrl: Boolean(milestone.live_preview_url),
                      hasPayload: Boolean(milestone.payload_storage_path),
                      submissionAttachmentCount: submissionAttachments.length,
                      latestAudit: latestAudit
                        ? { isPassing: latestAudit.is_passing, score: latestAudit.score }
                        : null,
                      paymentRecords: milestone.payment_records.map((record) => ({
                        kind: record.kind,
                        status: record.status,
                      })),
                    });
                    const cfg = statusConfig[milestone.status] ?? { label: milestone.status, color: "text-on-surface-variant bg-surface-container-high border-outline-variant/20", icon: "circle" };

                    return (
                      <div
                        key={milestone.id}
                        className={`flex gap-4 md:gap-6 items-start rounded-2xl border p-4 md:p-5 transition-all duration-300 ${
                          isDone
                            ? "bg-surface-container-low/30 border-outline-variant/10 opacity-60"
                            : isActive
                            ? "bg-surface border-primary/40 shadow-md shadow-primary/5"
                            : "bg-surface-container-low/20 border-outline-variant/10 opacity-50"
                        }`}
                      >
                        {/* Node */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 z-10 relative ${
                          isDone
                            ? "bg-tertiary/10 border-tertiary/30 text-tertiary"
                            : isActive
                            ? "bg-primary/15 border-primary text-primary"
                            : "bg-surface-container-high border-outline-variant/30 text-on-surface-variant"
                        }`}>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: isDone ? "'FILL' 1" : "'FILL' 0" }}>
                            {isDone ? "check_circle" : isActive ? "pending" : "radio_button_unchecked"}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Phase {idx + 1}</p>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${cfg.color}`}>
                                  <span className="material-symbols-outlined text-[10px]">{cfg.icon}</span>
                                  {cfg.label}
                                </span>
                              </div>
                              <h3 className="font-bold text-on-surface text-base leading-tight">{milestone.title}</h3>
                              {milestone.estimated_duration_days && (
                                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[11px]">schedule</span>
                                  {milestone.estimated_duration_days} days est.
                                </p>
                              )}
                              {latestFunding && (
                                <p className="text-[10px] text-on-surface-variant font-medium mt-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[11px]">payments</span>
                                  Escrow {latestFunding.status.toLowerCase()} · platform fee {formatCurrency(latestFunding.platform_fee_cents / 100)}
                                </p>
                              )}
                              <p className="mt-2 text-xs font-medium text-on-surface-variant">
                                {isClient ? readiness.nextAction.client : readiness.nextAction.facilitator}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-lg font-black text-on-surface">{formatCurrency(Number(milestone.amount))}</p>
                            </div>
                          </div>

                          {(proofPlan.deliverables.length > 0 || proofPlan.reviewChecks.length > 0) && (
                            <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[13px]">rule</span>
                                    Proof Contract
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-on-surface-variant">
                                    {proofPlan.summary}. These are the review terms for approval, audit, and disputes.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {proofPlan.requiredArtifacts.map((artifact) => (
                                    <span
                                      key={artifact.key}
                                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                                        artifact.available
                                          ? "border-tertiary/20 bg-tertiary/10 text-tertiary"
                                          : "border-outline-variant/20 bg-surface text-on-surface-variant"
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[11px]">{artifact.available ? "check_circle" : "radio_button_unchecked"}</span>
                                      {artifact.label}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {proofPlan.deliverables.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Deliverables</p>
                                    <div className="space-y-1.5">
                                      {proofPlan.deliverables.slice(0, 4).map((deliverable) => (
                                        <p key={deliverable} className="flex items-start gap-1.5 text-xs font-medium text-on-surface-variant">
                                          <span className="material-symbols-outlined text-[13px] text-primary mt-0.5">inventory_2</span>
                                          {deliverable}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {proofPlan.reviewChecks.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Acceptance Checks</p>
                                    <div className="space-y-1.5">
                                      {proofPlan.reviewChecks.slice(0, 4).map((check) => (
                                        <p key={check} className="flex items-start gap-1.5 text-xs font-medium text-on-surface-variant">
                                          <span className="material-symbols-outlined text-[13px] text-tertiary mt-0.5">check_circle</span>
                                          {check}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-container-low/30 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[13px]">fact_check</span>
                                  Proof Readiness
                                </p>
                                <p className="mt-1 text-xs font-medium text-on-surface-variant">
                                  Evidence package strength for escrow release and dispute review.
                                </p>
                              </div>
                              <div className="min-w-[120px]">
                                <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                                  <span>Ready</span>
                                  <span>{readiness.score}%</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant/20">
                                  <div
                                    className={`h-full rounded-full ${
                                      readiness.score >= 80
                                        ? "bg-tertiary"
                                        : readiness.score >= 50
                                          ? "bg-secondary"
                                          : "bg-error"
                                    }`}
                                    style={{ width: `${readiness.score}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                              {readiness.items.map((item) => {
                                const itemConfig = readinessStatusConfig[item.status];
                                return (
                                  <div
                                    key={item.key}
                                    className={`rounded-lg border px-3 py-2 ${itemConfig.color}`}
                                  >
                                    <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                                      <span className="material-symbols-outlined text-[12px]">{itemConfig.icon}</span>
                                      {item.label}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium normal-case tracking-normal text-on-surface-variant">
                                      {item.detail}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {latestAudit && (
                            <div className={`mt-4 rounded-xl border p-4 ${
                              latestAudit.is_passing
                                ? "bg-tertiary/5 border-tertiary/20"
                                : "bg-error/5 border-error/20"
                            }`}>
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[13px]">
                                      {latestAudit.is_passing ? "verified" : "report"}
                                    </span>
                                    AI Delivery Audit
                                  </p>
                                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    Generated {formatAuditTimestamp(latestAudit.created_at)} · {latestAudit.provider}/{latestAudit.model}
                                  </p>
                                  <p className="text-sm text-on-surface font-medium mt-1">{latestAudit.summary}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`text-2xl font-black ${latestAudit.is_passing ? "text-tertiary" : "text-error"}`}>
                                    {latestAudit.score}%
                                  </p>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    {latestAudit.is_passing ? "Passed" : "Needs Work"}
                                  </p>
                                </div>
                              </div>
                              {(latestAudit.criteria_met.length > 0 || latestAudit.criteria_missed.length > 0) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-tertiary mb-2">Criteria Met</p>
                                    <ul className="space-y-1">
                                      {latestAudit.criteria_met.slice(0, 4).map((item) => (
                                        <li key={item} className="text-xs text-on-surface-variant flex gap-1.5">
                                          <span className="material-symbols-outlined text-[12px] text-tertiary">check</span>
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-error mb-2">Gaps</p>
                                    <ul className="space-y-1">
                                      {(latestAudit.criteria_missed.length ? latestAudit.criteria_missed : ["No material gaps reported."]).slice(0, 4).map((item) => (
                                        <li key={item} className="text-xs text-on-surface-variant flex gap-1.5">
                                          <span className="material-symbols-outlined text-[12px] text-error">priority_high</span>
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                              {latestAudit.attachments.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Audit Artifacts</p>
                                  <div className="flex flex-wrap gap-2">
                                    {latestAudit.attachments.map((attachment) => (
                                      <a
                                        key={attachment.id}
                                        href={`/api/attachments/${attachment.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex max-w-full items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">link</span>
                                        <span className="truncate">{attachment.name}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {visibleSubmissionAttachments.length > 0 && (
                            <div className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 p-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Submission Evidence</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {visibleSubmissionAttachments.map((attachment) => (
                                  <a
                                    key={attachment.id}
                                    href={`/api/attachments/${attachment.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-w-0 items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-xs font-bold text-on-surface transition-colors hover:border-primary/40"
                                  >
                                    <span className="material-symbols-outlined text-[14px] text-primary">attach_file</span>
                                    <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                                    {attachment.size_bytes && (
                                      <span className="shrink-0 text-[10px] text-on-surface-variant">{formatBytes(attachment.size_bytes)}</span>
                                    )}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {linkedSubmissionSources.length > 0 && (
                            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary">
                                    <span className="material-symbols-outlined text-[13px]">hub</span>
                                    Linked Source Evidence
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-on-surface-variant">
                                    {isClient
                                      ? "These project sources were attached by the facilitator to support this milestone review."
                                      : "These connected sources are part of the proof packet the client will review."}
                                  </p>
                                </div>
                                <Link
                                  href={`/command-center/${project.id}?tab=integrations`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
                                >
                                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                  Evidence tab
                                </Link>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {linkedSubmissionSources.map((source) => (
                                  <a
                                    key={source.id}
                                    href={source.url || `/command-center/${project.id}?tab=integrations`}
                                    target={source.url ? "_blank" : undefined}
                                    rel={source.url ? "noreferrer" : undefined}
                                    className="flex min-w-0 items-start gap-2 rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-xs font-bold text-on-surface transition-colors hover:border-primary/40"
                                  >
                                    <span className="material-symbols-outlined mt-0.5 text-[14px] text-primary">verified</span>
                                    <span className="min-w-0">
                                      <span className="block truncate">{source.label}</span>
                                      <span className="mt-0.5 block text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                                        {source.type.toLowerCase()} · {source.status.toLowerCase().replace(/_/g, " ")}
                                      </span>
                                      {source.url ? (
                                        <span className="mt-1 block truncate text-[10px] font-medium text-primary">{source.url}</span>
                                      ) : null}
                                    </span>
                                  </a>
                                ))}
                              </div>
                              {isClient && (
                                <div className="mt-4 rounded-xl border border-secondary/20 bg-secondary/10 p-4">
                                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-secondary">
                                    <span className="material-symbols-outlined text-[13px]">psychology</span>
                                    Client Review Guide
                                  </p>
                                  <p className="mt-1 text-xs font-medium leading-5 text-on-surface-variant">
                                    You do not need to understand every tool. Use this checklist to decide what to ask, test, or confirm before approving escrow release.
                                  </p>
                                  <div className="mt-3 space-y-1.5">
                                    {getClientEvidenceReviewHints(linkedSubmissionSources).map((hint) => (
                                      <p key={hint} className="flex items-start gap-1.5 text-xs font-medium leading-5 text-on-surface-variant">
                                        <span className="material-symbols-outlined mt-0.5 text-[13px] text-secondary">help</span>
                                        {hint}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {latestRelease && (
                            <div className="mt-4 rounded-xl border border-tertiary/20 bg-tertiary/5 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-tertiary">
                                    <span className="material-symbols-outlined text-[13px]">verified</span>
                                    Buyer Release Attestation
                                  </p>
                                  <p className="mt-1 text-xs font-medium leading-5 text-on-surface-variant">
                                    Escrow was released after buyer approval. This record is retained for payment, audit, and dispute history.
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-on-surface">{formatCurrency(latestRelease.facilitator_payout_cents / 100)}</p>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Facilitator payout</p>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                  { label: "Preview tested", value: releaseAttestation?.testedPreview },
                                  { label: "Evidence reviewed", value: releaseAttestation?.reviewedEvidence },
                                  { label: "Release accepted", value: releaseAttestation?.acceptsPaymentRelease },
                                  { label: "Audit status", value: releaseAttestation?.auditStatus || "Recorded" },
                                ].map(({ label, value }) => (
                                  <div key={label} className="rounded-lg border border-tertiary/15 bg-surface px-3 py-2">
                                    <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-tertiary">
                                      <span className="material-symbols-outlined text-[12px]">
                                        {value === false ? "error" : "check_circle"}
                                      </span>
                                      {label}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium text-on-surface-variant">
                                      {formatReleaseAttestationValue(value)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              {releaseAttestation?.failedAuditOverrideReason && (
                                <p className="mt-3 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2 text-xs font-medium text-on-surface-variant">
                                  Audit override reason: {releaseAttestation.failedAuditOverrideReason}
                                </p>
                              )}
                              <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                                Released {formatAuditTimestamp(latestRelease.created_at)}
                              </p>
                            </div>
                          )}

                          {/* Gateway Actions */}
                          {isActive && !isDone && (
                            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-outline-variant/10">
                              {isClientOwner && milestone.status === "PENDING" && (
                                <ClientFundGateway milestoneId={milestone.id} amount={Number(milestone.amount)} isByoc={project.is_byoc} />
                                )}
                                {isFacilitator && !isHubLocked && milestone.status === "FUNDED_IN_ESCROW" && (
                                  <FacilitatorSubmitGateway
                                    milestoneId={milestone.id}
                                    proofPlan={proofPlan}
                                    evidenceSources={submissionEvidenceSources}
                                  />
                                )}
                              {isClientOwner && milestone.status === "SUBMITTED_FOR_REVIEW" && milestone.live_preview_url && (() => {
                                let auditStatus: "PENDING" | "SUCCESS" | "FAILED" | "NONE" = "PENDING";
                                if (latestAudit) {
                                  auditStatus = latestAudit.is_passing ? "SUCCESS" : "FAILED";
                                } else {
                                  auditStatus = "PENDING";
                                }
                                return (
                                  <ClientReviewGateway
                                    milestoneId={milestone.id}
                                    previewUrl={milestone.live_preview_url}
                                    amount={Number(milestone.amount)}
                                    isByoc={project.is_byoc}
                                    aiAuditStatus={auditStatus}
                                  />
                                );
                              })()}
                              {isClientOwner && milestone.status === "APPROVED_AND_PAID" && milestone.payload_storage_path && (
                                <a
                                  href={`/api/stripe/download-payload?id=${milestone.id}`}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-bold uppercase tracking-widest hover:border-primary/40 transition-all w-fit"
                                >
                                  <span className="material-symbols-outlined text-[15px]">download</span>
                                  Download Source
                                </a>
                              )}
                              {isClient && !isCompleted && disputeEligibility.eligible && (
                                <OpenDisputeButton
                                  projectId={project.id}
                                  milestoneId={milestone.id}
                                  reviewContext={disputeReviewContext}
                                  label="Open Dispute"
                                />
                              )}
                              {isFacilitator && !isCompleted && disputeEligibility.eligible && (
                                <OpenDisputeButton
                                  projectId={project.id}
                                  milestoneId={milestone.id}
                                  reviewContext={disputeReviewContext}
                                  label="Raise Dispute"
                                />
                              )}
                              {isClient && milestone.status === "FUNDED_IN_ESCROW" && (
                                <p className="text-[10px] font-bold text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg uppercase tracking-widest flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[12px] animate-pulse">hourglass_top</span>
                                  Awaiting facilitator submission
                                </p>
                              )}
                              {isFacilitator && milestone.status === "SUBMITTED_FOR_REVIEW" && (
                                <p className="text-[10px] font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg uppercase tracking-widest border border-primary/20 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[12px]">visibility</span>
                                  Client reviewing staging...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completion Banner */}
            {isCompleted && (
              <div className="mt-6 bg-tertiary/10 border border-tertiary/30 rounded-3xl p-8 text-center">
                <span className="material-symbols-outlined text-5xl text-tertiary mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <h3 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight mb-1">Project Complete</h3>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto">All milestones approved and funds released.</p>
                {isClientOwner && primaryFacilitator && !hasReviewed && (
                  <PostProjectReviewClient
                    projectId={project.id}
                    facilitatorId={primaryFacilitator.id}
                    facilitatorName={primaryFacilitator.name || "Facilitator"}
                    facilitatorAvatar={primaryFacilitator.image || undefined}
                  />
                )}
              </div>
            )}

            {/* GitHub Warning */}
            {isFacilitator && isHubLocked && (
              <div className="mt-4 bg-error/10 border border-error/30 rounded-2xl p-6 flex items-center gap-4">
                <span className="material-symbols-outlined text-3xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>shield_locked</span>
                <div className="flex-1">
                  <h3 className="font-black text-error text-base uppercase tracking-tight">GitHub Required</h3>
                  <p className="text-sm text-error/80 leading-relaxed">Connect a repository to unlock submission.</p>
                </div>
                <Link href={`/command-center/${project.id}?tab=integrations`} className="shrink-0 bg-error text-on-error font-bold px-5 py-2.5 rounded-xl uppercase tracking-widest text-xs hover:opacity-90 transition-all">
                  Connect
                </Link>
              </div>
            )}

            {(isClientOwner || isFacilitator) && (
              <ChangeOrderPanel
                projectId={project.id}
                role={isClientOwner ? "CLIENT" : "FACILITATOR"}
                changeOrders={changeOrders}
              />
            )}
          </div>

          {/* Right: Timeline */}
          <div className="lg:col-span-1 space-y-6">
            {disputeCases.length > 0 && (
              <section className="rounded-2xl border border-error/20 bg-error/5 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-error">
                      <span className="material-symbols-outlined text-[14px]">gavel</span>
                      Dispute Case
                    </p>
                    <h2 className="mt-1 text-base font-black text-on-surface">Exception Review</h2>
                  </div>
                  <span className="rounded-lg border border-error/20 bg-surface px-2 py-1 text-[10px] font-black uppercase tracking-widest text-error">
                    {disputeCases[0].status.toLowerCase().replaceAll("_", " ")}
                  </span>
                </div>

                <div className="space-y-3">
                  {disputeCases.slice(0, 3).map((dispute) => (
                    <div key={dispute.id} className="rounded-xl border border-outline-variant/20 bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-on-surface">{dispute.milestone.title}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            {formatAuditTimestamp(dispute.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-outline-variant/20 bg-surface-container-low px-2 py-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                          {dispute.attachmentCount} files
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-xs font-medium leading-5 text-on-surface-variant">
                        {dispute.reason}
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        <p>Client: <span className="normal-case tracking-normal text-on-surface">{dispute.clientName}</span></p>
                        <p>Facilitator: <span className="normal-case tracking-normal text-on-surface">{dispute.facilitatorName}</span></p>
                      </div>
                      {dispute.aiReport ? (
                        <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-primary">AI fact finding ready</p>
                          <p className="mt-1 line-clamp-3 text-xs font-medium leading-5 text-on-surface-variant">
                            {dispute.aiReport}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          AI fact finding pending
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {project.is_byoc && (
              <section className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-secondary">
                  <span className="material-symbols-outlined text-[14px]">policy</span>
                  BYOC Governance
                </p>
                <h2 className="mt-1 text-base font-black text-on-surface">Arbitration Excluded</h2>
                <p className="mt-2 text-xs font-medium leading-5 text-on-surface-variant">
                  {BYOC_DISPUTE_EXCLUSION_MESSAGE} Evidence, escrow, milestone status, and audit records still remain available for the parties to review directly.
                </p>
              </section>
            )}
            <CommitSyncTimeline events={timelineEvents} />
            <ProjectActivityLedger logs={project.activity_logs} />
          </div>
        </div>
      )}
    </main>
  );
}
