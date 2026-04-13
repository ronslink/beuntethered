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
      milestones: {
        orderBy: { id: "asc" },
        include: { facilitator: true },
      },
      bids: { include: { developer: true } },
      timeline_events: { orderBy: { timestamp: "desc" } },
      change_orders: { orderBy: { added_cost: "desc" } },
    },
  });

  if (!project) notFound();

  const isClient = user.role === "CLIENT" && project.client_id === user.id;
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
  const totalValue = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);

  let hasReviewed = false;
  let primaryFacilitator: any = null;

  if (isCompleted && isClient) {
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

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    PENDING:               { label: "Awaiting Funding",  color: "text-on-surface-variant bg-surface-container-high border-outline-variant/30",  icon: "hourglass_empty" },
    FUNDED_IN_ESCROW:      { label: "Funded in Escrow",  color: "text-primary bg-primary/10 border-primary/20",                                  icon: "lock" },
    SUBMITTED_FOR_REVIEW:  { label: "In Review",         color: "text-secondary bg-secondary/10 border-secondary/20",                            icon: "rate_review" },
    APPROVED_AND_PAID:     { label: "Completed",         color: "text-tertiary bg-tertiary/10 border-tertiary/20",                               icon: "check_circle" },
    DISPUTED:              { label: "Disputed",          color: "text-error bg-error/10 border-error/20",                                        icon: "gavel" },
  };

  const tabs = [
    { key: "war-room",     label: "Milestones",     icon: "layers" },
    { key: "messages",     label: "Messages",       icon: "chat" },
    { key: "integrations", label: "Integrations",   icon: "hub" },
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
                {isClient ? "Client View" : "Developer View"}
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
        <div className="px-4 lg:px-0 relative z-10 w-full max-w-4xl">
          <IntegrationsTab project={{ ...project, has_github_token: !!project.github_access_token, github_access_token: undefined }} />
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
              This agreement binds the Scope of Work between the funding Client and executing Developer. It serves as the sole reference for Escrow distribution and dispute arbitration.
            </p>

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
                The Developer retains all Intellectual Property rights until the Client triggers the Atomic Swap approval.{" "}
                <strong className="text-on-surface">Upon Escrow release, 100% of IP transfers permanently to the Client.</strong>{" "}
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
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-lg font-black text-on-surface">{formatCurrency(Number(milestone.amount))}</p>
                            </div>
                          </div>

                          {/* Gateway Actions */}
                          {isActive && !isDone && (
                            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-outline-variant/10">
                              {isClient && milestone.status === "PENDING" && (
                                <ClientFundGateway milestoneId={milestone.id} amount={Number(milestone.amount)} />
                              )}
                              {isFacilitator && !isHubLocked && milestone.status === "FUNDED_IN_ESCROW" && (
                                <FacilitatorSubmitGateway milestoneId={milestone.id} />
                              )}
                              {isClient && milestone.status === "SUBMITTED_FOR_REVIEW" && milestone.live_preview_url && (
                                <ClientReviewGateway milestoneId={milestone.id} previewUrl={milestone.live_preview_url} />
                              )}
                              {isClient && milestone.status === "APPROVED_AND_PAID" && milestone.payload_storage_path && (
                                <a
                                  href={`/api/stripe/download-payload?id=${milestone.id}`}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-bold uppercase tracking-widest hover:border-primary/40 transition-all w-fit"
                                >
                                  <span className="material-symbols-outlined text-[15px]">download</span>
                                  Download Source
                                </a>
                              )}
                              {isClient && !isCompleted && project.status !== "DISPUTED" && (
                                <OpenDisputeButton projectId={project.id} />
                              )}
                              {isClient && milestone.status === "FUNDED_IN_ESCROW" && (
                                <p className="text-[10px] font-bold text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-lg uppercase tracking-widest flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[12px] animate-pulse">hourglass_top</span>
                                  Awaiting developer submission
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
                {isClient && primaryFacilitator && !hasReviewed && (
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

            <ChangeOrderPanel
              projectId={project.id}
              role={isClient ? "CLIENT" : "FACILITATOR"}
              changeOrders={project.change_orders}
            />
          </div>

          {/* Right: Timeline */}
          <div className="lg:col-span-1">
            <CommitSyncTimeline events={project.timeline_events as any} />
          </div>
        </div>
      )}
    </main>
  );
}
