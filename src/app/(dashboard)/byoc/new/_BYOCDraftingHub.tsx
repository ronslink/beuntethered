"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { generateBYOCInvite } from "@/app/actions/byoc";

type SOWMilestone = {
  title: string;
  description?: string;
  amount: number;
  deliverables?: string[] | string;
  acceptance_criteria?: string[] | string;
  estimated_duration_days?: number;
};

type SOWData = {
  title: string;
  executiveSummary: string;
  totalAmount: number;
  clientEmail?: string;
  transitionMode?: BYOCTransitionMode;
  currentState?: string;
  priorWork?: string;
  remainingWork?: string;
  knownRisks?: string;
  milestones: SOWMilestone[];
};

type BYOCTransitionMode = "NEW_EXTERNAL" | "RUNNING_PROJECT" | "RESCUE_TRANSITION" | "ONGOING_TO_MILESTONES";

type TriageResult = {
  in_scope?: boolean;
  reason?: string;
  category?: string;
  complexity?: string;
  summary?: string;
};

type RecentBYOCPacket = {
  id: string;
  title: string;
  status: string;
  inviteToken: string | null;
  clientEmail: string | null;
  clientId?: string | null;
  createdAt: string;
  clientTotalCents: number;
  facilitatorPayoutCents: number;
  firstMilestone?: {
    title: string;
    status: string;
    amountCents: number;
  } | null;
  delivery?: {
    emailSent: boolean;
    emailSkipped: string | null;
    existingClientAccount: boolean;
    inAppNotificationSent: boolean;
  } | null;
};

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(/\n|;|(?<=\.)\s+/g)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCategory(value?: string) {
  if (!value) return "Scope triage";
  return value.replace(/_/g, " ").toLowerCase();
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

function getPacketState(packet: RecentBYOCPacket) {
  if (packet.clientId || !packet.inviteToken) {
    const firstMilestoneStatus = packet.firstMilestone?.status;
    if (packet.status === "ACTIVE" && firstMilestoneStatus === "PENDING") {
      return {
        label: "Awaiting funding",
        detail: "Buyer claimed packet",
        icon: "account_balance_wallet",
        tone: "border-secondary/25 bg-secondary/10 text-secondary",
        href: `/command-center/${packet.id}`,
        action: "Open Funding",
      };
    }
    if (packet.status === "ACTIVE" && firstMilestoneStatus === "FUNDED_IN_ESCROW") {
      return {
        label: "Delivery open",
        detail: "First milestone funded",
        icon: "rocket_launch",
        tone: "border-tertiary/25 bg-tertiary/10 text-tertiary",
        href: `/command-center/${packet.id}`,
        action: "Open Work",
      };
    }
    if (packet.status === "ACTIVE" && firstMilestoneStatus === "SUBMITTED_FOR_REVIEW") {
      return {
        label: "In review",
        detail: "Buyer review needed",
        icon: "rate_review",
        tone: "border-primary/25 bg-primary/10 text-primary",
        href: `/command-center/${packet.id}`,
        action: "Open Review",
      };
    }
    return {
      label: packet.status === "ACTIVE" ? "Claimed" : formatStatus(packet.status),
      detail: packet.status === "ACTIVE" ? "Buyer workspace active" : "Moved into governed work",
      icon: "task_alt",
      tone: "border-tertiary/25 bg-tertiary/10 text-tertiary",
      href: `/command-center/${packet.id}`,
      action: "Open Work",
    };
  }

  if (packet.clientEmail) {
    return {
      label: "Email locked",
      detail: "Waiting for invited buyer",
      icon: "lock_person",
      tone: "border-primary/25 bg-primary/10 text-primary",
      href: `/invite/${packet.inviteToken}`,
      action: "Open Invite",
    };
  }

  return {
    label: "Awaiting claim",
    detail: "Share the private invite link",
    icon: "outgoing_mail",
    tone: "border-secondary/25 bg-secondary/10 text-secondary",
    href: `/invite/${packet.inviteToken}`,
    action: "Open Invite",
  };
}

function formatTransitionMode(value?: string) {
  if (!value) return "new external project";
  return value.replace(/_/g, " ").toLowerCase();
}

function formatDeliverySkippedReason(value?: string | null) {
  if (!value) return "not sent";
  if (value === "RESEND_API_KEY_MISSING") return "email unavailable";
  if (value === "NO_CLIENT_EMAIL") return "no client email";
  return value.replace(/_/g, " ").toLowerCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

const qualityGates = [
  {
    icon: "fact_check",
    title: "Verifiable acceptance",
    body: "Each milestone needs observable checks the client can approve against.",
  },
  {
    icon: "inventory_2",
    title: "Evidence-ready delivery",
    body: "Deliverables should produce links, screenshots, repos, reports, or files.",
  },
  {
    icon: "payments",
    title: "Escrow clarity",
    body: "The client sees the BYOC fee and funds milestone work before release.",
  },
  {
    icon: "verified_user",
    title: "Trust record",
    body: "Accepted work becomes part of the audit, activity, and dispute trail.",
  },
];

const transitionModes: { value: BYOCTransitionMode; label: string; body: string }[] = [
  {
    value: "NEW_EXTERNAL",
    label: "New external project",
    body: "Scope a new buyer engagement before work starts.",
  },
  {
    value: "RUNNING_PROJECT",
    label: "Running project",
    body: "Bring active work into milestone governance from this point forward.",
  },
  {
    value: "RESCUE_TRANSITION",
    label: "Rescue transition",
    body: "Stabilize unclear or stalled work with a new verified baseline.",
  },
  {
    value: "ONGOING_TO_MILESTONES",
    label: "Ongoing to milestones",
    body: "Convert recurring work into outcome-based funded checkpoints.",
  },
];

export default function BYOCDraftingHub({ recentPackets }: { recentPackets: RecentBYOCPacket[] }) {
  const [prompt, setPrompt] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [transitionMode, setTransitionMode] = useState<BYOCTransitionMode>("NEW_EXTERNAL");
  const [currentState, setCurrentState] = useState("");
  const [priorWork, setPriorWork] = useState("");
  const [remainingWork, setRemainingWork] = useState("");
  const [knownRisks, setKnownRisks] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sowData, setSowData] = useState<SOWData | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [magicLinkUrl, setMagicLinkUrl] = useState("");
  const [hostname, setHostname] = useState("");
  const [packets, setPackets] = useState(recentPackets);
  const [copiedPacketId, setCopiedPacketId] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState("");

  useEffect(() => {
    setHostname(window.location.origin);
  }, []);

  const milestoneCount = sowData?.milestones?.length ?? 0;
  const estimatedClientFee = useMemo(() => {
    if (!sowData) return 0;
    return Math.round(sowData.totalAmount * 0.05);
  }, [sowData]);

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || prompt.trim().length < 5) return;

    setIsGenerating(true);
    setSowData(null);
    setMagicLinkUrl("");
    setDeliveryStatus("");
    setTriageResult(null);
    setRejectionMessage("");

    try {
      const transitionContext = [
        `BYOC transition mode: ${transitionMode}`,
        currentState.trim() ? `Current state: ${currentState.trim()}` : "",
        priorWork.trim() ? `Prior completed work or existing assets: ${priorWork.trim()}` : "",
        remainingWork.trim() ? `Remaining work to govern in Untether: ${remainingWork.trim()}` : "",
        knownRisks.trim() ? `Known risks or open questions: ${knownRisks.trim()}` : "",
      ].filter(Boolean).join("\n");
      const contextualPrompt = `${prompt.trim()}\n\n${transitionContext}`.trim();

      const triageRes = await fetch("/api/ai/triage-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: contextualPrompt }),
      });

      const triage = (await triageRes.json()) as TriageResult;

      if (!triage.in_scope) {
        setRejectionMessage(
          triage.reason ||
            "This does not look like an outcome-based digital delivery project we can scope into verified milestones.",
        );
        setIsGenerating(false);
        return;
      }

      setTriageResult(triage);

      const response = await fetch("/api/ai/generate-sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: contextualPrompt,
          category: triage.category,
          complexity: triage.complexity,
        }),
      });

      const data = (await response.json()) as SOWData & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to generate scope.");

      setSowData({
        ...data,
        transitionMode,
        currentState: currentState.trim(),
        priorWork: priorWork.trim(),
        remainingWork: remainingWork.trim(),
        knownRisks: knownRisks.trim(),
      });
    } catch (error) {
      console.error(error);
      setRejectionMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateMagicLink = () => {
    if (!sowData) return;

    startTransition(async () => {
      const res = await generateBYOCInvite({ ...sowData, clientEmail: clientEmail.trim() });
      if (res.success) {
        setMagicLinkUrl(`${hostname}/invite/${res.inviteToken}`);
        if (res.emailDelivery?.sent) {
          setDeliveryStatus(`Invite email sent to ${clientEmail.trim()}.`);
        } else if (clientEmail.trim()) {
          setDeliveryStatus("Invite link created. Email delivery is not configured in this environment.");
        } else {
          setDeliveryStatus("Invite link created. Add a client email next time to send it automatically.");
        }
        if (res.inAppNotification?.sent) {
          setDeliveryStatus((current) => `${current} The buyer also has an in-app review action.`);
        }
        if (res.packet) {
          setPackets((current) => [
            {
              ...res.packet,
              clientId: null,
              firstMilestone: res.packet.firstMilestone ?? null,
              delivery: {
                emailSent: res.emailDelivery?.sent === true,
                emailSkipped: res.emailDelivery?.sent ? null : res.emailDelivery?.skipped ?? null,
                existingClientAccount: res.inAppNotification?.skipped !== "NO_EXISTING_CLIENT_ACCOUNT",
                inAppNotificationSent: res.inAppNotification?.sent === true,
              },
            },
            ...current.filter((packet) => packet.id !== res.packet.id),
          ].slice(0, 5));
        }
      } else {
        alert(res.error || "Unable to create invite link.");
      }
    });
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(magicLinkUrl);
  };

  const handleCopyPacketInvite = (packet: RecentBYOCPacket) => {
    if (!packet.inviteToken) return;
    const inviteUrl = `${hostname}/invite/${packet.inviteToken}`;
    void navigator.clipboard.writeText(inviteUrl);
    setCopiedPacketId(packet.id);
  };

  return (
    <main className="min-h-[calc(100vh-80px)] bg-surface px-4 py-6 lg:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-lg border border-outline-variant/40 bg-surface-container-low/60 p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                  <span className="material-symbols-outlined text-[14px]">person_add</span>
                  Facilitator BYOC
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/40 bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Private client invite
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-on-surface md:text-3xl">
                Create a verified private delivery packet
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Turn an external client conversation into a milestone-based scope with escrow terms,
                acceptance checks, and an audit-ready invite link.
              </p>
            </div>

            <div className="grid min-w-full grid-cols-3 gap-2 lg:min-w-[360px]">
              <div className="rounded-lg border border-outline-variant/30 bg-surface p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Facilitator fee</p>
                <p className="mt-1 text-xl font-black text-on-surface">0%</p>
              </div>
              <div className="rounded-lg border border-outline-variant/30 bg-surface p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Client fee</p>
                <p className="mt-1 text-xl font-black text-on-surface">5%</p>
              </div>
              <div className="rounded-lg border border-outline-variant/30 bg-surface p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Release</p>
                <p className="mt-1 text-xl font-black text-on-surface">Evidence</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
          <section className="flex flex-col gap-4">
            <form onSubmit={handleGenerate} className="rounded-lg border border-outline-variant/40 bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Scope Intake</p>
                  <h2 className="mt-1 text-lg font-black text-on-surface">Describe the client outcome</h2>
                </div>
                <span className="rounded-md bg-secondary/10 p-2 text-secondary">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </span>
              </div>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={isGenerating || !!magicLinkUrl}
                placeholder="Example: Build a React operations dashboard with authentication, admin reporting, Stripe billing, and launch documentation. Budget is $4,500."
                className="mt-4 min-h-[180px] w-full resize-none rounded-lg border border-outline-variant/40 bg-surface-container-low/40 p-4 text-sm leading-6 text-on-surface outline-none transition focus:border-primary/60 focus:bg-surface placeholder:text-on-surface-variant/60"
              />

              <div className="mt-3 rounded-lg border border-outline-variant/30 bg-surface-container-low/30 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Project transition type</p>
                <div className="mt-2 grid gap-2">
                  {transitionModes.map((mode) => (
                    <label
                      key={mode.value}
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                        transitionMode === mode.value
                          ? "border-primary/45 bg-primary/10"
                          : "border-outline-variant/25 bg-surface hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="radio"
                        value={mode.value}
                        checked={transitionMode === mode.value}
                        onChange={() => setTransitionMode(mode.value)}
                        disabled={isGenerating || !!magicLinkUrl}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-xs font-black text-on-surface">{mode.label}</span>
                        <span className="mt-1 block text-[11px] leading-5 text-on-surface-variant">{mode.body}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                {[
                  ["Current state", currentState, setCurrentState, "What is already live, agreed, blocked, or in progress?"],
                  ["Prior work/assets", priorWork, setPriorWork, "Existing SOW, repo, deployment, files, decisions, or paid work."],
                  ["Remaining governed work", remainingWork, setRemainingWork, "What should Untether govern from this packet forward?"],
                  ["Known risks", knownRisks, setKnownRisks, "Open questions, dependencies, access gaps, or disputed assumptions."],
                ].map(([label, value, setter, placeholder]) => (
                  <label key={label as string} className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label as string}</span>
                    <textarea
                      value={value as string}
                      onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
                      disabled={isGenerating || !!magicLinkUrl}
                      placeholder={placeholder as string}
                      className="mt-2 min-h-[72px] w-full resize-none rounded-lg border border-outline-variant/40 bg-surface-container-low/40 px-4 py-3 text-sm leading-6 text-on-surface outline-none transition focus:border-primary/60 focus:bg-surface placeholder:text-on-surface-variant/60"
                    />
                  </label>
                ))}
              </div>

              <label className="mt-3 block">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  Buyer client email for private claim guard
                </span>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  disabled={isGenerating || !!magicLinkUrl}
                  placeholder="client@company.com"
                  className="mt-2 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low/40 px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/60 focus:bg-surface placeholder:text-on-surface-variant/60"
                />
              </label>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-on-surface-variant">
                  Best results include target users, required systems, budget, evidence, and launch definition. Use the buyer's email, not your facilitator account.
                </p>
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim() || !!magicLinkUrl}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-primary/70 disabled:text-white/90"
                >
                  {isGenerating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      Drafting
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      Generate Packet
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="rounded-lg border border-outline-variant/40 bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Quality Gates</p>
                  <h2 className="mt-1 text-base font-black text-on-surface">What the AI is optimizing for</h2>
                </div>
                <span className="material-symbols-outlined text-[20px] text-primary">checklist</span>
              </div>
              <div className="mt-4 grid gap-3">
                {qualityGates.map((gate) => (
                  <div key={gate.title} className="flex gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-3">
                    <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                      <span className="material-symbols-outlined text-[16px]">{gate.icon}</span>
                    </span>
                    <div>
                      <p className="text-sm font-black text-on-surface">{gate.title}</p>
                      <p className="mt-1 text-xs leading-5 text-on-surface-variant">{gate.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-outline-variant/40 bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Recent Packets</p>
                  <h2 className="mt-1 text-base font-black text-on-surface">Private client pipeline</h2>
                </div>
                <span className="material-symbols-outlined text-[20px] text-primary">history</span>
              </div>

              <div className="mt-4 space-y-3">
                {packets.length > 0 ? (
                  packets.map((packet) => {
                    const packetState = getPacketState(packet);
                    return (
                      <div
                        key={packet.id}
                        className="rounded-lg border border-outline-variant/30 bg-surface-container-low/35 p-3 transition hover:border-primary/30 hover:bg-primary/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-on-surface">{packet.title}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              {packetState.detail} · {formatDate(packet.createdAt)}
                            </p>
                            {packet.clientEmail && (
                              <p className="mt-1 truncate text-[11px] text-on-surface-variant">
                                Invited: {packet.clientEmail}
                              </p>
                            )}
                            {packet.delivery && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                                  packet.delivery.emailSent
                                    ? "border-tertiary/20 bg-tertiary/10 text-tertiary"
                                    : "border-secondary/20 bg-secondary/10 text-secondary"
                                }`}>
                                  Email: {packet.delivery.emailSent ? "sent" : formatDeliverySkippedReason(packet.delivery.emailSkipped)}
                                </span>
                                <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                                  packet.delivery.inAppNotificationSent
                                    ? "border-tertiary/20 bg-tertiary/10 text-tertiary"
                                    : "border-outline-variant/25 bg-surface text-on-surface-variant"
                                }`}>
                                  In-app: {packet.delivery.inAppNotificationSent ? "ready" : packet.delivery.existingClientAccount ? "pending" : "not matched"}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${packetState.tone}`}>
                            <span className="material-symbols-outlined text-[13px]">{packetState.icon}</span>
                            {packetState.label}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-md bg-surface p-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Client total</p>
                            <p className="mt-1 text-sm font-black text-on-surface">{formatCurrency(packet.clientTotalCents / 100)}</p>
                          </div>
                          <div className="rounded-md bg-surface p-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Payout</p>
                            <p className="mt-1 text-sm font-black text-on-surface">{formatCurrency(packet.facilitatorPayoutCents / 100)}</p>
                          </div>
                        </div>
                        {packet.firstMilestone && (
                          <div className="mt-2 rounded-md border border-outline-variant/25 bg-surface p-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">First milestone</p>
                            <p className="mt-1 truncate text-xs font-bold text-on-surface">{packet.firstMilestone.title}</p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              {formatStatus(packet.firstMilestone.status)} · {formatCurrency(packet.firstMilestone.amountCents / 100)}
                            </p>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={packetState.href}
                            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-outline-variant/35 bg-surface px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface transition hover:border-primary/40 hover:text-primary"
                          >
                            <span className="material-symbols-outlined text-[14px]">{packet.inviteToken ? "open_in_new" : "rocket_launch"}</span>
                            {packetState.action}
                          </a>
                          {packet.inviteToken && (
                            <button
                              type="button"
                              onClick={() => handleCopyPacketInvite(packet)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              {copiedPacketId === packet.id ? "Copied" : "Copy Link"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/30 p-4">
                    <p className="text-sm font-black text-on-surface">No private packets yet</p>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                      Generated BYOC invites will appear here with claim status and escrow totals.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-outline-variant/40 bg-surface shadow-sm">
            <div className="border-b border-outline-variant/30 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Client Packet Preview</p>
                  <h2 className="mt-1 text-xl font-black text-on-surface">
                    {sowData ? sowData.title : "No scope generated yet"}
                  </h2>
                </div>
                {triageResult && (
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                      {formatCategory(triageResult.category)}
                    </span>
                    {triageResult.complexity && (
                      <span className="rounded-md border border-outline-variant/40 bg-surface-container-low px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        {triageResult.complexity}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isGenerating ? (
              <div className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center">
                <span className="rounded-lg bg-primary/10 p-4 text-primary">
                  <span className="material-symbols-outlined animate-spin text-[34px]">progress_activity</span>
                </span>
                <h3 className="mt-5 text-xl font-black text-on-surface">
                  {triageResult ? "Building verification-ready milestones" : "Checking project fit"}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
                  The draft is being shaped around concrete deliverables, acceptance criteria, escrow visibility, and evidence collection.
                </p>
              </div>
            ) : rejectionMessage && !sowData ? (
              <div className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center">
                <span className="rounded-lg bg-error/10 p-4 text-error">
                  <span className="material-symbols-outlined text-[34px]">block</span>
                </span>
                <h3 className="mt-5 text-xl font-black text-on-surface">This needs a clearer delivery shape</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">{rejectionMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    setRejectionMessage("");
                    setPrompt("");
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface px-4 py-3 text-xs font-black uppercase tracking-widest text-on-surface transition hover:border-primary/50 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  Reset Intake
                </button>
              </div>
            ) : sowData ? (
              <div className="p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-4 md:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Facilitator payout</p>
                    <p className="mt-1 text-2xl font-black text-on-surface">{formatCurrency(sowData.totalAmount)}</p>
                  </div>
                  <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Client fee estimate</p>
                    <p className="mt-1 text-2xl font-black text-on-surface">{formatCurrency(estimatedClientFee)}</p>
                  </div>
                  <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Milestones</p>
                    <p className="mt-1 text-2xl font-black text-on-surface">{milestoneCount}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-outline-variant/30 bg-surface-container-low/30 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Executive Summary</p>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">{sowData.executiveSummary}</p>
                </div>

                <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Transition Baseline</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {[
                      ["Mode", formatTransitionMode(sowData.transitionMode)],
                      ["Current state", sowData.currentState || "To be confirmed before claim"],
                      ["Prior work/assets", sowData.priorWork || "No prior assets recorded"],
                      ["Remaining governed work", sowData.remainingWork || "Defined by the milestones below"],
                      ["Known risks", sowData.knownRisks || "No known risks recorded"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-primary/15 bg-surface p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
                        <p className="mt-1 text-xs leading-5 text-on-surface-variant">{value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                    Untether governs funded milestones from the accepted packet forward. Prior work is context unless it is explicitly included in a funded milestone.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {sowData.milestones.map((milestone, index) => {
                    const deliverables = asList(milestone.deliverables);
                    const checks = asList(milestone.acceptance_criteria);

                    return (
                      <article key={`${milestone.title}-${index}`} className="rounded-lg border border-outline-variant/35 bg-surface p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">
                              {index + 1}
                            </span>
                            <div>
                              <h3 className="text-base font-black text-on-surface">{milestone.title}</h3>
                              {milestone.description && (
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">{milestone.description}</p>
                              )}
                              {milestone.estimated_duration_days && (
                                <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                                  {milestone.estimated_duration_days} days
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xl font-black text-on-surface">{formatCurrency(milestone.amount)}</p>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low/40 p-3">
                            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                              <span className="material-symbols-outlined text-[14px] text-primary">inventory_2</span>
                              Deliverables
                            </p>
                            <div className="space-y-2">
                              {(deliverables.length ? deliverables : ["Delivery artifact to be attached for review"]).slice(0, 5).map((item) => (
                                <p key={item} className="flex gap-2 text-xs leading-5 text-on-surface-variant">
                                  <span className="material-symbols-outlined mt-0.5 text-[14px] text-primary">check_circle</span>
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low/40 p-3">
                            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                              <span className="material-symbols-outlined text-[14px] text-secondary">fact_check</span>
                              Acceptance checks
                            </p>
                            <div className="space-y-2">
                              {(checks.length ? checks : ["Client can verify the milestone against attached evidence"]).slice(0, 5).map((item) => (
                                <p key={item} className="flex gap-2 text-xs leading-5 text-on-surface-variant">
                                  <span className="material-symbols-outlined mt-0.5 text-[14px] text-secondary">verified</span>
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="sticky bottom-0 mt-5 rounded-lg border border-primary/25 bg-surface/95 p-4 shadow-lg backdrop-blur">
                  {!magicLinkUrl ? (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-primary">Ready for client review</p>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          The invite will create a private project with the locked scope snapshot and milestone evidence terms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateMagicLink}
                        disabled={isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-variant disabled:text-on-surface-variant"
                      >
                        {isPending ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                            Creating Link
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">link</span>
                            Create Invite Link
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-primary">Invite link ready</p>
                        {deliveryStatus && <p className="mt-1 text-xs text-on-surface-variant">{deliveryStatus}</p>}
                        <input
                          type="text"
                          readOnly
                          value={magicLinkUrl}
                          className="mt-2 w-full min-w-0 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface outline-none lg:min-w-[520px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-primary transition hover:bg-primary/15"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid min-h-[560px] content-center gap-4 p-5 md:grid-cols-3">
                {[
                  ["1", "Triage", "Confirms this is outcome-based digital delivery before drafting."],
                  ["2", "Milestones", "Builds realistic slices with deliverables and review checks."],
                  ["3", "Invite", "Creates a private client link backed by escrow and evidence records."],
                ].map(([step, title, body]) => (
                  <div key={step} className="rounded-lg border border-outline-variant/35 bg-surface-container-low/35 p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">{step}</span>
                    <h3 className="mt-4 text-base font-black text-on-surface">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
