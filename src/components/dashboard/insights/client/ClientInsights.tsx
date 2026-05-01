"use client";

import Link from "next/link";

type BuyerActionCard = {
  label: string;
  value: number;
  body: string;
  href: string;
  icon: string;
};

type BuyerProjectHealth = {
  id: string;
  title: string;
  status: string;
  totalValue: number;
  bidCount: number;
  pendingFundingCount: number;
  fundedCount: number;
  reviewCount: number;
  paidCount: number;
  disputedCount: number;
  latestAuditScore: number | null;
  facilitatorNames: string[];
  href: string;
};

export default function ClientInsights({
  totalSpend,
  activeExposure,
  totalSprintClears,
  projectCount,
  activeProjectCount,
  openProjectCount,
  fundedMilestones,
  pendingMilestones,
  reviewMilestones,
  disputedMilestones,
  facilitatorCount,
  auditedMilestones,
  auditPassRate,
  durableAvgAuditScore,
  actionCards,
  projectHealth,
}: {
  totalSpend: number;
  activeExposure: number;
  totalSprintClears: number;
  projectCount: number;
  activeProjectCount: number;
  openProjectCount: number;
  fundedMilestones: number;
  pendingMilestones: number;
  reviewMilestones: number;
  disputedMilestones: number;
  facilitatorCount: number;
  auditedMilestones: number;
  auditPassRate: number;
  durableAvgAuditScore: number;
  actionCards: BuyerActionCard[];
  projectHealth: BuyerProjectHealth[];
}) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const completedSpend = Math.max(totalSpend - activeExposure, 0);
  const activeShare = totalSpend > 0 ? Math.round((activeExposure / totalSpend) * 100) : 0;
  const closedShare = totalSpend > 0 ? Math.max(0, 100 - activeShare) : 0;

  const actionQueue = [
    {
      label: "Milestones awaiting funding",
      value: pendingMilestones,
      icon: "account_balance_wallet",
      href: projectHealth.find((project) => project.pendingFundingCount > 0)?.href ?? "/wallet",
    },
    {
      label: "Milestones funded in escrow",
      value: fundedMilestones,
      icon: "lock",
      href: projectHealth.find((project) => project.fundedCount > 0)?.href ?? "/wallet",
    },
    {
      label: "Milestones awaiting review",
      value: reviewMilestones,
      icon: "rate_review",
      href: projectHealth.find((project) => project.reviewCount > 0)?.href ?? "/dashboard",
    },
    {
      label: "Milestones in dispute",
      value: disputedMilestones,
      icon: "gavel",
      href: projectHealth.find((project) => project.disputedCount > 0)?.href ?? "/insights",
    },
    {
      label: "Open projects accepting proposals",
      value: openProjectCount,
      icon: "campaign",
      href: "/projects",
    },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-on-surface lg:px-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="mb-3 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              Buyer insights
            </span>
            <h1 className="font-headline text-3xl font-black tracking-tight lg:text-4xl">Delivery Control Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-on-surface-variant">
              Track committed spend, escrow exposure, milestone progress, facilitator quality, and buyer-side next actions.
            </p>
          </div>

          <div className="rounded-2xl border border-outline-variant/30 bg-surface px-5 py-4 text-right shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total committed value</p>
            <p className="mt-1 text-3xl font-black text-on-surface">{formatCurrency(totalSpend)}</p>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active Projects" value={String(activeProjectCount)} icon="workspaces" tone="primary" />
          <Metric label="Completed Milestones" value={String(totalSprintClears)} icon="verified" tone="tertiary" />
          <Metric label="Facilitators Engaged" value={String(facilitatorCount)} icon="groups" tone="primary" />
          <Metric label="Avg Audit Quality" value={durableAvgAuditScore ? `${Math.round(durableAvgAuditScore)}%` : "Pending"} icon="fact_check" tone="tertiary" />
        </section>

        <section className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Buyer Operations</p>
              <h2 className="mt-1 text-sm font-black uppercase tracking-widest text-on-surface">Action Radar</h2>
            </div>
            <Link href="/projects" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
              Open projects
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {actionCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-high"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="material-symbols-outlined text-[20px] text-primary">{card.icon}</span>
                  <p className="text-2xl font-black text-on-surface">{card.value}</p>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">{card.label}</p>
                <p className="mt-2 min-h-12 text-xs font-medium leading-5 text-on-surface-variant">{card.body}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
                  Review
                  <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Escrow And Delivery Mix</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Committed value split between active project exposure and closed delivery.</p>
              </div>
              <span className="rounded-full border border-outline-variant/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {projectCount} projects
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-[280px_1fr] md:items-center">
              <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Capital mix</p>
                <div className="mt-5 overflow-hidden rounded-full bg-surface-container-high">
                  <div className="flex h-5 w-full">
                    <div className="bg-primary" style={{ width: `${activeShare}%` }} />
                    <div className="bg-tertiary" style={{ width: `${closedShare}%` }} />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Active</p>
                    <p className="text-2xl font-black text-primary">{activeShare}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Closed</p>
                    <p className="text-2xl font-black text-tertiary">{closedShare}%</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <SpendRow label="Active exposure" value={activeExposure} color="bg-primary" />
                <SpendRow label="Closed delivery" value={completedSpend} color="bg-tertiary" />
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Interpretation</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-on-surface-variant">
                    Keep active exposure visible so buyers know what is funded, what is pending, and what still needs review before release.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Action Queue</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Buyer-side operational signals for today.</p>
            <div className="mt-5 space-y-3">
              {actionQueue.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 transition-colors hover:border-primary/40 hover:bg-surface-container-high"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px] text-primary">{item.icon}</span>
                    <p className="text-sm font-bold text-on-surface">{item.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-on-surface">{item.value}</span>
                    <span className="material-symbols-outlined text-[15px] text-outline-variant transition-colors group-hover:text-primary">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Project Health</p>
              <h2 className="mt-1 text-sm font-black uppercase tracking-widest text-on-surface">Priority Workspaces</h2>
            </div>
            <p className="max-w-xl text-xs font-medium leading-5 text-on-surface-variant">
              Projects are ranked by disputes, review work, funding needs, proposals, and funded delivery exposure.
            </p>
          </div>

          {projectHealth.length === 0 ? (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-6 text-center">
              <p className="text-sm font-bold text-on-surface">No project health data yet.</p>
              <p className="mt-1 text-xs font-medium text-on-surface-variant">Post a project or claim a BYOC packet to start building your delivery ledger.</p>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {projectHealth.map((project) => (
                <Link
                  key={project.id}
                  href={project.href}
                  className="group rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-high"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-black text-on-surface group-hover:text-primary">{project.title}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {project.status.toLowerCase().replaceAll("_", " ")} · {formatCurrency(project.totalValue)}
                      </p>
                    </div>
                    {project.latestAuditScore !== null && (
                      <span className="shrink-0 rounded-lg border border-tertiary/20 bg-tertiary/10 px-2 py-1 text-[10px] font-black text-tertiary">
                        {project.latestAuditScore}% audit
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <HealthPill label="Bids" value={project.bidCount} />
                    <HealthPill label="Fund" value={project.pendingFundingCount} />
                    <HealthPill label="Escrow" value={project.fundedCount} />
                    <HealthPill label="Review" value={project.reviewCount} />
                    <HealthPill label="Issues" value={project.disputedCount} attention={project.disputedCount > 0} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {project.facilitatorNames.length > 0 ? project.facilitatorNames.join(", ") : `${project.paidCount} paid milestone${project.paidCount === 1 ? "" : "s"}`}
                    </p>
                    <span className="material-symbols-outlined text-[15px] text-outline-variant transition-colors group-hover:text-primary">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Audit-Backed Delivery Evidence</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Latest durable milestone audits across your workspace.</p>
              </div>
              <span className="rounded-full border border-outline-variant/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {auditedMilestones} audited
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <EvidenceMetric label="Pass rate" value={auditedMilestones ? `${auditPassRate}%` : "Pending"} icon="verified_user" testId="audit-pass-rate" />
              <EvidenceMetric label="Average score" value={durableAvgAuditScore ? `${Math.round(durableAvgAuditScore)}%` : "Pending"} icon="fact_check" testId="audit-average-score" />
              <EvidenceMetric label="Disputes" value={String(disputedMilestones)} icon="gavel" testId="audit-disputes" />
            </div>
          </div>

          <aside className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Trust Interpretation</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">
              Durable audit records are the strongest proof that a milestone was reviewed against acceptance criteria.
              Use pass rate and disputes together: high pass rate with low disputes means delivery quality is trending safely.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}

function HealthPill({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${attention ? "border-error/20 bg-error/10" : "border-outline-variant/25 bg-surface"}`}>
      <p className={`text-lg font-black ${attention ? "text-error" : "text-on-surface"}`}>{value}</p>
      <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: string; tone: "primary" | "tertiary" }) {
  const color = tone === "primary" ? "text-primary bg-primary/10 border-primary/20" : "text-tertiary bg-tertiary/10 border-tertiary/20";
  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-sm">
      <span className={`material-symbols-outlined mb-4 inline-flex rounded-xl border p-2 text-[20px] ${color}`}>{icon}</span>
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 text-2xl font-black text-on-surface">{value}</p>
    </div>
  );
}

function EvidenceMetric({ label, value, icon, testId }: { label: string; value: string; icon: string; testId?: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4" data-testid={testId}>
      <span className="material-symbols-outlined mb-3 text-[20px] text-primary">{icon}</span>
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 text-2xl font-black text-on-surface">{value}</p>
    </div>
  );
}

function SpendRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <p className="text-sm font-bold text-on-surface">{label}</p>
        </div>
        <p className="font-black text-on-surface">
          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)}
        </p>
      </div>
    </div>
  );
}
