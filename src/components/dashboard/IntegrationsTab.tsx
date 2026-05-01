"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { linkProjectRepository, saveProjectEvidenceSource, verifyProjectEvidenceSource } from "@/app/actions/integrations";
import EvidenceProviderMark from "@/components/evidence/EvidenceProviderMark";
import type {
  EvidenceSourceStatusValue,
  EvidenceSourceSummary,
  EvidenceSourceTypeValue,
} from "@/lib/delivery-evidence";
import {
  evaluateEvidenceSourceVerification,
  getEvidenceSystemCheckSummary,
  getEvidenceVerificationProfile,
  getVerificationModeLabel,
  type EvidenceSystemCheckResult,
  type EvidenceSourceVerificationResult,
  type EvidenceVerificationStage,
} from "@/lib/evidence-verification";

type EvidenceSource = {
  id: string;
  type: EvidenceSourceTypeValue;
  label: string;
  url: string | null;
  status: EvidenceSourceStatusValue;
  metadata: unknown;
  created_at: string;
  created_by: { name: string | null; email: string | null; role: string } | null;
};

type EvidencePacket = {
  id: string;
  title: string;
  status: string;
  requiredCount: number;
  availableCount: number;
  missingCount: number;
  missingLabels: string[];
  ready: boolean;
  summary: string;
};

type IntegrationProject = {
  id: string;
  title: string;
  status: string;
  billing_type: string;
  is_byoc: boolean;
  github_repo_url: string | null;
  has_github_token: boolean;
  evidence_sources: EvidenceSource[];
  evidence_source_coverage: {
    summary: EvidenceSourceSummary[];
    connectedCount: number;
    pendingCount: number;
    attentionCount: number;
    totalSourceTypes: number;
    readyForAudit: boolean;
  };
  milestone_evidence_packets: EvidencePacket[];
};

const SOURCE_OPTIONS: Array<{ type: EvidenceSourceTypeValue; label: string; helper: string }> = [
  {
    type: "GITHUB",
    label: "GitHub",
    helper: "Repository, branch, PR, commit, and check evidence.",
  },
  {
    type: "VERCEL",
    label: "Vercel",
    helper: "Preview/production deployment and build evidence.",
  },
  {
    type: "NETLIFY",
    label: "Netlify",
    helper: "Deploy preview, production URL, build, and function evidence.",
  },
  {
    type: "CLOUDFLARE",
    label: "Cloudflare",
    helper: "Pages, Workers, routes, DNS, and edge deployment evidence.",
  },
  {
    type: "RAILWAY",
    label: "Railway",
    helper: "Backend service, worker, API, environment, and deployment evidence.",
  },
  {
    type: "RENDER",
    label: "Render",
    helper: "Web service, background worker, cron, database, and deploy evidence.",
  },
  {
    type: "FLY",
    label: "Fly.io",
    helper: "Container app, machine, region, health check, and deploy evidence.",
  },
  {
    type: "DIGITALOCEAN",
    label: "DigitalOcean",
    helper: "App Platform service, deployment, database, and managed component evidence.",
  },
  {
    type: "HEROKU",
    label: "Heroku",
    helper: "Dyno, review app, release, pipeline, and add-on evidence.",
  },
  {
    type: "SUPABASE",
    label: "Supabase",
    helper: "Migration, schema, RLS, edge function, and test data evidence.",
  },
  {
    type: "DOMAIN",
    label: "Domain",
    helper: "DNS TXT, well-known file, SSL, and launch URL proof.",
  },
  {
    type: "OTHER",
    label: "Other",
    helper: "Reports, walkthroughs, external tools, files, and handoff proof.",
  },
];

