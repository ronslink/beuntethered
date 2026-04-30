import Link from "next/link";
import {
  getActivityLabel,
  getActivityMetadata,
  getActorScopeLabel,
  getActivityEvidenceDetails,
  getProjectActivityHref,
  isWorkspaceAdminActivity,
} from "@/lib/activity-display";

type ActivityActor = {
  name: string | null;
  email: string | null;
  role: string | null;
};

type ActivityProject = {
  id: string;
  title: string | null;
  status: string | null;
};

export type ProjectActivityLedgerEntry = {
  id: string;
  action: string;
  entity_type: string;
  created_at: Date | string;
  metadata: unknown;
  actor?: ActivityActor | null;
  project?: ActivityProject | null;
  href?: string | null;
};

type ProjectActivityLedgerProps = {
  logs: ProjectActivityLedgerEntry[];
  eyebrow?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  layout?: "stack" | "grid";
};

function timeAgo(date: Date | string | null): string {
  if (!date) return "Unknown";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function ProjectActivityLedger({
  logs,
  eyebrow = "Audit Ledger",
  title = "Recent Project Actions",
  description = "Project actions with actor authority context.",
  emptyMessage = "No audit events recorded yet.",
  layout = "stack",
}: ProjectActivityLedgerProps) {
  const listClassName = layout === "grid" ? "grid gap-3 md:grid-cols-2" : "space-y-3";

  return (
    <section className="bg-surface border border-outline-variant/20 rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-black font-headline uppercase tracking-tight text-on-surface">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs font-medium text-on-surface-variant">{description}</p>
          )}
        </div>
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">fact_check</span>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-5 text-sm font-medium text-on-surface-variant">
          {emptyMessage}
        </div>
      ) : (
        <div className={listClassName}>
          {logs.map((log) => {
            const metadata = getActivityMetadata(log.metadata);
            const actorName = log.actor?.name || log.actor?.email || "System";
            const scopeLabel = getActorScopeLabel(metadata, log.actor?.role);
            const evidenceDetails = getActivityEvidenceDetails(metadata);
            const isAdminAction = isWorkspaceAdminActivity(metadata);
            const href = log.href ?? (log.project ? getProjectActivityHref(log.project) : null);
            const content = (
              <>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-on-surface">
                      {getActivityLabel(log.action, metadata)}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-medium text-on-surface-variant">
                      {actorName} - {scopeLabel}
                    </p>
                    {log.project?.title && (
                      <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">
                        {log.project.title}
                      </p>
                    )}
                    {evidenceDetails.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {evidenceDetails.slice(0, 4).map((detail) => (
                          <span
                            key={`${detail.label}-${detail.value}`}
                            className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                              detail.tone === "positive"
                                ? "border-tertiary/20 bg-tertiary/10 text-tertiary"
                                : detail.tone === "attention"
                                  ? "border-secondary/20 bg-secondary/10 text-secondary"
                                  : "border-outline-variant/25 bg-surface text-on-surface-variant"
                            }`}
                          >
                            {detail.label}: {detail.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isAdminAction && (
                    <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
                      Admin
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <span>{log.entity_type}</span>
                  <span>{timeAgo(log.created_at)}</span>
                </div>
              </>
            );

            return href ? (
              <Link
                key={log.id}
                href={href}
                className="block rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-high"
              >
                {content}
              </Link>
            ) : (
              <div key={log.id} className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
