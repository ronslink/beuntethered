import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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

// ──────────────────────────────────────────────
// FACILITATOR DASHBOARD
// ──────────────────────────────────────────────
async function FacilitatorDashboard({ userId, userName }: { userId: string; userName: string }) {
  const projects = await prisma.project.findMany({
    where: { milestones: { some: { facilitator_id: userId } } },
    include: { client: true, milestones: { orderBy: { id: "asc" } } },
    orderBy: { created_at: "desc" },
  });

  const activeProjects = projects.filter(p => p.status === "ACTIVE");
  const allMilestones = projects.flatMap(p => p.milestones.map(m => ({ ...m, project: p })));
  const funded = allMilestones.filter(m => m.status === "FUNDED_IN_ESCROW");
  const inReview = allMilestones.filter(m => m.status === "SUBMITTED_FOR_REVIEW");
  const totalEarned = allMilestones
    .filter(m => m.status === "APPROVED_AND_PAID")
    .reduce((acc, m) => acc + Number(m.amount), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const actionItems = allMilestones.filter(m =>
    m.status === "FUNDED_IN_ESCROW" || m.status === "DISPUTED"
  );

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 mb-8 px-4 lg:px-0">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Developer Dashboard</p>
            <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
              Good to see you, {userName}
            </h1>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/marketplace" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[15px]">storefront</span>
              Browse Deals
            </Link>
            <Link href="/wallet" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-black uppercase tracking-widest hover:border-primary/40 transition-all">
              <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
              Wallet
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Active Projects",      value: activeProjects.length,  icon: "rocket_launch",     color: "text-primary" },
            { label: "Ready to Build",       value: funded.length,          icon: "lock_open",         color: "text-tertiary" },
            { label: "Awaiting Review",      value: inReview.length,        icon: "rate_review",       color: "text-secondary" },
            { label: "Total Earned",         value: formatCurrency(totalEarned), icon: "payments",    color: "text-on-surface" },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 flex items-center gap-3">
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
        <div className="relative z-10 bg-surface-container-low/40 border border-outline-variant/20 rounded-3xl p-16 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[64px] text-outline-variant/40 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>handshake</span>
          <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Active Contracts</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto mb-6">Browse the marketplace to find open projects and submit proposals.</p>
          <Link href="/marketplace" className="px-8 py-3 rounded-xl bg-primary text-on-primary font-black uppercase tracking-widest text-xs hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20">
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

            {projects.map((project, idx) => {
              const progress = project.milestones.length === 0 ? 0
                : Math.round((project.milestones.filter(m => m.status === "APPROVED_AND_PAID").length / project.milestones.length) * 100);
              const cfg = PROJECT_STATUS_CONFIG[project.status] ?? { label: project.status, dot: "bg-outline-variant" };
              const value = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);

              return (
                <Link
                  key={project.id}
                  href={`/command-center/${project.id}`}
                  className="flex items-center gap-4 bg-surface border border-outline-variant/20 rounded-2xl px-4 py-3.5 hover:border-primary/40 hover:bg-surface-container-low/40 transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
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
          </section>

          {/* Action Sidebar */}
          <aside className="xl:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[16px]">notifications_active</span>
                Needs Attention
              </h2>
            </div>

            <div className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
              {actionItems.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <span className="material-symbols-outlined text-[40px] text-outline-variant/40 mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                  <p className="text-sm font-bold text-on-surface">All clear!</p>
                  <p className="text-xs text-on-surface-variant mt-1">No immediate actions needed.</p>
                </div>
              ) : (
                actionItems.map((item, idx) => (
                  <Link
                    key={item.id}
                    href={`/command-center/${item.project.id}`}
                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container-low/50 transition-colors group ${idx !== 0 ? "border-t border-outline-variant/10" : ""}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${item.status === "DISPUTED" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {item.status === "DISPUTED" ? "gavel" : "build"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium truncate">{item.project.title}</p>
                    </div>
                    <span className="material-symbols-outlined text-[14px] text-outline-variant group-hover:text-primary transition-colors shrink-0">arrow_forward</span>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

// ──────────────────────────────────────────────
// CLIENT DASHBOARD
// ──────────────────────────────────────────────
async function ClientDashboard({ userId, userName }: { userId: string; userName: string }) {
  const projects = await prisma.project.findMany({
    where: { client_id: userId },
    include: { milestones: { orderBy: { id: "asc" } } },
    orderBy: { created_at: "desc" },
  });

  const activeProjects = projects.filter(p => p.status === "ACTIVE");
  const openBidding = projects.filter(p => p.status === "OPEN_BIDDING");
  const allMilestones = projects.flatMap(p => p.milestones.map(m => ({ ...m, project: p })));
  const pendingReview = allMilestones.filter(m => m.status === "SUBMITTED_FOR_REVIEW");
  const pendingFunding = allMilestones.filter(m => m.status === "PENDING");
  const totalSpend = allMilestones
    .filter(m => m.status === "APPROVED_AND_PAID")
    .reduce((acc, m) => acc + Number(m.amount), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  // All action items — things the client needs to do
  const actionItems = [
    ...pendingReview.map(m => ({ ...m, actionType: "review" as const })),
    ...pendingFunding.map(m => ({ ...m, actionType: "fund" as const })),
  ];

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 mb-8 px-4 lg:px-0">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Client Dashboard</p>
            <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
              Good to see you, {userName}
            </h1>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/projects/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[15px]">add</span>
              Post Project
            </Link>
            <Link href="/talent" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-black uppercase tracking-widest hover:border-primary/40 transition-all">
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
            <div key={stat.label} className="bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 flex items-center gap-3">
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
        <div className="relative z-10 bg-surface-container-low/40 border border-outline-variant/20 rounded-3xl p-16 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[64px] text-outline-variant/40 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>add_home_work</span>
          <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Projects Yet</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto mb-6">Post your first project and start your first Escrow-protected engagement.</p>
          <Link href="/projects/new" className="px-8 py-3 rounded-xl bg-primary text-on-primary font-black uppercase tracking-widest text-xs hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20">
            Post Your First Project
          </Link>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 px-4 lg:px-0">

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
                  className="flex items-center gap-4 bg-surface border border-outline-variant/20 rounded-2xl px-4 py-3.5 hover:border-primary/40 hover:bg-surface-container-low/40 transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
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
                Needs Your Action
              </h2>
              {actionItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-[10px] font-black">
                  {actionItems.length}
                </span>
              )}
            </div>

            <div className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
              {actionItems.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <span className="material-symbols-outlined text-[40px] text-outline-variant/40 mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                  <p className="text-sm font-bold text-on-surface">All caught up!</p>
                  <p className="text-xs text-on-surface-variant mt-1">No milestones need your review right now.</p>
                </div>
              ) : (
                actionItems.map((item, idx) => (
                  <Link
                    key={item.id}
                    href={`/command-center/${item.project.id}`}
                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container-low/50 transition-colors group ${idx !== 0 ? "border-t border-outline-variant/10" : ""}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${item.actionType === "review" ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {item.actionType === "review" ? "rate_review" : "lock"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        {item.actionType === "review" ? "Ready to Review" : "Needs Funding"}
                      </p>
                      <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">{item.title}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{item.project.title}</p>
                    </div>
                    <span className="material-symbols-outlined text-[14px] text-outline-variant group-hover:text-primary transition-colors shrink-0">arrow_forward</span>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

// ──────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────
export default async function ExpertDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  const firstName = user.name?.split(" ")[0] || "there";

  if (user.role === "FACILITATOR") {
    return <FacilitatorDashboard userId={user.id} userName={firstName} />;
  }

  return <ClientDashboard userId={user.id} userName={firstName} />;
}
