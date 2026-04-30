import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buyerProjectListWhere } from "@/lib/project-access";
import ProjectActivityLedger from "@/components/dashboard/ProjectActivityLedger";

function timeAgo(date: Date | string | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const PROJECT_STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  OPEN_BIDDING:  { label: "Open Bidding",  dot: "bg-tertiary" },
  ACTIVE:        { label: "Active",        dot: "bg-primary animate-pulse" },
  COMPLETED:     { label: "Completed",     dot: "bg-outline-variant" },
  DISPUTED:      { label: "Disputed",      dot: "bg-secondary animate-pulse" },
  DRAFT:         { label: "Draft",         dot: "bg-outline-variant/50" },
  CANCELLED:     { label: "Cancelled",     dot: "bg-outline-variant/30" },
};

type InviteErrorCode = "client_account_required" | "wrong_client_email" | "already_claimed";
type DashboardRole = "CLIENT" | "FACILITATOR";

function getInviteErrorCopy(inviteError?: string, role?: DashboardRole) {
  if (inviteError === "client_account_required") {
    return {
      title: "Client account required",
      body: "This private invite is for a buyer workspace. Sign in with a client account or create one before claiming the delivery packet.",
      href: "/register?role=client",
      action: "Create Client Account",
    };
  }

  if (inviteError === "wrong_client_email") {
    if (role === "FACILITATOR") {
      return {
        title: "Client account required",
        body: "You are signed in as a facilitator. BYOC invite links are claimed by the buyer/client account that will fund and approve the project.",
        href: "/byoc/new",
        action: "Back to BYOC",
      };
    }

    return {
      title: "Invite email mismatch",
      body: "This private delivery packet is locked to the client email selected by the facilitator. Sign in with that email or ask the facilitator to issue a new invite.",
      href: "/settings",
      action: "Review Account",
    };
  }

  if (inviteError === "already_claimed") {
    return {
      title: "Invite already claimed",
      body: "This private delivery packet has already been claimed or moved into a buyer workspace. Open your projects or ask the facilitator for a fresh invite if this looks wrong.",
      href: "/projects",
      action: "Review Projects",
    };
  }

  return null;
}