const STATUS_CONFIG: Record<EvidenceSourceStatusValue, { label: string; icon: string; className: string }> = {
  CONNECTED: {
    label: "Connected",
    icon: "verified",
    className: "border-tertiary/30 bg-tertiary/10 text-tertiary",
  },
  PENDING_VERIFICATION: {
    label: "Pending",
    icon: "pending",
    className: "border-secondary/30 bg-secondary/10 text-secondary",
  },
  NEEDS_ATTENTION: {
    label: "Needs attention",
    icon: "error",
    className: "border-error/30 bg-error/10 text-error",
  },
};

const COVERAGE_STATUS_CONFIG: Record<EvidenceSourceSummary["status"], { label: string; icon: string; className: string }> = {
  connected: {
    label: "Connected",
    icon: "verified",
    className: "border-tertiary/30 bg-tertiary/10 text-tertiary",
  },
  pending: {
    label: "Pending",
    icon: "pending",
    className: "border-secondary/30 bg-secondary/10 text-secondary",
  },
  missing: {
    label: "Missing",
    icon: "radio_button_unchecked",
    className: "border-outline-variant/30 bg-surface-container-low text-on-surface-variant",
  },
  attention: {
    label: "Review",
    icon: "error",
    className: "border-error/30 bg-error/10 text-error",
  },
};

function SourceStatusPill({ status }: { status: EvidenceSourceStatusValue }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${config.className}`}>
      <span className="material-symbols-outlined text-[13px]">{config.icon}</span>
      {config.label}
    </span>
  );
}

function CoveragePill({ status }: { status: EvidenceSourceSummary["status"] }) {
  const config = COVERAGE_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${config.className}`}>
      <span className="material-symbols-outlined text-[12px]">{config.icon}</span>
      {config.label}
    </span>
  );
}

const VERIFICATION_STAGE_CONFIG: Record<EvidenceVerificationStage, { label: string; icon: string; className: string }> = {
  ready: {
    label: "Ready",
    icon: "verified_user",
    className: "border-tertiary/30 bg-tertiary/10 text-tertiary",
  },
  pending: {
    label: "Needs context",
    icon: "pending_actions",
    className: "border-secondary/30 bg-secondary/10 text-secondary",
  },
  needs_attention: {
    label: "Needs attention",
    icon: "error",
    className: "border-error/30 bg-error/10 text-error",
  },
};

const CHECK_STATUS_CONFIG: Record<EvidenceSourceVerificationResult["checks"][number]["status"], { icon: string; className: string }> = {
  passed: {
    icon: "check_circle",
    className: "border-tertiary/20 bg-tertiary/10 text-tertiary",
  },
  pending: {
    icon: "schedule",
    className: "border-secondary/20 bg-secondary/10 text-secondary",
  },
  attention: {
    icon: "error",
    className: "border-error/20 bg-error/10 text-error",
  },
};

