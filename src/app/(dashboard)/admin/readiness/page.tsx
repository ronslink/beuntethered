import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { buildPlatformReadinessReport, type ReadinessStatus } from "@/lib/platform-readiness";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

const statusStyles: Record<ReadinessStatus, { badge: string; icon: string; label: string }> = {
  READY: {
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
    icon: "check_circle",
    label: "Ready",
  },
  WARNING: {
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-700",
    icon: "warning",
    label: "Warning",
  },
  BLOCKED: {
    badge: "border-error/25 bg-error/10 text-error",
    icon: "error",
    label: "Blocked",
  },
};

export default async function AdminReadinessPage() {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const report = buildPlatformReadinessReport();
  const grouped = report.checks.reduce<Record<string, typeof report.checks>>((acc, check) => {
    acc[check.area] = acc[check.area] ?? [];
    acc[check.area].push(check);
    return acc;
  }, {});

  return (
    <main className="min-h-full bg-background px-4 py-6 pb-20 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
            <span className="material-symbols-outlined text-[15px] text-primary">health_and_safety</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Admin only</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-on-surface lg:text-4xl">
                Launch Readiness
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-on-surface-variant">
                Configuration checks for trust, payment, AI, notification, attachment, and integration workflows.
              </p>
            </div>
            <StatusBadge status={report.overallStatus} />
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-3">
          <Metric label="Ready" value={String(report.summary.READY)} status="READY" />
          <Metric label="Warnings" value={String(report.summary.WARNING)} status="WARNING" />
          <Metric label="Blocked" value={String(report.summary.BLOCKED)} status="BLOCKED" />
        </section>

        <section className="space-y-4">
          {Object.entries(grouped).map(([area, checks]) => (
            <div key={area} className="rounded-xl border border-outline-variant/20 bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-outline-variant/10 px-5 py-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">{area}</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {checks.length} checks
                </span>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {checks.map((check) => (
                  <div key={check.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[220px_130px_1fr]">
                    <div>
                      <p className="text-sm font-black text-on-surface">{check.label}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{check.id}</p>
                    </div>
                    <div>
                      <StatusBadge status={check.status} compact />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-relaxed text-on-surface-variant">{check.detail}</p>
                      {check.remediation && check.status !== "READY" && (
                        <p className="mt-2 text-xs font-bold leading-relaxed text-on-surface">
                          {check.remediation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <p className="mt-6 text-xs font-medium text-on-surface-variant">
          Generated {new Date(report.generatedAt).toLocaleString()} from server environment only.
        </p>
      </div>
    </main>
  );
}

function StatusBadge({ status, compact = false }: { status: ReadinessStatus; compact?: boolean }) {
  const style = statusStyles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${style.badge}`}>
      <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
      {compact ? style.label : `Overall ${style.label}`}
    </span>
  );
}

function Metric({ label, value, status }: { label: string; value: string; status: ReadinessStatus }) {
  const style = statusStyles[status];
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface p-4 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-black text-on-surface">{value}</p>
        <span className={`material-symbols-outlined text-[22px] ${style.badge.split(" ").at(-1)}`}>{style.icon}</span>
      </div>
    </div>
  );
}
