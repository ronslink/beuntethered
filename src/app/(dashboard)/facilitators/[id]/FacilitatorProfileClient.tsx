"use client";

import Link from "next/link";

type PlatformTier = "STANDARD" | "PRO" | "ELITE";

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
  emailVerified: Date | null;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarGradient(id: string): string {
  const colors = [
    "from-primary to-primary-container",
    "from-tertiary to-tertiary-container",
    "from-secondary to-secondary-container",
  ];
  const idx = parseInt(id, 10) % colors.length;
  return colors[idx];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function tierColor(tier: PlatformTier): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  switch (tier) {
    case "ELITE":
      return {
        bg: "bg-primary/20",
        text: "text-primary",
        border: "border-primary/50",
        glow: "shadow-[0_0_20px_rgba(var(--color-primary),0.3)]",
      };
    case "PRO":
      return {
        bg: "bg-tertiary/20",
        text: "text-tertiary",
        border: "border-tertiary/50",
        glow: "shadow-[0_0_20px_rgba(var(--color-tertiary),0.3)]",
      };
    default:
      return {
        bg: "bg-outline/20",
        text: "text-on-surface-variant",
        border: "border-outline/50",
        glow: "",
      };
  }
}

function TrustScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    score >= 90
      ? "bg-primary"
      : score >= 70
      ? "bg-tertiary"
      : "bg-secondary";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
          Trust Score
        </span>
        <span className="font-black font-headline text-sm text-on-surface">
          {score.toFixed(1)}
          <span className="text-xs font-bold text-on-surface-variant">/100</span>
        </span>
      </div>
      <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function FacilitatorProfileClient({ facilitator }: { facilitator: Facilitator | null }) {
  if (!facilitator) {
    return (
      <main className="min-h-screen bg-[#07090F] relative overflow-hidden selection:bg-tertiary/30">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-tertiary/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-xl mx-auto px-4 pt-32">
          <div className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/30 rounded-2xl p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
            <span className="material-symbols-outlined text-outline-variant text-6xl mb-4 block">
              person_off
            </span>
            <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">
              Facilitator Not Found
            </h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-8">
              This facilitator profile doesn&apos;t exist or is no longer available.
            </p>
            <Link
              href="/talent"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Talent
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const name = facilitator.name || "Unnamed Facilitator";
  const initials = getInitials(facilitator.name);
  const avatarGradient = getAvatarGradient(facilitator.id);
  const tier = facilitator.platform_tier;
  const tierStyle = tierColor(tier);
  const memberSince = facilitator.emailVerified

  return (
    <main className="min-h-screen bg-[#07090F] relative overflow-hidden selection:bg-tertiary/30">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-tertiary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 relative z-10">
        {/* Back nav */}
        <div className="pt-8 pb-6">
          <Link
            href="/talent"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Talent
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-8 md:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.4)] relative overflow-hidden mb-6">
          {/* Glow accent */}
          <div
            className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-10 ${
              tier === "ELITE" ? "bg-primary" : tier === "PRO" ? "bg-tertiary" : "bg-outline"
            }`}
          />

          <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
            {/* Avatar */}
            <div
              className={`w-28 h-28 rounded-2xl flex items-center justify-center bg-gradient-to-br ${avatarGradient} border-2 border-outline-variant/40 shadow-xl flex-shrink-0`}
            >
              {facilitator.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={facilitator.image}
                  alt={name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span className="font-black font-headline text-4xl text-on-surface">
                  {initials}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-black font-headline uppercase tracking-tight text-on-surface">
                  {name}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full font-black font-headline uppercase tracking-widest text-[9px] shadow-lg border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                >
                  {tier}
                </span>
              </div>

              <p className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest">
                Project Facilitator
              </p>

              <p className="text-on-surface-variant text-sm">
                {facilitator.email}
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                {facilitator.hourly_rate > 0 && (
                  <div className="flex items-baseline gap-1">
                    <span className="font-black font-headline text-2xl text-primary">
                      ${Number(facilitator.hourly_rate).toFixed(0)}
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant">
                      /hr
                    </span>
                  </div>
                )}
                {facilitator.preferred_llm && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/60 border border-outline-variant/30 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    <span className="material-symbols-outlined text-xs">psychology</span>
                    {facilitator.preferred_llm}
                  </span>
                )}
                {memberSince && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    <span className="material-symbols-outlined text-xs">calendar_today</span>
                    Member since {formatDate(memberSince)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-5 text-center shadow-[0_4px_20px_rgb(0,0,0,0.2)]">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-primary text-lg">
                verified
              </span>
              <span className="font-black font-headline text-2xl text-on-surface">
                {facilitator.trust_score.toFixed(0)}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              Trust Score
            </p>
          </div>

          <div className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-5 text-center shadow-[0_4px_20px_rgb(0,0,0,0.2)]">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-tertiary text-lg">
                Rocket
              </span>
              <span className="font-black font-headline text-2xl text-on-surface">
                {facilitator.total_sprints_completed}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              Projects Done
            </p>
          </div>

          <div className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-5 text-center shadow-[0_4px_20px_rgb(0,0,0,0.2)]">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-secondary text-lg">
                star
              </span>
              <span className="font-black font-headline text-2xl text-on-surface">
                {facilitator.average_ai_audit_score > 0
                  ? facilitator.average_ai_audit_score.toFixed(1)
                  : "—"}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              Avg Rating
            </p>
          </div>
        </div>

        {/* Trust Score Detail */}
        <div className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.2)] mb-6">
          <TrustScoreBar score={facilitator.trust_score} />
        </div>

        {/* Why Work With This Facilitator */}
        <div className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.2)] mb-6">
          <h2 className="text-lg font-black font-headline uppercase tracking-tight text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-xl">
              lightbulb
            </span>
            Why Work With This Facilitator
          </h2>
          <ul className="space-y-3">
            {[
              "Pre-vetted by beuntethered — passed our technical and professionalism bar",
              "Zero-KPI accountability model — paid only on delivered outcomes",
              "Escrow-protected payments — your funds are safe until milestones are approved",
              "AI-audit scoring — every sprint is quality-checked by our AI systems",
            ].map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-sm mt-0.5 flex-shrink-0">
                  check_circle
                </span>
                <span className="text-sm text-on-surface-variant">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hire CTA */}
        <div className="bg-gradient-to-br from-primary/10 to-tertiary/10 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-8 text-center shadow-[0_4px_20px_rgb(0,0,0,0.2)] mb-16">
          <h2 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">
            Ready to Ship?
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
            Bring {name} on board for your next project. Zero upfront risk — milestones are protected by escrow.
          </p>
          <Link
            href={`/byoc/new?facilitator_id=${facilitator.id}`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-sm hover:bg-primary-container hover:text-on-primary-container hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            Hire This Architect
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
