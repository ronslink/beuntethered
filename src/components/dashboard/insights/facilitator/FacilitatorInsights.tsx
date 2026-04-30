"use client";

import Link from "next/link";

type DisputeQueueItem = {
  id: string;
  projectId: string;
  projectTitle: string;
  milestoneTitle: string;
  milestoneStatus: string;
  clientName: string | null;
  reason: string;
  createdAt: string;
};

export default function FacilitatorInsights({
  trustScore,
  totalSprints,
  revenueData,
  activeMilestones,
  reviewMilestones,
  pendingInvites,
  activeBids,
  auditedMilestones,
  auditPassRate,
  durableAuditScore,
  disputedMilestones,
  disputeQueue = [],
}: {
  trustScore: number;
  totalSprints: number;
  revenueData: { name: string; revenue: number }[];
  activeMilestones: number;
  reviewMilestones: number;
  pendingInvites: number;
  activeBids: number;
  auditedMilestones: number;
  auditPassRate: number;
  durableAuditScore: number;
  disputedMilestones: number;
  disputeQueue?: DisputeQueueItem[];
}) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
  const totalRevenue = revenueData.reduce((acc, row) => acc + row.revenue, 0);
  const maxRevenue = Math.max(...revenueData.map((row) => row.revenue), 1);
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-on-surface lg:px-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="mb-3 inline-flex rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-tertiary">
              Facilitator insights
            </span>
            <h1 className="font-headline text-3xl font-black tracking-tight lg:text-4xl">Delivery Performance Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-on-surface-variant">
              Monitor trust, audit quality, active delivery workload, proposal momentum, and cleared earnings.
            </p>
          </div>

          <div className="rounded-2xl border border-outline-variant/30 bg-surface px-5 py-4 text-right shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">6-month cleared earnings</p>
            <p className="mt-1 text-3xl font-black text-on-surface">{formatCurrency(totalRevenue)}</p>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Trust Score" value={`${trustScore.toFixed(0)}/100`} icon="local_police" tone="primary" />
          <Metric label="Completed Milestones" value={String(totalSprints)} icon="verified" tone="tertiary" />
          <Metric label="Average Audit" value={durableAuditScore ? `${durableAuditScore.toFixed(0)}%` : "Pending"} icon="fact_check" tone="primary" />
          <Metric label="Active Bids" value={String(activeBids)} icon="contract_edit" tone="tertiary" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Cleared Earnings Trend</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Revenue recognized after approved and paid milestones.</p>
              </div>
            </div>

            <div className="grid h-80 grid-cols-6 items-end gap-3">
              {revenueData.map((row) => {
                const pct = Math.max(4, Math.round((row.revenue / maxRevenue) * 100));
                return (
                  <div key={row.name} className="flex h-full flex-col justify-end gap-2">
                    <div className="flex flex-1 items-end rounded-xl bg-surface-container-low p-1">
                      <div
                        className="w-full rounded-lg bg-tertiary transition-all"
                        style={{ height: `${pct}%` }}
                        title={`${row.name}: ${formatCurrency(row.revenue)}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{row.name}</p>
                      <p className="text-xs font-bold text-on-surface">{formatCurrency(row.revenue)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Work Queue</h2>
              <div className="mt-5 space-y-3">
                <QueueRow icon="workspaces" label="Active milestones" value={activeMilestones} />
                <QueueRow icon="rate_review" label="Submitted for review" value={reviewMilestones} />
                <QueueRow icon="outgoing_mail" label="Pending invites" value={pendingInvites} />
                <QueueRow icon="gavel" label="Disputed milestones" value={disputedMilestones} />
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Dispute Desk</h2>
                  <p className="mt-1 text-xs font-medium leading-5 text-on-surface-variant">
                    Open exceptions that need evidence, response, or arbitration awareness.
                  </p>
                </div>
                {disputeQueue.length > 0 && (
                  <span className="rounded-lg border border-error/20 bg-error/10 px-2 py-1 text-[10px] font-black text-error">
                    {disputeQueue.length}
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {disputeQueue.length === 0 ? (
                  <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-5 text-center">
                    <span className="material-symbols-outlined text-[28px] text-outline-variant">task_alt</span>
                    <p className="mt-2 text-sm font-bold text-on-surface">No open disputes</p>
                    <p className="mt-1 text-xs font-medium text-on-surface-variant">
                      New dispute notices will appear here and in notifications.
                    </p>
                  </div>
                ) : (
                  disputeQueue.map((dispute) => (
                    <Link
                      key={dispute.id}
                      href={`/command-center/${dispute.projectId}`}
                      className="group block rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 transition-colors hover:border-error/40 hover:bg-surface-container-high"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-on-surface group-hover:text-error">
                          {dispute.milestoneTitle}
                        </p>
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-error">
                          {formatDate(dispute.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-on-surface-variant">
                        {dispute.projectTitle}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-on-surface-variant">
                        {dispute.reason}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="truncate text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          {dispute.clientName ? `Client: ${dispute.clientName}` : "Client dispute"}
                        </span>
                        <span className="material-symbols-outlined text-[15px] text-outline-variant transition-colors group-hover:text-error">
                          arrow_forward
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Trust Position</h2>
              <div className="mt-5 space-y-4">
                <Progress label="Trust score" value={trustScore} />
                <Progress label="Audit quality" value={durableAuditScore} />
                <Progress label="Audit pass rate" value={auditPassRate} />
              </div>
              <p className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-xs font-medium leading-5 text-on-surface-variant">
                {auditedMilestones > 0
                  ? `${auditedMilestones} milestone audit${auditedMilestones === 1 ? "" : "s"} are backing this score.`
                  : "No durable milestone audits yet. Complete audited milestones to strengthen buyer trust."}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
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

function QueueRow({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[18px] text-tertiary">{icon}</span>
        <p className="text-sm font-bold text-on-surface">{label}</p>
      </div>
      <span className="text-lg font-black text-on-surface">{value}</span>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
        <p className="text-sm font-black text-on-surface">{Math.round(value)}%</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full rounded-full bg-tertiary" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