function InviteErrorBanner({ inviteError, role }: { inviteError?: string; role?: DashboardRole }) {
  const copy = getInviteErrorCopy(inviteError, role);
  if (!copy) return null;

  return (
    <section className="mb-6 rounded-lg border border-secondary/25 bg-secondary/10 p-4 text-on-surface">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
            <span className="material-symbols-outlined text-[18px]">lock_person</span>
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-secondary">{copy.title}</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">{copy.body}</p>
          </div>
        </div>
        <Link
          href={copy.href}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90"
        >
          {copy.action}
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// FACILITATOR DASHBOARD
// ──────────────────────────────────────────────
async function FacilitatorDashboard({ userId, userName, inviteError }: { userId: string; userName: string; inviteError?: string }) {
  const projects = await prisma.project.findMany({
    where: { milestones: { some: { facilitator_id: userId } } },
    include: { client: true, milestones: { orderBy: { id: "asc" } } },
    orderBy: { created_at: "desc" },
  });
  const proposalPipeline = await prisma.bid.findMany({
    where: {
      developer_id: userId,
      status: { in: ["PENDING", "SHORTLISTED", "UNDER_NEGOTIATION"] },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true,
        },
      },
    },
    orderBy: { updated_at: "desc" },
    take: 6,
  });
  const invitedOpportunities = await prisma.projectInvite.findMany({
    where: {
      facilitator_id: userId,
      status: { in: ["SENT", "VIEWED", "ACCEPTED"] },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: 6,
  });
  const recentActivityLogs = await prisma.activityLog.findMany({
    where: {
      project: { milestones: { some: { facilitator_id: userId } } },
    },
    include: {
      actor: { select: { name: true, email: true, role: true } },
      project: { select: { id: true, title: true, status: true } },
    },
    orderBy: { created_at: "desc" },
    take: 6,
  });

  const activeProjects = projects.filter(p => p.status === "ACTIVE");
  const allMilestones = projects.flatMap(p => p.milestones.map(m => ({ ...m, project: p })));
  const totalEarned = allMilestones
    .filter(m => m.status === "APPROVED_AND_PAID")
    .reduce((acc, m) => acc + Number(m.amount), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const actionItems = allMilestones.filter(m =>
    m.status === "FUNDED_IN_ESCROW" || m.status === "DISPUTED"
  );
  const openInvites = invitedOpportunities.filter(invite => invite.status === "SENT" || invite.status === "VIEWED");
  const acceptedInvites = invitedOpportunities.filter(invite => invite.status === "ACCEPTED");
  const dashboardHasWork = projects.length > 0 || proposalPipeline.length > 0 || invitedOpportunities.length > 0;
  const facilitatorQueue = [
    ...openInvites.map(invite => ({
      key: `invite-${invite.id}`,
      href: `/marketplace/project/${invite.project.id}`,
      icon: "forward_to_inbox",
      iconBg: "bg-primary/10 text-primary",
      label: "Invited opportunity",
      title: invite.project.title,
      detail: `Status: ${invite.status.toLowerCase()}`,
      count: null as number | null,
    })),
    ...proposalPipeline.map(bid => ({
      key: `bid-${bid.id}`,
      href: `/marketplace/project/${bid.project.id}`,
      icon: bid.status === "UNDER_NEGOTIATION" ? "sync_alt" : "assignment",
      iconBg: bid.status === "UNDER_NEGOTIATION" ? "bg-secondary/10 text-secondary" : "bg-tertiary/10 text-tertiary",
      label: bid.status === "UNDER_NEGOTIATION" ? "Negotiation active" : "Proposal submitted",
      title: bid.project.title,
      detail: `Proposal: ${bid.status.toLowerCase().replaceAll("_", " ")}`,
      count: null as number | null,
    })),
    ...actionItems.map(item => ({
      key: `milestone-${item.id}`,
      href: `/command-center/${item.project.id}`,
      icon: item.status === "DISPUTED" ? "gavel" : "build",
      iconBg: item.status === "DISPUTED" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary",
      label: item.status === "DISPUTED" ? "Resolve dispute" : "Submit delivery evidence",
      title: item.title,
      detail: item.project.title,
      count: null as number | null,
    })),
  ].slice(0, 8);

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
      <InviteErrorBanner inviteError={inviteError} role="FACILITATOR" />
      {/* ── Header ── */}
      <header className="relative z-10 mb-8 px-4 lg:px-0">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Facilitator Dashboard</p>
            <h1 className="text-2xl lg:text-3xl font-semibold font-headline tracking-tight text-on-surface">
              Good to see you, {userName}
            </h1>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/marketplace" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[15px]">storefront</span>
              Browse Opportunities
            </Link>
            <Link href="/wallet" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-black uppercase tracking-widest hover:border-primary/40 transition-all">
              <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
              Wallet
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Active Projects",      value: activeProjects.length,  icon: "rocket_launch",     color: "text-primary" },
            { label: "Invites",              value: openInvites.length,     icon: "forward_to_inbox",  color: "text-tertiary" },
            { label: "Active Proposals",     value: proposalPipeline.length + acceptedInvites.length, icon: "assignment", color: "text-secondary" },
            { label: "Total Earned",         value: formatCurrency(totalEarned), icon: "payments",    color: "text-on-surface" },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-3 flex items-center gap-3">
              <span className={`material-symbols-outlined text-[20px] shrink-0 ${stat.color}`}>{stat.icon}</span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{stat.label}</p>
                <p className="text-lg font-black text-on-surface leading-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {!dashboardHasWork ? (
        <div className="relative z-10 bg-surface border border-outline-variant/20 rounded-lg p-16 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[64px] text-outline-variant/40 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>handshake</span>
          <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Active Opportunities</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto mb-6">Browse verified software delivery opportunities and submit AI-assisted proposals.</p>
          <Link href="/marketplace" className="px-8 py-3 rounded-lg bg-primary text-on-primary font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all">
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 px-4 lg:px-0">

          {/* Project List */}
          <section className="xl:col-span-8 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">folder_open</span>
                My Projects
              </h2>
              <span className="text-[10px] text-on-surface-variant font-medium">{projects.length} total</span>
            </div>

            {projects.length === 0 ? (
              <div className="bg-surface border border-outline-variant/20 rounded-lg p-8 text-center">
                <p className="text-sm font-bold text-on-surface">No won contracts yet.</p>
                <p className="mt-1 text-xs font-medium text-on-surface-variant">Your invitations and proposals are tracked below until work is awarded.</p>
              </div>
            ) : projects.map((project, idx) => {
              const progress = project.milestones.length === 0 ? 0
                : Math.round((project.milestones.filter(m => m.status === "APPROVED_AND_PAID").length / project.milestones.length) * 100);
              const cfg = PROJECT_STATUS_CONFIG[project.status] ?? { label: project.status, dot: "bg-outline-variant" };
              const value = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);

              return (
                <Link
                  key={project.id}
                  href={project.status === "OPEN_BIDDING" ? `/projects/${project.id}` : `/command-center/${project.id}`}
                  className="flex items-center gap-4 bg-surface border border-outline-variant/20 rounded-lg px-4 py-3.5 hover:border-primary/40 hover:bg-surface-container-low/40 transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
                >
                  {/* Status Dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors truncate">{project.title}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-2 mt-0.5">
                      <span>{cfg.label}</span>
                      <span className="opacity-40">·</span>
                      <span>{project.client?.name || "Client"}</span>
                      <span className="opacity-40">·</span>
                      <span>{timeAgo(project.created_at)}</span>
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    <div className="w-24 bg-surface-container-high rounded-full h-1 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant w-8 text-right">{progress}%</span>
                  </div>

                  {/* Value */}
                  <p className="text-sm font-black text-on-surface shrink-0 hidden sm:block">{formatCurrency(value)}</p>

                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors text-[16px] shrink-0">arrow_forward</span>
                </Link>
              );
            })}

            {(invitedOpportunities.length > 0 || proposalPipeline.length > 0) && (
              <div className="pt-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[16px]">assignment</span>
                    Opportunity Pipeline
                  </h2>
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    {invitedOpportunities.length + proposalPipeline.length} active
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {invitedOpportunities.map(invite => (
                    <Link
                      key={invite.id}
                      href={`/marketplace/project/${invite.project.id}`}
                      className="rounded-lg border border-outline-variant/20 bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-low"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Client Invite</p>
                        <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                          {invite.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="truncate text-sm font-bold text-on-surface">{invite.project.title}</p>
                      <p className="mt-1 text-[10px] font-medium text-on-surface-variant">{timeAgo(invite.created_at)}</p>
                    </Link>
                  ))}
                  {proposalPipeline.map(bid => (
                    <Link
                      key={bid.id}
                      href={`/marketplace/project/${bid.project.id}`}
                      className="rounded-lg border border-outline-variant/20 bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-low"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">Proposal</p>
                        <span className="rounded-md border border-tertiary/20 bg-tertiary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-tertiary">
                          {bid.status.toLowerCase().replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="truncate text-sm font-bold text-on-surface">{bid.project.title}</p>
                      <p className="mt-1 text-[10px] font-medium text-on-surface-variant">{formatCurrency(Number(bid.proposed_amount))} · {bid.estimated_days} days</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Action Sidebar */}
          <aside className="xl:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[16px]">notifications_active</span>
                Needs Attention
              </h2>
            </div>

            <div className="bg-surface border border-outline-variant/20 rounded-lg overflow-hidden">
              {facilitatorQueue.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <span className="material-symbols-outlined text-[40px] text-outline-variant/40 mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                  <p className="text-sm font-bold text-on-surface">All clear!</p>
                  <p className="text-xs text-on-surface-variant mt-1">No immediate actions needed.</p>
                </div>
              ) : (
                facilitatorQueue.map((item, idx) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container-low/50 transition-colors group ${idx !== 0 ? "border-t border-outline-variant/10" : ""}`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${item.iconBg}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{item.label}</p>
                      <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium truncate">{item.detail}</p>
                    </div>
                    <span className="material-symbols-outlined text-[14px] text-outline-variant group-hover:text-primary transition-colors shrink-0">arrow_forward</span>
                  </Link>
                ))
              )}
            </div>

            <ProjectActivityLedger
              logs={recentActivityLogs}
              eyebrow="Audit Activity"
              title="Recent Trust Events"
              description="Logged changes across your active delivery work."
              emptyMessage="No recent audit events for your projects."
            />
          </aside>
        </div>
      )}
    </main>
  );
}

// ──────────────────────────────────────────────
// CLIENT DASHBOARD
// ──────────────────────────────────────────────
async function ClientDashboard({ userId, userName, inviteError }: { userId: string; userName: string; inviteError?: string }) {
  const projects = await prisma.project.findMany({
    where: buyerProjectListWhere(userId),
    include: {
      milestones: { orderBy: { id: "asc" } },
      bids: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
    orderBy: { created_at: "desc" },
  });
  const recentActivityLogs = await prisma.activityLog.findMany({
    where: { project: buyerProjectListWhere(userId) },
    include: {
      actor: { select: { name: true, email: true, role: true } },
      project: { select: { id: true, title: true, status: true } },
    },
    orderBy: { created_at: "desc" },
    take: 6,
  });

  const activeProjects = projects.filter(p => p.status === "ACTIVE");
  const openBidding = projects.filter(p => p.status === "OPEN_BIDDING");
  const allMilestones = projects.flatMap(p => p.milestones.map(m => ({ ...m, project: p })));
  const pendingReview = allMilestones.filter(m => m.status === "SUBMITTED_FOR_REVIEW");
  const pendingFunding = allMilestones.filter(m => m.project.status === "ACTIVE" && m.status === "PENDING");
  const disputedMilestones = allMilestones.filter(m => m.status === "DISPUTED" || m.project.status === "DISPUTED");
  const totalSpend = allMilestones
    .filter(m => m.status === "APPROVED_AND_PAID")
    .reduce((acc, m) => acc + Number(m.amount), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  // All action items: bids to decide, submitted work to review, or active milestones to fund.
  const projectsNeedingFunding = activeProjects.filter(
    p => p.milestones.some(m => m.status === "PENDING")
  );
  const projectsWithBids = projects.filter(
    p => p.status === "OPEN_BIDDING" && p.bids.length > 0
  );

  const actionItems = [
    // Incoming bids — highest priority
    ...projectsWithBids.map(p => ({ project: p, actionType: "bids" as const, count: p.bids.length })),
    // Milestones submitted for review
    ...pendingReview.map(m => ({ project: m.project, milestone: m, actionType: "review" as const, count: 1 })),
    // Active projects with unfunded milestones, collapsed per project.
    ...projectsNeedingFunding.slice(0, 3).map(p => ({
      project: p, actionType: "fund" as const, count: pendingFunding.filter(m => m.project.id === p.id).length
    })),
  ];
  const queueCards = [
    {
      label: "Proposal Decisions",
      value: projectsWithBids.reduce((count, project) => count + project.bids.length, 0),
      body: "Compare bids, shortlist, negotiate, or award verified facilitators.",
      href: projectsWithBids[0] ? `/projects/${projectsWithBids[0].id}` : "/projects",
      icon: "gavel",
      tone: "text-primary bg-primary/10 border-primary/20",
    },
    {
      label: "Escrow Funding",
      value: pendingFunding.length,
      body: "Fund pending milestones before work begins.",
      href: projectsNeedingFunding[0] ? `/command-center/${projectsNeedingFunding[0].id}` : "/wallet",
      icon: "account_balance",
      tone: "text-tertiary bg-tertiary/10 border-tertiary/20",
    },
    {
      label: "Delivery Review",
      value: pendingReview.length,
      body: "Review submitted proof, audit evidence, and release readiness.",
      href: pendingReview[0] ? `/command-center/${pendingReview[0].project.id}` : "/command-center",
      icon: "fact_check",
      tone: "text-secondary bg-secondary/10 border-secondary/20",
    },
    {
      label: "Disputes",
      value: disputedMilestones.length,
      body: "Track exception handling and arbitration evidence.",
      href: disputedMilestones[0] ? `/command-center/${disputedMilestones[0].project.id}` : "/admin/disputes",
      icon: "gavel",
      tone: "text-error bg-error/10 border-error/20",
    },
  ];

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
      <InviteErrorBanner inviteError={inviteError} role="CLIENT" />
      {/* ── Header ── */}
      <header className="relative z-10 mb-8 px-4 lg:px-0">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Client Dashboard</p>
            <h1 className="text-2xl lg:text-3xl font-semibold font-headline tracking-tight text-on-surface">
              Good to see you, {userName}
            </h1>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/projects/new" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[15px]">add</span>
              Post Project
            </Link>
            <Link href="/talent" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-black uppercase tracking-widest hover:border-primary/40 transition-all">
              <span className="material-symbols-outlined text-[15px]">person_search</span>
              Browse Talent
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Active Projects",    value: activeProjects.length,    icon: "rocket_launch",   color: "text-primary" },
            { label: "Collecting Bids",    value: openBidding.length,       icon: "gavel",           color: "text-tertiary" },
            { label: "Awaiting Review",    value: pendingReview.length,     icon: "rate_review",     color: "text-secondary" },
            { label: "Total Deployed",     value: formatCurrency(totalSpend), icon: "payments",      color: "text-on-surface" },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-3 flex items-center gap-3">
              <span className={`material-symbols-outlined text-[20px] shrink-0 ${stat.color}`}>{stat.icon}</span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{stat.label}</p>
                <p className="text-lg font-black text-on-surface leading-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="relative z-10 bg-surface border border-outline-variant/20 rounded-lg p-16 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[64px] text-outline-variant/40 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>add_home_work</span>
          <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Projects Yet</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto mb-6">Post your first project and start your first Escrow-protected engagement.</p>
          <Link href="/projects/new" className="px-8 py-3 rounded-lg bg-primary text-on-primary font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all">
            Post Your First Project
          </Link>
        </div>
      ) : (
        <div className="relative z-10 space-y-6 px-4 lg:px-0">
          <section className="rounded-lg border border-outline-variant/20 bg-surface p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Operational Queue</p>
                <h2 className="mt-1 text-lg font-black font-headline uppercase tracking-tight text-on-surface">
                  Buyer Control Center
                </h2>
              </div>
              <p className="max-w-xl text-xs font-medium leading-relaxed text-on-surface-variant">
                Live decision counts for proposals, escrow funding, delivery reviews, and exceptions.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {queueCards.map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className="group rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-high"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${card.tone}`}>
                      <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
                    </span>
                    <span className="text-2xl font-black text-on-surface">{card.value}</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">
                    {card.label}
                  </p>
                  <p className="mt-2 min-h-10 text-xs font-medium leading-5 text-on-surface-variant">
                    {card.body}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
                    Open queue
                    <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Project List */}
          <section className="xl:col-span-8 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">folder_open</span>
                Your Projects
              </h2>
              <span className="text-[10px] text-on-surface-variant font-medium">{projects.length} total</span>
            </div>

            {projects.map((project, idx) => {
              const progress = project.milestones.length === 0 ? 0
                : Math.round((project.milestones.filter(m => m.status === "APPROVED_AND_PAID").length / project.milestones.length) * 100);
              const cfg = PROJECT_STATUS_CONFIG[project.status] ?? { label: project.status, dot: "bg-outline-variant" };
              const value = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
              const href = project.status === "ACTIVE"
                ? `/command-center/${project.id}`
                : `/projects/${project.id}`;

              return (
                <Link
                  key={project.id}
                  href={href}
                  className="flex items-center gap-4 bg-surface border border-outline-variant/20 rounded-lg px-4 py-3.5 hover:border-primary/40 hover:bg-surface-container-low/40 transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors truncate">{project.title}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-2 mt-0.5">
                      <span>{cfg.label}</span>
                      <span className="opacity-40">·</span>
                      <span>{project.milestones.length} milestone{project.milestones.length !== 1 ? "s" : ""}</span>
                      <span className="opacity-40">·</span>
                      <span>{timeAgo(project.created_at)}</span>
                    </p>
                  </div>

                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    <div className="w-24 bg-surface-container-high rounded-full h-1 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant w-8 text-right">{progress}%</span>
                  </div>

                  <p className="text-sm font-black text-on-surface shrink-0 hidden sm:block">{formatCurrency(value)}</p>

                  <span className="material-symbols-outlined text-[16px] text-outline-variant group-hover:text-primary transition-colors shrink-0">arrow_forward</span>
                </Link>
              );
            })}
          </section>

          {/* Action Feed Sidebar */}
          <aside className="xl:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[16px]">notifications_active</span>
                Needs Team Action
              </h2>
              {actionItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/20 text-[10px] font-black">
                  {actionItems.length}
                </span>
              )}
            </div>

            <div className="bg-surface border border-outline-variant/20 rounded-lg overflow-hidden">
              {actionItems.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <span className="material-symbols-outlined text-[40px] text-outline-variant/40 mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                  <p className="text-sm font-bold text-on-surface">All caught up!</p>
                  <p className="text-xs text-on-surface-variant mt-1">No milestones need your review right now.</p>
                </div>
              ) : (
                actionItems.map((item, idx) => {
                  const href = item.actionType === "bids"
                    ? `/projects/${item.project.id}`
                    : `/command-center/${item.project.id}`;
                  const icon = item.actionType === "bids" ? "gavel" : item.actionType === "review" ? "rate_review" : "lock";
                  const iconBg = item.actionType === "bids" ? "bg-primary/10 text-primary" : item.actionType === "review" ? "bg-secondary/10 text-secondary" : "bg-tertiary/10 text-tertiary";
                  const label = item.actionType === "bids" ? "New Bids Received" : item.actionType === "review" ? "Ready to Review" : "Awaiting Escrow Funding";
                  const subtitle = item.actionType === "review" && "milestone" in item
                    ? (item as any).milestone.title
                    : item.project.title;

                  return (
                    <Link
                      key={`${item.actionType}-${item.project.id}`}
                      href={href}
                      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container-low/50 transition-colors group ${idx !== 0 ? "border-t border-outline-variant/10" : ""}`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>
                        <span className="material-symbols-outlined text-[14px]">{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
                        <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">{subtitle}</p>
                        {item.actionType !== "review" && (
                          <p className="text-[10px] text-on-surface-variant truncate">{item.project.title}</p>
                        )}
                      </div>
                      {item.count > 1 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${item.actionType === "bids" ? "bg-primary/10 text-primary border-primary/20" : "bg-tertiary/10 text-tertiary border-tertiary/20"}`}>
                          {item.count}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-[14px] text-outline-variant group-hover:text-primary transition-colors shrink-0">arrow_forward</span>
                    </Link>
                  );
                })
              )}
            </div>

            <ProjectActivityLedger
              logs={recentActivityLogs}
              eyebrow="Audit Activity"
              title="Recent Trust Events"
              description="Workspace and delivery actions recorded from the durable project ledger."
              emptyMessage="No recent audit events for your workspace."
            />
          </aside>
        </div>
        </div>
      )}
    </main>
  );
}

// ──────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────
export default async function ExpertDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ invite_error?: InviteErrorCode }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  const firstName = user.name?.split(" ")[0] || "there";
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const inviteError = resolvedSearchParams.invite_error;

  if (user.role === "FACILITATOR") {
    return <FacilitatorDashboard userId={user.id} userName={firstName} inviteError={inviteError} />;
  }

  return <ClientDashboard userId={user.id} userName={firstName} inviteError={inviteError} />;
}
