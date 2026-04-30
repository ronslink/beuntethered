import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

const severityStyles = {
  INFO: "border-outline-variant/20 bg-surface-container-low text-on-surface-variant",
  REVIEW: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  BLOCK: "border-error/25 bg-error/10 text-error",
} as const;

const eventLabels: Record<string, string> = {
  PROJECT_POSTED: "Project Posted",
  DUPLICATE_SCOPE_REVIEW: "Duplicate Scope Review",
  BID_SUBMITTED: "Bid Submitted",
  SELF_DEALING_REVIEW: "Self-Dealing Review",
  AWARD_REVIEW: "Award Review",
};

export default async function AdminRiskPage() {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const [reviewSignals, severityCounts, eventCounts] = await Promise.all([
    prisma.accountRiskSignal.findMany({
      where: { severity: { in: ["REVIEW", "BLOCK"] } },
      include: {
        user: { select: { name: true, email: true, role: true } },
        project: { select: { id: true, title: true, status: true } },
        bid: { select: { id: true, proposed_amount: true, estimated_days: true, status: true } },
      },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
    prisma.accountRiskSignal.groupBy({
      by: ["severity"],
      _count: { _all: true },
    }),
    prisma.accountRiskSignal.groupBy({
      by: ["event_type"],
      _count: { _all: true },
    }),
  ]);

  const severitySummary = Object.fromEntries(
    severityCounts.map((row) => [row.severity, row._count._all])
  ) as Partial<Record<"INFO" | "REVIEW" | "BLOCK", number>>;
  const eventSummary = Object.fromEntries(
    eventCounts.map((row) => [row.event_type, row._count._all])
  ) as Partial<Record<string, number>>;

  return (
    <main className="min-h-full bg-background px-4 py-6 pb-20 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
            <span className="material-symbols-outlined text-[15px] text-primary">policy</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Admin only</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface lg:text-4xl">
            Trust Risk Review
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-on-surface-variant">
            Review duplicate-scope and self-dealing signals. Similar ideas are allowed by default; this queue only promotes linked risk patterns.
          </p>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-3">
          <Metric label="Info signals" value={String(severitySummary.INFO ?? 0)} icon="info" />
          <Metric label="Needs review" value={String(severitySummary.REVIEW ?? 0)} icon="rate_review" />
          <Metric label="Blocked signals" value={String(severitySummary.BLOCK ?? 0)} icon="block" />
        </section>

        <section className="mb-6 rounded-xl border border-outline-variant/20 bg-surface p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Signal Mix</h2>
              <p className="mt-1 text-xs font-medium text-on-surface-variant">
                Event counts across project posting, duplicate detection, bids, and award review.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Object.entries(eventLabels).map(([event, label]) => (
              <div key={event} className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
                <p className="mt-2 text-2xl font-black text-on-surface">{eventSummary[event] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-outline-variant/20 bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/10 px-5 py-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Review Queue</h2>
              <p className="mt-1 text-xs font-medium text-on-surface-variant">
                Items here should be investigated before award or payment release if the pattern remains linked.
              </p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              {reviewSignals.length} items
            </span>
          </div>

          {reviewSignals.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-[48px] text-outline-variant">task_alt</span>
              <h3 className="text-lg font-black text-on-surface">No linked risk patterns pending</h3>
              <p className="mt-2 text-sm font-medium text-on-surface-variant">
                Similar project ideas with no linked signals stay out of the review queue.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {reviewSignals.map((signal) => (
                <RiskSignalRow key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
        <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-on-surface">{value}</p>
    </div>
  );
}

function RiskSignalRow({
  signal,
}: {
  signal: Awaited<ReturnType<typeof prisma.accountRiskSignal.findMany>>[number] & {
    user: { name: string | null; email: string | null; role: string };
    project: { id: string; title: string; status: string } | null;
    bid: { id: string; proposed_amount: unknown; estimated_days: number; status: string } | null;
  };
}) {
  const metadata = signal.metadata && typeof signal.metadata === "object" && !Array.isArray(signal.metadata)
    ? signal.metadata as Record<string, unknown>
    : {};
  const linkedSignals = Array.isArray(metadata.linked_signals) ? metadata.linked_signals : [];
  const similarity = typeof metadata.similarity === "number" ? `${Math.round(metadata.similarity * 100)}%` : null;

  return (
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-[230px_1fr_220px]">
      <div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${severityStyles[signal.severity]}`}>
          {signal.severity}
        </span>
        <p className="mt-3 text-sm font-black text-on-surface">{eventLabels[signal.event_type] ?? signal.event_type}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {signal.created_at.toLocaleString()}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium leading-relaxed text-on-surface-variant">{signal.reason}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {linkedSignals.map((item) => (
            <span key={String(item)} className="rounded-md border border-outline-variant/20 bg-surface-container-low px-2 py-1 text-[10px] font-bold text-on-surface-variant">
              {String(item).replaceAll("_", " ")}
            </span>
          ))}
          {similarity && (
            <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-700">
              {similarity} similar
            </span>
          )}
        </div>
        <p className="mt-3 text-xs font-medium text-on-surface-variant">
          Actor: {signal.user.name ?? signal.user.email ?? "Unknown"} · {signal.user.role.toLowerCase()}
        </p>
      </div>

      <div className="space-y-2">
        {signal.project ? (
          <Link
            href={`/projects/${signal.project.id}`}
            className="block rounded-lg border border-outline-variant/20 bg-surface-container-low p-3 transition-colors hover:border-primary/40"
          >
            <p className="truncate text-xs font-black text-on-surface">{signal.project.title}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{signal.project.status}</p>
          </Link>
        ) : (
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3 text-xs font-bold text-on-surface-variant">
            No project link
          </div>
        )}

        {signal.bid && (
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Bid</p>
            <p className="mt-1 text-xs font-bold text-on-surface">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(signal.bid.proposed_amount))}
              {" "}· {signal.bid.estimated_days} days
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
