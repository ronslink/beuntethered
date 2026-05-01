"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TalentProfile } from "./page";
import { inviteFacilitatorToProject } from "@/app/actions/project-invites";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function tierClasses(tier: string) {
  if (tier === "ELITE") return "border-primary/30 bg-primary/10 text-primary";
  if (tier === "PRO") return "border-tertiary/30 bg-tertiary/10 text-tertiary";
  return "border-outline-variant bg-surface-container-high text-on-surface-variant";
}

function proofLevelClasses(level: TalentProfile["proof_level"]) {
  if (level === "enterprise_ready") return "border-primary/30 bg-primary/10 text-primary";
  if (level === "trusted") return "border-tertiary/30 bg-tertiary/10 text-tertiary";
  if (level === "verified") return "border-[#2563eb]/30 bg-[#2563eb]/10 text-[#2563eb]";
  return "border-outline-variant/30 bg-surface-container-low text-on-surface-variant";
}

function availabilityLabel(value: string | null) {
  if (value === "AVAILABLE") return "Available now";
  if (value === "SOON") return "Available soon";
  if (value === "LIMITED") return "Limited capacity";
  if (value === "READY_THIS_WEEK") return "Ready this week";
  return value || "Availability unknown";
}

function inviteStatusLabel(status: TalentProfile["invite_status"]) {
  if (status === "SENT") return "Invited";
  if (status === "VIEWED") return "Viewed";
  if (status === "ACCEPTED") return "Accepted";
  if (status === "DECLINED") return "Declined";
  return null;
}

type SortKey = "proof" | "trust" | "audit" | "completed" | "rate_asc" | "rate_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "proof", label: "Proof readiness" },
  { value: "trust", label: "Trust score" },
  { value: "audit", label: "Audit score" },
  { value: "completed", label: "Completed milestones" },
  { value: "rate_asc", label: "Rate low to high" },
  { value: "rate_desc", label: "Rate high to low" },
];

