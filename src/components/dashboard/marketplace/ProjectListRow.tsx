"use client";

import type { EvidenceSourceTypeValue } from "@/lib/delivery-evidence";
import { getEvidenceProviderBrand } from "@/lib/evidence-provider-branding";

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function ProjectListRow({
  project,
  matchScore,
  totalValue,
  isSelected,
  onClick,
}: {
  project: any;
  matchScore: number;
  totalValue: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const isHighMatch = matchScore >= 90;
  const bidCount = project._count?.bids ?? 0;
  const fit = project.opportunityFit;
  const matchedTerms = fit?.matchedTerms ?? [];
  const matchedProofCapabilities = (fit?.matchedProofCapabilities ?? []) as EvidenceSourceTypeValue[];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left group relative transition-all duration-200 rounded-lg border px-5 py-4 flex gap-4 items-start ${
        isSelected
          ? "bg-primary/5 border-primary/50"
          : "bg-surface border-outline-variant/20 hover:border-outline-variant/50 hover:bg-surface-container-low/50"
      }`}
    >
      {/* Selected accent bar */}
      {isSelected && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary" />
      )}

      {/* Match Score Badge */}
      <div
        className="shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center border text-[11px] font-black leading-none mt-0.5"
        style={{
          color: isHighMatch ? "#10b981" : "#f59e0b",
          borderColor: isHighMatch ? "#10b98130" : "#f59e0b30",
          backgroundColor: isHighMatch ? "#10b98108" : "#f59e0b08",
        }}
      >
        <span>{matchScore}</span>
        <span className="text-[8px] font-bold opacity-70">%</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`font-black font-headline text-sm uppercase tracking-tight leading-tight truncate transition-colors ${
              isSelected ? "text-primary" : "text-on-surface group-hover:text-on-surface"
            }`}>
              {project.title}
            </h3>
            {project.invited && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-widest">
                <span className="material-symbols-outlined text-[11px]">mail</span>
                Invited
              </span>
            )}
            {project.organization?.name && (
              <span className="inline-flex items-center gap-1 mt-1 ml-1 px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant border border-outline-variant/20 text-[9px] font-black uppercase tracking-widest">
                <span className="material-symbols-outlined text-[11px]">domain</span>
                {project.organization.name}
              </span>
            )}
            {matchedTerms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {matchedTerms.slice(0, 3).map((term: string) => (
                  <span key={`${project.id}-${term}`} className="rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                    {term}
                  </span>
                ))}
              </div>
            )}
            {matchedProofCapabilities.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-tertiary/20 bg-tertiary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-tertiary">
                  Proof fit
                </span>
                {matchedProofCapabilities.slice(0, 3).map((type) => (
                  <EvidenceProviderChip key={`${project.id}-${type}`} type={type} />
                ))}
              </div>
            )}
            <p className="text-on-surface-variant text-xs font-medium leading-relaxed mt-1 line-clamp-2 opacity-80">
              {project.ai_generated_sow?.slice(0, 120)}...
            </p>
          </div>

          {/* Right: Budget */}
          <div className="shrink-0 text-right">
            <p className="text-base font-black text-on-surface tracking-tight">{formatCurrency(totalValue)}</p>
            <p className="text-[10px] text-on-surface-variant font-medium">total value</p>
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px]">layers</span>
            {project.milestones?.length ?? 0} phases
          </span>

          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px]">gavel</span>
            {bidCount} bid{bidCount !== 1 ? "s" : ""}
          </span>

          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
            project.billing_type === "HOURLY_RETAINER"
              ? "bg-tertiary/10 text-tertiary border-tertiary/20"
              : "bg-surface-container-high text-on-surface-variant border-outline-variant/20"
          }`}>
            {project.billing_type === "HOURLY_RETAINER" ? "Hourly" : "Fixed"}
          </span>

          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px]">rule</span>
            {fit?.source === "profile-proof-fit" ? "Proof fit" : fit?.source === "profile-fallback" ? "Profile fit" : "Matched"}
          </span>

          <span className="text-[10px] text-on-surface-variant font-medium ml-auto">
            {timeAgo(project.created_at)}
          </span>
        </div>
      </div>
    </button>
  );
}

function EvidenceProviderChip({ type }: { type: EvidenceSourceTypeValue }) {
  const brand = getEvidenceProviderBrand(type);

  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-md border border-outline-variant/20 bg-surface px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant"
      title={`${brand.label} proof capability`}
    >
      {brand.icon ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 shrink-0" fill="currentColor">
          <path d={brand.icon.path} />
        </svg>
      ) : (
        <span className="text-[8px]">{brand.fallbackText}</span>
      )}
      <span className="truncate">{brand.label}</span>
    </span>
  );
}
