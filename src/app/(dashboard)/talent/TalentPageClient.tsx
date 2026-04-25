"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { TalentProfile } from "./page";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function tierColor(tier: string) {
  if (tier === "ELITE") return { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" };
  if (tier === "PRO") return { bg: "bg-tertiary/10", text: "text-tertiary", border: "border-tertiary/30" };
  return { bg: "bg-outline/10", text: "text-on-surface-variant", border: "border-outline/30" };
}

function availabilityStyle(avail: string | null) {
  if (avail === "AVAILABLE") return { dot: "bg-[#059669]", label: "Available Now", cls: "bg-[#059669]/10 text-[#059669] border-[#059669]/20" };
  if (avail === "SOON") return { dot: "bg-primary", label: "Available Soon", cls: "bg-primary/10 text-primary border-primary/20" };
  return { dot: "bg-outline", label: avail || "Unknown", cls: "bg-outline/10 text-on-surface-variant border-outline/20" };
}

type SortKey = "trust" | "rate_asc" | "rate_desc" | "sprints";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "trust", label: "Trust Score" },
  { value: "rate_asc", label: "Rate: Low → High" },
  { value: "rate_desc", label: "Rate: High → Low" },
  { value: "sprints", label: "Most Completed" },
];

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function TalentPageClient({ talent }: { talent: TalentProfile[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("trust");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>("ALL");

  // ── Derive all unique skills ──────────────────────────────────────────────
  const allSkills = useMemo(() => {
    const set = new Set<string>();
    talent.forEach((t) => t.skills?.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [talent]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let results = [...talent];

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q) ||
          (t.bio || "").toLowerCase().includes(q) ||
          t.skills?.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Skill filter
    if (selectedSkills.length > 0) {
      results = results.filter((t) =>
        selectedSkills.every((sk) => t.skills?.includes(sk))
      );
    }

    // Tier filter
    if (selectedTier !== "ALL") {
      results = results.filter((t) => t.platform_tier === selectedTier);
    }

    // Sort
    switch (sortBy) {
      case "trust":
        results.sort((a, b) => b.trust_score - a.trust_score);
        break;
      case "rate_asc":
        results.sort((a, b) => a.hourly_rate - b.hourly_rate);
        break;
      case "rate_desc":
        results.sort((a, b) => b.hourly_rate - a.hourly_rate);
        break;
      case "sprints":
        results.sort((a, b) => b.total_sprints_completed - a.total_sprints_completed);
        break;
    }

    return results;
  }, [talent, query, selectedSkills, selectedTier, sortBy]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const clearAll = () => {
    setQuery("");
    setSelectedSkills([]);
    setSelectedTier("ALL");
    setSortBy("trust");
  };

  const hasActiveFilters = query || selectedSkills.length > 0 || selectedTier !== "ALL";

  return (
    <main className="min-h-screen bg-[#07090F] relative overflow-hidden selection:bg-tertiary/30 pb-20">
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-tertiary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 lg:px-6 relative z-10">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="text-center max-w-3xl mx-auto pt-20 pb-10 space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <span className="font-headline font-black tracking-widest uppercase text-tertiary text-[10px] px-5 py-1.5 rounded-full border border-tertiary/30 bg-tertiary/10 inline-block">
            Curated Network
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-headline tracking-tighter text-on-surface leading-[0.9]">
            Find your{" "}
            <span className="bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent">
              facilitator
            </span>
          </h1>
          <p className="text-on-surface-variant text-base max-w-xl mx-auto">
            Browse vetted facilitators ranked by trust score, AI audit performance, and delivered outcomes.
          </p>
        </header>

        {/* ── Search + Filters ──────────────────────────────────────────────── */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: "100ms" }}>
          {/* Search bar */}
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, skill, or AI expertise..."
              className="w-full bg-surface/40 backdrop-blur-xl border border-outline-variant/30 rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary/50 transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Filter bar */}
          <div className="bg-surface/30 backdrop-blur-xl border border-outline-variant/20 rounded-xl p-3 flex flex-wrap items-center gap-3">
            {/* Tier filter */}
            <div className="flex items-center gap-1.5">
              {["ALL", "ELITE", "PRO", "STANDARD"].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedTier === tier
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-on-surface-variant hover:text-on-surface border border-transparent hover:border-outline-variant/30"
                  }`}
                >
                  {tier === "ALL" ? "All Tiers" : tier}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-outline-variant/20 hidden md:block" />

            {/* Sort */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="bg-transparent border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-on-surface outline-none cursor-pointer uppercase tracking-wider"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Result count */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[14px]">verified</span>
              {filtered.length} facilitator{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Skill chips */}
          {allSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {allSkills.slice(0, 20).map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                    selectedSkills.includes(skill)
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "text-on-surface-variant border-outline-variant/20 hover:border-primary/30 hover:text-primary"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          )}

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2">
              <button onClick={clearAll} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Results ───────────────────────────────────────────────────────── */}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((t, idx) => {
              const tc = tierColor(t.platform_tier);
              const av = availabilityStyle(t.availability);
              return (
                <div
                  key={t.id}
                  className="group bg-surface/30 backdrop-blur-xl border border-outline-variant/15 rounded-xl p-4 md:p-5 flex items-center gap-4 md:gap-5 hover:border-outline-variant/40 hover:bg-surface/50 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
                  style={{ animationDelay: `${Math.min(idx * 50, 500)}ms` }}
                >
                  {/* Avatar */}
                  {t.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={t.image} alt={t.name || ""} className="w-11 h-11 rounded-xl object-cover border border-outline-variant/30 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30">
                      <span className="font-black font-headline text-sm text-on-surface-variant">{getInitials(t.name || "?")}</span>
                    </div>
                  )}

                  {/* Name + Role */}
                  <div className="min-w-0 flex-shrink-0 w-36 md:w-44">
                    <p className="text-sm font-bold text-on-surface truncate">{t.name || "Anonymous"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${tc.bg} ${tc.text} border ${tc.border}`}>
                        {t.platform_tier}
                      </span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="hidden md:flex flex-1 flex-wrap gap-1.5 min-w-0">
                    {(t.skills || []).slice(0, 4).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 rounded-md bg-surface-container-high/50 border border-outline-variant/20 text-[10px] font-bold text-on-surface-variant">
                        {skill}
                      </span>
                    ))}
                    {(t.skills || []).length > 4 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-on-surface-variant">
                        +{t.skills.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Availability */}
                  <div className="hidden lg:block shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border ${av.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${av.dot}`} />
                      {av.label}
                    </span>
                  </div>

                  {/* Rate */}
                  <div className="text-right shrink-0 w-20">
                    <p className="text-lg font-black font-headline text-primary tracking-tighter">${t.hourly_rate}</p>
                    <p className="text-[9px] font-bold text-on-surface-variant">/hour</p>
                  </div>

                  {/* Trust Score */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0 bg-tertiary/5 border border-tertiary/15 rounded-full px-2.5 py-1">
                    <span className="material-symbols-outlined text-tertiary text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <span className="font-black font-headline text-sm text-tertiary">{t.trust_score}</span>
                  </div>

                  {/* Action */}
                  <Link
                    href={`/facilitators/${t.id}`}
                    className="shrink-0 px-4 py-2 rounded-lg border border-outline-variant/30 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-1.5"
                  >
                    Profile
                    <span className="material-symbols-outlined text-[12px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : talent.length === 0 ? (
          /* No facilitators at all */
          <div className="py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-surface/30 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-16 text-center">
              <span className="material-symbols-outlined text-primary text-5xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
              <h3 className="text-xl font-black font-headline tracking-tight text-on-surface mb-2">Be among the first</h3>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                We&apos;re assembling our founding cohort of elite facilitators. Join now and get priority placement when clients start posting projects.
              </p>
              <Link
                href="/register?role=FACILITATOR"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-black uppercase tracking-widest text-xs hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20"
              >
                Apply as a Facilitator
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Filtered to zero */
          <div className="py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-surface/30 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-16 text-center">
              <span className="material-symbols-outlined text-outline-variant text-5xl mb-4 block">search_off</span>
              <h3 className="text-xl font-black font-headline tracking-tight text-on-surface mb-2">No matches</h3>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                No facilitators match your current filters. Try broadening your search.
              </p>
              <button
                onClick={clearAll}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
