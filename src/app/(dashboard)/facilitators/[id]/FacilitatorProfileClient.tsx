"use client";

import { useState } from "react";
import Link from "next/link";
import { inviteFacilitatorToProject } from "@/app/actions/project-invites";

type PlatformTier = "STANDARD" | "PRO" | "ELITE";
type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
type VerificationType = "IDENTITY" | "STRIPE" | "PORTFOLIO" | "BUSINESS";
type InviteStatus = "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED";

export interface Facilitator {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  platform_tier: PlatformTier;
  trust_score: number;
  total_sprints_completed: number;
  average_ai_audit_score: number;
  hourly_rate: number;
  preferred_llm: string | null;
  emailVerified: Date | string | null;
  bio?: string | null;
  skills?: string[];
  ai_agent_stack?: string[];
  portfolio_url?: string | null;
  availability?: string | null;
  years_experience?: number | null;
  preferred_project_size?: string | null;
  verifications?: { type: VerificationType; status: VerificationStatus }[];
  dispute_count?: number;
  bid_count?: number;
}

const VERIFICATION_TYPES: { type: VerificationType; label: string; icon: string }[] = [
  { type: "IDENTITY", label: "Identity", icon: "badge" },
  { type: "STRIPE", label: "Stripe", icon: "account_balance" },
  { type: "PORTFOLIO", label: "Portfolio", icon: "work_history" },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function tierClasses(tier: PlatformTier): string {
  if (tier === "ELITE") return "bg-primary/10 text-primary border-primary/30";
  if (tier === "PRO") return "bg-tertiary/10 text-tertiary border-tertiary/30";
  return "bg-surface-container-high text-on-surface-variant border-outline-variant/30";
}

function availabilityLabel(value?: string | null): string {
  if (value === "AVAILABLE") return "Available now";
  if (value === "SOON") return "Available soon";
  if (value === "LIMITED") return "Limited capacity";
  if (value === "READY_THIS_WEEK") return "Ready this week";
  return value ? value.replace(/_/g, " ").toLowerCase() : "Availability unknown";
}

function verificationStatus(
  verifications: Facilitator["verifications"] | undefined,
  type: VerificationType
) {
  return verifications?.find((verification) => verification.type === type)?.status ?? "PENDING";
}

function inviteStatusLabel(status: InviteStatus | null): string | null {
  if (status === "SENT") return "Invited";
  if (status === "VIEWED") return "Viewed";
  if (status === "ACCEPTED") return "Accepted";
  if (status === "DECLINED") return "Declined";
  return null;
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const cls =
    status === "VERIFIED"
      ? "bg-[#059669]/10 text-[#059669] border-[#059669]/30"
      : status === "REJECTED"
      ? "bg-error/10 text-error border-error/30"
      : "bg-surface-container-high text-on-surface-variant border-outline-variant/30";

  return (
    <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${cls}`}>
      {status.toLowerCase()}
    </span>
  );
}

function TrustScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
          Trust Score
        </span>
        <span className="font-black text-sm text-on-surface">
          {score.toFixed(1)}
          <span className="text-xs font-bold text-on-surface-variant">/100</span>
        </span>
      </div>
      <div className="h-2 bg-surface-container-high rounded-md overflow-hidden">
        <div className="h-full rounded-md bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FacilitatorProfileClient({
  facilitator,
  canInvite,
  openProjects,
  inviteStatus: initialInviteStatus,
}: {
  facilitator: Facilitator | null;
  canInvite: boolean;
  openProjects: { id: string; title: string }[];
  inviteStatus: InviteStatus | null;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteProjectId, setInviteProjectId] = useState(openProjects[0]?.id ?? "");
  const [inviteMessage, setInviteMessage] = useState("");
  const [currentInviteStatus, setCurrentInviteStatus] = useState<InviteStatus | null>(initialInviteStatus);

  if (!facilitator) {
    return (
      <main className="min-h-full px-4 py-10">
        <div className="max-w-xl mx-auto bg-surface border border-outline-variant/30 rounded-lg p-10 text-center">
          <span className="material-symbols-outlined text-outline-variant text-4xl mb-4 block">person_off</span>
          <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">
            Facilitator Not Found
          </h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-8">
            This facilitator profile does not exist or is no longer available.
          </p>
          <Link
            href="/talent"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-on-primary font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Talent
          </Link>
        </div>
      </main>
    );
  }

  const name = facilitator.name || "Unnamed Facilitator";
  const initials = getInitials(facilitator.name);
  const skills = facilitator.skills ?? [];
  const agentStack = facilitator.ai_agent_stack ?? [];
  const disputes = facilitator.dispute_count ?? 0;
  const verifiedCount = VERIFICATION_TYPES.filter(
    ({ type }) => verificationStatus(facilitator.verifications, type) === "VERIFIED"
  ).length;
  const profileComplete = Boolean(facilitator.bio && skills.length > 0 && facilitator.portfolio_url);
  const stripeVerified = verificationStatus(facilitator.verifications, "STRIPE") === "VERIFIED";
  const identityVerified = verificationStatus(facilitator.verifications, "IDENTITY") === "VERIFIED";

  const inviteLabel = inviteStatusLabel(currentInviteStatus);
  const canSendInvite = canInvite && openProjects.length > 0 && (!currentInviteStatus || currentInviteStatus === "DECLINED");

  const sendInvite = async () => {
    if (!inviteProjectId) return;
    setInviteMessage("Sending invite...");
    const res = await inviteFacilitatorToProject({
      projectId: inviteProjectId,
      facilitatorId: facilitator.id,
      message: "We think your delivery profile is a strong fit for this project.",
    });
    setInviteMessage(
      res.success
        ? res.alreadyInvited
          ? "Invite already active."
          : "Invite sent."
        : res.error || "Invite failed."
    );
    if (res.success) {
      setCurrentInviteStatus(res.status ?? "SENT");
    }
  };

  return (
    <main className="min-h-full bg-background px-4 py-6 pb-16 lg:px-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6">
          <Link
            href="/talent"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Talent
          </Link>
        </div>

        <section className="mb-6 rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div className="flex items-start gap-5">
              {facilitator.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={facilitator.image}
                  alt={name}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-outline-variant/30 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container-high">
                  <span className="font-headline text-2xl font-black text-on-surface-variant">{initials}</span>
                </div>
              )}

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${tierClasses(facilitator.platform_tier)}`}>
                    {facilitator.platform_tier}
                  </span>
                  <span className="rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-tertiary">
                    {availabilityLabel(facilitator.availability)}
                  </span>
                </div>
                <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface md:text-4xl">
                  {name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-on-surface-variant">
                  {facilitator.bio || "Human-led, AI-assisted software delivery facilitator."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:w-64 lg:flex-col">
              {canSendInvite ? (
                <button
                  onClick={() => {
                    setInviteOpen(true);
                    setInviteProjectId(openProjects[0]?.id ?? "");
                    setInviteMessage("");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
                >
                  {currentInviteStatus === "DECLINED" ? "Reinvite to Bid" : "Invite to Bid"}
                  <span className="material-symbols-outlined text-[14px]">outgoing_mail</span>
                </button>
              ) : inviteLabel ? (
                <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low px-5 py-3 text-xs font-black uppercase tracking-widest text-on-surface-variant">
                  {inviteLabel}
                  <span className="material-symbols-outlined text-[14px]">
                    {currentInviteStatus === "ACCEPTED" ? "check_circle" : currentInviteStatus === "DECLINED" ? "block" : "mark_email_read"}
                  </span>
                </span>
              ) : (
                <Link
                  href="/projects/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
                >
                  Post Project
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </Link>
              )}
              {facilitator.portfolio_url && (
                <a
                  href={facilitator.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 px-5 py-3 text-xs font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
                >
                  Portfolio
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "Trust Score", value: Math.round(facilitator.trust_score) },
            { label: "Completed Milestones", value: facilitator.total_sprints_completed },
            { label: "Average Audit", value: facilitator.average_ai_audit_score > 0 ? `${facilitator.average_ai_audit_score.toFixed(1)}%` : "-" },
            { label: "Disputes", value: disputes },
            { label: "Verifications", value: `${verifiedCount}/${VERIFICATION_TYPES.length}` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-outline-variant/20 bg-surface p-4">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{stat.label}</p>
              <p className="text-xl font-black text-on-surface">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6">
              <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-on-surface">
                Skills And AI Tools
              </h2>
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(skills.length > 0 ? skills : ["No skills listed"]).map((skill) => (
                      <span key={skill} className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-1.5 text-xs font-bold text-on-surface-variant">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">AI Tool Stack</p>
                  <div className="flex flex-wrap gap-2">
                    {(agentStack.length > 0 ? agentStack : [facilitator.preferred_llm || "Not specified"]).map((agent) => (
                      <span key={agent} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6">
              <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-on-surface">
                Buyer Confidence Signals
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <EvidenceCard label="Stripe payout verified" active={stripeVerified} body="Facilitator can receive marketplace payouts through Stripe Connect." />
                <EvidenceCard label="Identity verified" active={identityVerified} body="Profile has identity review evidence recorded in Untether." />
                <EvidenceCard label="Profile complete" active={profileComplete} body="Bio, skills, AI tool workflow, and portfolio are ready for buyer review." />
                <EvidenceCard label="Dispute history" active={disputes === 0} body={disputes === 0 ? "No disputes recorded for this facilitator." : `${disputes} dispute record(s) require review.`} />
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6">
              <TrustScoreBar score={facilitator.trust_score} />
            </div>

            <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6">
              <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-on-surface">
                Verification Evidence
              </h2>
              <div className="space-y-3">
                {VERIFICATION_TYPES.map(({ type, label, icon }) => (
                  <div key={type} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">{icon}</span>
                      <span className="text-sm font-bold text-on-surface truncate">{label}</span>
                    </div>
                    <StatusBadge status={verificationStatus(facilitator.verifications, type)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6">
              <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-on-surface">
                Commercial Readiness
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Hourly reference</dt>
                  <dd className="font-black text-on-surface">{facilitator.hourly_rate > 0 ? `$${facilitator.hourly_rate.toFixed(0)}/hr` : "Not listed"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Experience</dt>
                  <dd className="font-black text-on-surface">{facilitator.years_experience ? `${facilitator.years_experience}y` : "Not listed"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Project size</dt>
                  <dd className="font-black text-on-surface text-right">{facilitator.preferred_project_size || "Flexible"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Member since</dt>
                  <dd className="font-black text-on-surface">{facilitator.emailVerified ? formatDate(facilitator.emailVerified) : "Unverified"}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            aria-label="Close invite dialog"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setInviteOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Invite to bid</p>
            <h3 className="mt-2 text-xl font-black text-on-surface">{name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Send a direct project invite. This opportunity will be flagged in the facilitator marketplace feed.
            </p>

            <label className="mt-5 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Project
            </label>
            <select
              value={inviteProjectId}
              onChange={(event) => setInviteProjectId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm font-medium text-on-surface outline-none focus:border-primary/50"
            >
              {openProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>

            {inviteMessage && (
              <p className="mt-3 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant">
                {inviteMessage}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setInviteOpen(false)}
                className="rounded-xl border border-outline-variant/30 px-4 py-2 text-xs font-bold text-on-surface-variant"
              >
                Close
              </button>
              <button
                onClick={sendInvite}
                disabled={!inviteProjectId}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EvidenceCard({ label, active, body }: { label: string; active: boolean; body: string }) {
  return (
    <div className={`rounded-xl border p-4 ${active ? "border-tertiary/30 bg-tertiary/10" : "border-outline-variant/30 bg-surface-container-low"}`}>
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-[18px] ${active ? "text-tertiary" : "text-outline"}`}>
          {active ? "check_circle" : "radio_button_unchecked"}
        </span>
        <h3 className="text-sm font-black text-on-surface">{label}</h3>
      </div>
      <p className="mt-2 text-xs font-medium leading-relaxed text-on-surface-variant">{body}</p>
    </div>
  );
}