export default function TalentPageClient({
  talent,
  openProjects,
  canInvite,
}: {
  talent: TalentProfile[];
  openProjects: { id: string; title: string }[];
  canInvite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("proof");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<TalentProfile | null>(null);
  const [inviteProjectId, setInviteProjectId] = useState(openProjects[0]?.id ?? "");
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviteStatusByFacilitator, setInviteStatusByFacilitator] = useState<Record<string, TalentProfile["invite_status"]>>({});

  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    talent.forEach((profile) => profile.skills.forEach((skill) => skills.add(skill)));
    return Array.from(skills).sort();
  }, [talent]);

  const marketplaceStats = useMemo(() => {
    const verified = talent.filter((profile) => profile.identity_verified || profile.stripe_verified).length;
    const proofReady = talent.filter((profile) => profile.proof_level === "enterprise_ready" || profile.proof_level === "trusted").length;
    const completed = talent.reduce((sum, profile) => sum + profile.total_sprints_completed, 0);
    const avgAudit = talent.length
      ? Math.round(talent.reduce((sum, profile) => sum + profile.average_ai_audit_score, 0) / talent.length)
      : 0;
    return { verified, proofReady, completed, avgAudit };
  }, [talent]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let results = [...talent];

    if (normalizedQuery) {
      results = results.filter((profile) => {
        const haystack = [
          profile.name,
          profile.bio,
          profile.availability,
          profile.platform_tier,
          profile.portfolio_url,
          profile.proof_label,
          ...profile.skills,
          ...profile.ai_agent_stack,
          ...profile.evidence_provider_labels,
          ...profile.trust_highlights,
          ...profile.trust_gaps,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });
    }

    if (selectedSkills.length) {
      results = results.filter((profile) =>
        selectedSkills.every((skill) => profile.skills.includes(skill))
      );
    }

    if (selectedTier !== "ALL") {
      results = results.filter((profile) => profile.platform_tier === selectedTier);
    }

    if (verifiedOnly) {
      results = results.filter((profile) => profile.identity_verified || profile.stripe_verified);
    }

    if (availableOnly) {
      results = results.filter((profile) => profile.availability === "AVAILABLE" || profile.availability === "SOON");
    }

    results.sort((a, b) => {
      if (sortBy === "proof") return b.proof_score - a.proof_score;
      if (sortBy === "audit") return b.average_ai_audit_score - a.average_ai_audit_score;
      if (sortBy === "completed") return b.total_sprints_completed - a.total_sprints_completed;
      if (sortBy === "rate_asc") return a.hourly_rate - b.hourly_rate;
      if (sortBy === "rate_desc") return b.hourly_rate - a.hourly_rate;
      return b.trust_score - a.trust_score;
    });

    return results;
  }, [availableOnly, query, selectedSkills, selectedTier, sortBy, talent, verifiedOnly]);

  const clearFilters = () => {
    setQuery("");
    setSelectedSkills([]);
    setSelectedTier("ALL");
    setVerifiedOnly(false);
    setAvailableOnly(false);
    setSortBy("proof");
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]
    );
  };

  const sendInvite = async () => {
    if (!inviteTarget || !inviteProjectId) return;
    setInviteStatus("Sending invite...");
    const res = await inviteFacilitatorToProject({
      projectId: inviteProjectId,
      facilitatorId: inviteTarget.id,
      message: "We think your delivery profile is a strong fit for this project.",
    });
    setInviteStatus(
      res.success
        ? res.alreadyInvited
          ? "Invite already active."
          : "Invite sent."
        : res.error || "Invite failed."
    );
    if (res.success) {
      setInviteStatusByFacilitator((current) => ({
        ...current,
        [inviteTarget.id]: res.status ?? "SENT",
      }));
    }
  };

  const hasFilters =
    Boolean(query) ||
    selectedSkills.length > 0 ||
    selectedTier !== "ALL" ||
    verifiedOnly ||
    availableOnly;

  return (
    <main className="min-h-screen bg-background pb-16 text-on-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-6">
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                Verified delivery network
              </span>
              <span className="text-xs font-bold text-on-surface-variant">
                Outcome-based software facilitators
              </span>
            </div>
            <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface lg:text-4xl">
              Browse Talent
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-on-surface-variant">
              Compare facilitators by verification, delivery history, AI tool workflow, audit performance, and readiness before inviting them to bid.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[520px] sm:grid-cols-4">
            <Stat label="Verified" value={String(marketplaceStats.verified)} />
            <Stat label="Proof ready" value={String(marketplaceStats.proofReady)} />
            <Stat label="Milestones" value={String(marketplaceStats.completed)} />
            <Stat label="Avg audit" value={`${marketplaceStats.avgAudit}%`} />
          </div>
        </header>

        <section className="mb-5 rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_170px]">
            <label className="relative block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search skills, AI tools, name, or delivery specialty"
                className="h-11 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low pl-10 pr-3 text-sm font-medium text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary/50"
              />
            </label>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              className="h-11 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-xs font-bold uppercase tracking-wider text-on-surface outline-none focus:border-primary/50"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex rounded-xl border border-outline-variant/30 bg-surface-container-low p-1">
              {["ALL", "ELITE", "PRO"].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`flex-1 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                    selectedTier === tier
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tier === "ALL" ? "All" : tier}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setVerifiedOnly((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                verifiedOnly
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-outline-variant/30 text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">verified_user</span>
              Verified only
            </button>
            <button
              onClick={() => setAvailableOnly((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                availableOnly
                  ? "border-tertiary/30 bg-tertiary/10 text-tertiary"
                  : "border-outline-variant/30 text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">bolt</span>
              Ready now
            </button>

            {allSkills.slice(0, 18).map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  selectedSkills.includes(skill)
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-outline-variant/30 text-on-surface-variant hover:border-primary/30 hover:text-primary"
                }`}
              >
                {skill}
              </button>
            ))}

            {hasFilters && (
              <button onClick={clearFilters} className="ml-auto text-[10px] font-black uppercase tracking-widest text-primary">
                Clear filters
              </button>
            )}
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold text-on-surface-variant">
            Showing {filtered.length} of {talent.length} facilitators
          </p>
          {canInvite && openProjects.length === 0 && (
            <p className="text-xs font-bold text-on-surface-variant">
              Post or reopen a project to enable invite-to-bid.
            </p>
          )}
        </div>

        {filtered.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface shadow-sm">
            <div className="grid grid-cols-[1.6fr_1.4fr_130px_120px_130px] gap-4 border-b border-outline-variant/30 bg-surface-container-low px-5 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant max-lg:hidden">
              <span>Facilitator</span>
              <span>Proof signals</span>
              <span>Delivery proof</span>
              <span>Economics</span>
              <span className="text-right">Action</span>
            </div>

            <div className="divide-y divide-outline-variant/20">
              {filtered.map((profile) => (
                <TalentRow
                  key={profile.id}
                  profile={profile}
                  inviteStatus={inviteStatusByFacilitator[profile.id] ?? profile.invite_status}
                  canInvite={canInvite}
                  hasOpenProjects={openProjects.length > 0}
                  onInvite={() => {
                    setInviteTarget(profile);
                    setInviteProjectId(openProjects[0]?.id ?? "");
                    setInviteStatus("");
                  }}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-outline-variant/30 bg-surface p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">search_off</span>
            <h2 className="mt-3 text-xl font-black text-on-surface">No matching facilitators</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
              Broaden the filters or add more demo facilitator data for review coverage.
            </p>
            <button onClick={clearFilters} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-on-primary">
              Clear filters
            </button>
          </section>
        )}
      </div>

      {inviteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            aria-label="Close invite dialog"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setInviteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Invite to bid</p>
            <h3 className="mt-2 text-xl font-black text-on-surface">{inviteTarget.name || "Facilitator"}</h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Send a direct project invite. The facilitator will see this opportunity separately from the open marketplace feed.
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

            {inviteStatus && (
              <p className="mt-3 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant">
                {inviteStatus}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setInviteTarget(null)}
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

function TalentRow({
  profile,
  inviteStatus,
  canInvite,
  hasOpenProjects,
  onInvite,
}: {
  profile: TalentProfile;
  inviteStatus: TalentProfile["invite_status"];
  canInvite: boolean;
  hasOpenProjects: boolean;
  onInvite: () => void;
}) {
  const inviteLabel = inviteStatusLabel(inviteStatus);
  const canSendInvite = canInvite && hasOpenProjects && (!inviteStatus || inviteStatus === "DECLINED");
  const visibleSignals = [
    ...profile.buyer_signals.filter((signal) => signal.status === "attention"),
    ...profile.buyer_signals.filter((signal) => signal.status !== "attention"),
  ].slice(0, 4);

  return (
    <article className="grid gap-4 px-5 py-5 transition-colors hover:bg-surface-container-low/60 lg:grid-cols-[1.6fr_1.4fr_130px_120px_130px] lg:items-center">
      <div className="flex min-w-0 gap-4">
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.image}
            alt={profile.name || "Facilitator"}
            className="h-12 w-12 shrink-0 rounded-xl border border-outline-variant/30 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-high">
            <span className="font-headline text-sm font-black text-on-surface-variant">
              {getInitials(profile.name || "?")}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-black text-on-surface">{profile.name || "Anonymous facilitator"}</h2>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${tierClasses(profile.platform_tier)}`}>
              {profile.platform_tier}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${proofLevelClasses(profile.proof_level)}`}>
              {profile.proof_label}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-on-surface-variant">
            {profile.bio || "No profile summary yet."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.skills.slice(0, 4).map((skill) => (
              <span key={skill} className="rounded-md border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2">
        {visibleSignals.map((signal) => (
          <Signal key={signal.key} label={signal.label} status={signal.status} />
        ))}
        <div className="col-span-2 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Evidence tools</p>
          <p className="mt-1 truncate text-xs font-bold text-on-surface">
            {profile.evidence_provider_labels.length ? profile.evidence_provider_labels.slice(0, 3).join(", ") : "Not connected yet"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 lg:block lg:space-y-2">
        <Metric label="Proof" value={`${profile.proof_score}`} />
        <Metric label="Audit" value={`${Math.round(profile.average_ai_audit_score)}%`} />
        <Metric label="Done" value={`${profile.total_sprints_completed}`} />
      </div>

      <div className="grid grid-cols-2 gap-2 lg:block lg:space-y-2">
        <Metric label="Rate" value={`$${profile.hourly_rate}`} />
        <Metric label="Views" value={`${profile.profile_view_count}`} />
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Readiness</p>
          <p className="mt-1 text-xs font-bold text-on-surface">{availabilityLabel(profile.availability)}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {inviteLabel && (
          <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">
              {inviteStatus === "ACCEPTED" ? "check_circle" : inviteStatus === "DECLINED" ? "block" : "mark_email_read"}
            </span>
            {inviteLabel}
          </span>
        )}
        {canSendInvite && (
          <button
            onClick={onInvite}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-[10px] font-black uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[14px]">outgoing_mail</span>
            {inviteStatus === "DECLINED" ? "Reinvite" : "Invite"}
          </button>
        )}
        <Link
          href={`/facilitators/${profile.id}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-outline-variant/30 px-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
        >
          Profile
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant lg:hidden">
        {profile.proof_score}/100 proof readiness
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 text-xl font-black text-on-surface">{value}</p>
    </div>
  );
}

function Signal({ label, status }: { label: string; status: TalentProfile["buyer_signals"][number]["status"] }) {
  const active = status === "ready";
  const attention = status === "attention";

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        active
          ? "border-tertiary/30 bg-tertiary/10"
          : attention
          ? "border-error/30 bg-error/10"
          : "border-outline-variant/30 bg-surface-container-low"
      }`}
    >
      <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
        <span className={`material-symbols-outlined text-[12px] ${active ? "text-tertiary" : attention ? "text-error" : "text-outline"}`}>
          {active ? "check_circle" : attention ? "warning" : "radio_button_unchecked"}
        </span>
        {label}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-black text-on-surface">{value}</p>
    </div>
  );
}