function VerificationStagePill({ verification }: { verification: EvidenceSourceVerificationResult }) {
  const config = VERIFICATION_STAGE_CONFIG[verification.stage];
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${config.className}`}>
      <span className="material-symbols-outlined text-[13px]">{config.icon}</span>
      {config.label} · {verification.confidenceScore}
    </span>
  );
}

function VerificationCheckRow({ check }: { check: EvidenceSourceVerificationResult["checks"][number] }) {
  const config = CHECK_STATUS_CONFIG[check.status];
  return (
    <div className="flex items-start gap-2 rounded-lg border border-outline-variant/15 bg-surface-container-low px-3 py-2">
      <span className={`material-symbols-outlined mt-0.5 rounded-full border p-0.5 text-[13px] ${config.className}`}>{config.icon}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">{check.label}</p>
        <p className="mt-1 text-[11px] font-medium leading-4 text-on-surface-variant">
          {getVerificationModeLabel(check.mode)} · {check.detail}
        </p>
      </div>
    </div>
  );
}

function SystemCheckRow({ check }: { check: EvidenceSystemCheckResult }) {
  const config =
    check.status === "passed"
      ? CHECK_STATUS_CONFIG.passed
      : check.status === "failed"
        ? CHECK_STATUS_CONFIG.attention
        : CHECK_STATUS_CONFIG.pending;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-outline-variant/15 bg-surface-container-low px-3 py-2">
      <span className={`material-symbols-outlined mt-0.5 rounded-full border p-0.5 text-[13px] ${config.className}`}>{config.icon}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">{check.label}</p>
        <p className="mt-1 text-[11px] font-medium leading-4 text-on-surface-variant">{check.detail}</p>
      </div>
    </div>
  );
}

function sourceLabel(type: EvidenceSourceTypeValue) {
  return SOURCE_OPTIONS.find((option) => option.type === type)?.label ?? "Evidence";
}

function setupOwnerLabel(owner: ReturnType<typeof getEvidenceVerificationProfile>["setupOwner"]) {
  switch (owner) {
    case "FACILITATOR":
      return "Facilitator setup";
    case "CLIENT":
      return "Client setup";
    case "BOTH":
      return "Shared setup";
  }
}

export default function IntegrationsTab({
  project,
  viewerRole,
}: {
  project: IntegrationProject;
  viewerRole: "CLIENT" | "FACILITATOR";
}) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState(project.github_repo_url || "");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [sourceForm, setSourceForm] = useState({
    type: "VERCEL" as EvidenceSourceTypeValue,
    label: "",
    url: "",
    verificationNote: "",
  });
  const [verifyingSourceId, setVerifyingSourceId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canManageRepository = viewerRole === "FACILITATOR";
  const canManageEvidence = true;
  const sourceVerificationSummaries = project.evidence_sources.map((source) => ({
    source,
    verification: evaluateEvidenceSourceVerification(source),
    systemCheck: getEvidenceSystemCheckSummary(source.metadata),
  }));
  const readySourceCount = sourceVerificationSummaries.filter((item) => item.verification.stage === "ready").length;
  const readyPacketCount = project.milestone_evidence_packets.filter((packet) => packet.ready).length;

  const selectedSource = useMemo(
    () => SOURCE_OPTIONS.find((option) => option.type === sourceForm.type) ?? SOURCE_OPTIONS[0],
    [sourceForm.type],
  );
  const selectedVerificationProfile = useMemo(() => getEvidenceVerificationProfile(sourceForm.type), [sourceForm.type]);

  const handleVerifySource = (sourceId: string) => {
    setMessage(null);
    setVerifyingSourceId(sourceId);

    startTransition(async () => {
      const res = await verifyProjectEvidenceSource({ sourceId });
      if (res.success) {
        setMessage({ tone: "success", text: "Source check recorded for milestone verification." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: res.error || "Evidence source could not be verified." });
      }
      setVerifyingSourceId(null);
    });
  };

  const handleSaveGithub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRepository) return;
    setMessage(null);

    startTransition(async () => {
      const res = await linkProjectRepository({
        projectId: project.id,
        repoUrl,
        token,
      });

      if (res.success) {
        setToken("");
        setMessage({ tone: "success", text: "GitHub repository connected as delivery evidence." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: res.error || "GitHub repository could not be connected." });
      }
    });
  };

  const handleSaveSource = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const res = await saveProjectEvidenceSource({
        projectId: project.id,
        ...sourceForm,
      });

      if (res.success) {
        setSourceForm({ type: "VERCEL", label: "", url: "", verificationNote: "" });
        setMessage({ tone: "success", text: "Evidence source added to the project packet." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: res.error || "Evidence source could not be saved." });
      }
    });
  };

  return (
    <div className="w-full max-w-[1400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary">Delivery Evidence System</p>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">Evidence & Integrations</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-on-surface-variant">
            Connect project-specific proof sources, then use them to assemble milestone evidence packets for audit-backed review and escrow release.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Sources</p>
            <p className="mt-1 text-2xl font-black text-on-surface">{project.evidence_sources.length}</p>
          </div>
          <div className="rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Verified</p>
            <p className="mt-1 text-2xl font-black text-on-surface">{readySourceCount}</p>
          </div>
          <div className="rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Packets</p>
            <p className="mt-1 text-2xl font-black text-on-surface">{readyPacketCount}/{project.milestone_evidence_packets.length}</p>
          </div>
        </div>
      </div>

      {message ? (
        <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm font-bold ${
          message.tone === "success"
            ? "border-tertiary/30 bg-tertiary/10 text-tertiary"
            : "border-error/30 bg-error/10 text-error"
        }`}>
          {message.text}
        </div>
      ) : null}

      <section className="mb-5 rounded-2xl border border-outline-variant/20 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px] text-primary">route</span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Verification flow</h3>
            <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
              Setup proves access to evidence. Source checks prove reviewability. Milestone packets map evidence to acceptance. Buyer review confirms the delivered outcome.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["1", "Setup", "Connect a provider link without sharing secrets."],
            ["2", "Source check", "Record provider fit, context, and gaps."],
            ["3", "Milestone packet", "Attach proof to preview, source, criteria, and handoff."],
            ["4", "Acceptance", "AI audit and buyer review decide release readiness."],
          ].map(([step, title, body]) => (
            <div key={step} className="rounded-lg border border-outline-variant/15 bg-surface-container-low p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-black text-primary">{step}</span>
              <p className="mt-3 text-xs font-black uppercase tracking-widest text-on-surface">{title}</p>
              <p className="mt-2 text-[11px] font-medium leading-5 text-on-surface-variant">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {project.evidence_source_coverage.summary.map((item) => (
          <div key={item.type} className="rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <EvidenceProviderMark type={item.type} size="md" decorative />
              <CoveragePill status={item.status} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">{item.label}</p>
            <p className="mt-2 min-h-12 text-xs font-medium leading-5 text-on-surface-variant">{item.description}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-primary">{item.count} linked</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-outline-variant/20 bg-surface shadow-sm">
            <div className="flex items-center gap-3 border-b border-outline-variant/10 px-6 py-4">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">inventory_2</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Connected Evidence Sources</h3>
                <p className="mt-1 text-[11px] font-medium text-on-surface-variant">Project-level sources available for milestone packets.</p>
              </div>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {sourceVerificationSummaries.length > 0 ? sourceVerificationSummaries.map(({ source, verification, systemCheck }) => (
                <div key={source.id} className="px-6 py-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <EvidenceProviderMark type={source.type} size="sm" decorative />
                        <p className="text-sm font-black text-on-surface">{source.label}</p>
                        <span className="rounded-full border border-outline-variant/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                          {sourceLabel(source.type)}
                        </span>
                      </div>
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-2 text-xs font-bold text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          <span className="truncate">{source.url}</span>
                        </a>
                      ) : (
                        <p className="text-xs font-medium text-on-surface-variant">No public URL attached. Review the note or uploaded artifacts.</p>
                      )}
                      <p className="mt-2 text-[11px] font-medium text-on-surface-variant">
                        Added by {source.created_by?.name || source.created_by?.email || "project participant"} · {new Date(source.created_at).toLocaleDateString()}
                      </p>
                      <div className="mt-4 rounded-xl border border-outline-variant/15 bg-surface-container-low p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Verification contract</p>
                            <p className="mt-2 text-xs font-medium leading-5 text-on-surface-variant">{verification.summary}</p>
                          </div>
                          <VerificationStagePill verification={verification} />
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {verification.checks.slice(0, 4).map((check) => (
                            <VerificationCheckRow key={check.key} check={check} />
                          ))}
                        </div>
                        {verification.nextActions.length > 0 ? (
                          <div className="mt-3 rounded-lg border border-secondary/20 bg-secondary/10 px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Next proof step</p>
                            <p className="mt-1 text-[11px] font-medium leading-5 text-on-surface-variant">{verification.nextActions[0]}</p>
                          </div>
                        ) : null}
                        {systemCheck ? (
                          <div className="mt-3 rounded-xl border border-outline-variant/15 bg-surface p-4">
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Automated source check</p>
                                <p className="mt-1 text-[11px] font-medium leading-5 text-on-surface-variant">
                                  Last checked {new Date(systemCheck.checkedAt).toLocaleString()} · credential-light system checks only.
                                </p>
                              </div>
                              <span className="rounded-full border border-outline-variant/20 bg-surface-container-low px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                                {systemCheck.checks.filter((check) => check.status === "passed").length}/{systemCheck.checks.length} passed
                              </span>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              {systemCheck.checks.slice(0, 6).map((check) => (
                                <SystemCheckRow key={check.key} check={check} />
                              ))}
                            </div>
                            {systemCheck.nextActions.length > 0 ? (
                              <p className="mt-3 rounded-lg border border-secondary/20 bg-secondary/10 px-3 py-2 text-[11px] font-medium leading-5 text-on-surface-variant">
                                {systemCheck.nextActions[0]}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                      <SourceStatusPill status={source.status} />
                      <button
                        type="button"
                        onClick={() => handleVerifySource(source.id)}
                        disabled={isPending || !canManageEvidence}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">{verifyingSourceId === source.id ? "sync" : "fact_check"}</span>
                        {source.status === "CONNECTED" ? "Refresh Check" : "Run Source Check"}
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8">
                  <p className="text-sm font-bold text-on-surface">No evidence sources connected yet.</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-on-surface-variant">
                    Add deployment, repository, database, domain, or external evidence before the first milestone review.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant/20 bg-surface shadow-sm">
            <div className="flex items-center gap-3 border-b border-outline-variant/10 px-6 py-4">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">fact_check</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Milestone Evidence Packets</h3>
                <p className="mt-1 text-[11px] font-medium text-on-surface-variant">Readiness is based on each milestone proof plan and submitted artifacts.</p>
              </div>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {project.milestone_evidence_packets.map((packet) => (
                <div key={packet.id} className="px-6 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-black text-on-surface">{packet.title}</p>
                      <p className="mt-1 text-xs font-medium text-on-surface-variant">{packet.summary}</p>
                      {packet.missingLabels.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {packet.missingLabels.slice(0, 4).map((label) => (
                            <span key={label} className="rounded-full border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-[10px] font-bold text-secondary">
                              Missing: {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {readySourceCount > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {sourceVerificationSummaries
                            .filter((item) => item.verification.stage === "ready")
                            .slice(0, 5)
                            .map(({ source }) => (
                              <span key={`${packet.id}-${source.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/20 bg-tertiary/10 px-2.5 py-1 text-[10px] font-bold text-tertiary">
                                <EvidenceProviderMark type={source.type} size="sm" decorative className="h-5 w-5 rounded-md border-tertiary/10 bg-surface" />
                                {sourceLabel(source.type)}
                              </span>
                            ))}
                        </div>
                      ) : null}
                    </div>
                    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      packet.ready
                        ? "border-tertiary/30 bg-tertiary/10 text-tertiary"
                        : "border-secondary/30 bg-secondary/10 text-secondary"
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">{packet.ready ? "verified" : "pending_actions"}</span>
                      {packet.availableCount}/{packet.requiredCount} ready
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-outline-variant/20 bg-surface shadow-sm">
            <div className="flex items-center gap-3 border-b border-outline-variant/10 px-6 py-4">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">add_link</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Add Evidence Source</h3>
                <p className="mt-1 text-[11px] font-medium text-on-surface-variant">Links and notes only. Do not paste production secrets.</p>
              </div>
            </div>
            <form onSubmit={handleSaveSource} className="space-y-4 p-6">
              <div>
                <label htmlFor="evidence-source-type" className="mb-2 block text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Source type</label>
                <select
                  id="evidence-source-type"
                  value={sourceForm.type}
                  onChange={(event) => setSourceForm((current) => ({ ...current, type: event.target.value as EvidenceSourceTypeValue }))}
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm font-bold text-on-surface outline-none transition-colors focus:border-primary"
                >
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option.type} value={option.type}>{option.label}</option>
                  ))}
                </select>
                <div className="mt-2 flex items-start gap-2">
                  <EvidenceProviderMark type={sourceForm.type} size="sm" decorative />
                  <p className="text-[11px] font-medium leading-5 text-on-surface-variant">{selectedSource.helper}</p>
                </div>
                <div className="mt-4 rounded-xl border border-outline-variant/15 bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Setup contract</p>
                    <span className="rounded-full border border-outline-variant/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                      {setupOwnerLabel(selectedVerificationProfile.setupOwner)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {selectedVerificationProfile.setupSteps.slice(0, 3).map((step) => (
                      <li key={step} className="flex gap-2 text-[11px] font-medium leading-5 text-on-surface-variant">
                        <span className="material-symbols-outlined mt-0.5 text-[13px] text-primary">check</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-primary">Milestone proof</p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-on-surface-variant">
                    {selectedVerificationProfile.milestoneUse.slice(0, 3).join(" · ")}
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="evidence-source-label" className="mb-2 block text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Display name</label>
                <input
                  id="evidence-source-label"
                  value={sourceForm.label}
                  onChange={(event) => setSourceForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Production deployment or service"
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="evidence-source-url" className="mb-2 block text-[9px] font-black uppercase tracking-widest text-on-surface-variant">URL or provider link</label>
                <input
                  id="evidence-source-url"
                  type="url"
                  value={sourceForm.url}
                  onChange={(event) => setSourceForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  required={sourceForm.type !== "OTHER"}
                />
              </div>
              <div>
                <label htmlFor="evidence-source-note" className="mb-2 block text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Verification note</label>
                <textarea
                  id="evidence-source-note"
                  value={sourceForm.verificationNote}
                  onChange={(event) => setSourceForm((current) => ({ ...current, verificationNote: event.target.value }))}
                  rows={4}
                  placeholder={`Example: This ${selectedVerificationProfile.label} evidence maps to Milestone 1, deployment abc123, and the buyer acceptance checks.`}
                  className="w-full resize-none rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !canManageEvidence}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">{isPending ? "sync" : "add_link"}</span>
                Add Source
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-outline-variant/20 bg-surface shadow-sm">
            <div className="flex items-center gap-3 border-b border-outline-variant/10 px-6 py-4">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">code</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">GitHub Repository</h3>
                <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
                  {canManageRepository ? "Facilitator-managed code evidence." : "Managed by the facilitator."}
                </p>
              </div>
            </div>
            <form onSubmit={handleSaveGithub} className="space-y-4 p-6">
              <div>
                <label htmlFor="github-repository-url" className="mb-2 block text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Repository URL</label>
                <input
                  id="github-repository-url"
                  type="url"
                  required
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  disabled={!canManageRepository}
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:opacity-60"
                  placeholder="https://github.com/org/repo"
                />
              </div>
              <div>
                <label htmlFor="github-read-only-token" className="mb-2 block text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Read-only token</label>
                <input
                  id="github-read-only-token"
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  disabled={!canManageRepository}
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 font-mono text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:opacity-60"
                  placeholder={project.has_github_token ? "Token saved. Type to overwrite." : "Optional for private repos"}
                />
                <p className="mt-2 text-[11px] font-medium leading-5 text-on-surface-variant">
                  Long term, this should become a GitHub App install. For now, use only read-only repository access.
                </p>
              </div>
              <button
                type="submit"
                disabled={isPending || !canManageRepository}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-xs font-black uppercase tracking-widest text-on-surface transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">cable</span>
                {canManageRepository ? "Connect GitHub" : "Facilitator Managed"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Credential Policy
            </p>
            <p className="text-xs font-medium leading-5 text-on-surface-variant">
              Domain registrar passwords, Supabase service-role keys, production environment secrets, and cloud root credentials should never be entered here. Use provider OAuth, scoped tokens, DNS verification, or uploaded evidence artifacts.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
