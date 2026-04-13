"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Metadata } from "next";

// SEO Metadata
export const metadata: Metadata = {
  title: "Hire Expert Pre-vetted Project Facilitators | beuntethered",
  description:
    "Access a curated network of elite facilitators ready to deliver complex projects. Browse verified experts, compare trust scores, and hire with confidence.",
  keywords: [
    "hire developers",
    "project facilitators",
    "freelance talent",
    "pre-vetted experts",
  ],
  openGraph: {
    title: "Hire Expert Pre-vetted Project Facilitators",
    description:
      "Curated network of elite facilitators for complex project delivery.",
    type: "website",
  },
};

// Dummy talent data
const DUMMY_TALENT = [
  {
    id: "1",
    name: "Alex Chen",
    role: "Full-Stack Engineer",
    skills: ["React", "Node.js", "PostgreSQL"],
    hourly_rate: 150,
    trust_score: 97,
    availability: "Available Now",
    avatar: null,
    platform_tier: "ELITE" as const,
  },
  {
    id: "2",
    name: "Sarah Mitchell",
    role: "DevOps Architect",
    skills: ["AWS", "Kubernetes", "Terraform"],
    hourly_rate: 200,
    trust_score: 95,
    availability: "Available Now",
    avatar: null,
    platform_tier: "ELITE" as const,
  },
  {
    id: "3",
    name: "Marcus Johnson",
    role: "ML Engineer",
    skills: ["Python", "PyTorch", "MLOps"],
    hourly_rate: 220,
    trust_score: 93,
    availability: "Available in 1-2 weeks",
    avatar: null,
    platform_tier: "PRO" as const,
  },
  {
    id: "4",
    name: "Priya Patel",
    role: "Backend Specialist",
    skills: ["Go", "PostgreSQL", "gRPC"],
    hourly_rate: 175,
    trust_score: 91,
    availability: "Available Now",
    avatar: null,
    platform_tier: "ELITE" as const,
  },
  {
    id: "5",
    name: "Jordan Lee",
    role: "Frontend Lead",
    skills: ["React", "TypeScript", "Next.js"],
    hourly_rate: 160,
    trust_score: 89,
    availability: "Ongoing",
    avatar: null,
    platform_tier: "PRO" as const,
  },
  {
    id: "6",
    name: "Elena Rodriguez",
    role: "Data Engineer",
    skills: ["Python", "Airflow", "Spark"],
    hourly_rate: 185,
    trust_score: 88,
    availability: "Available in 1-2 weeks",
    avatar: null,
    platform_tier: "PRO" as const,
  },
];

const TALENT_FILTERS = {
  skill_vectors: [
    "React",
    "Node.js",
    "Python",
    "TypeScript",
    "PostgreSQL",
    "DevOps",
    "AI/ML",
  ],
  hourly_rates: ["$50-100", "$100-200", "$200-400", "$400+"],
  trust_scores: ["95+", "85+", "70+", "Any"],
  availability: ["Available Now", "Available in 1-2 weeks", "Ongoing"],
};

const RATE_RANGES: Record<string, [number, number]> = {
  "$50-100": [50, 100],
  "$100-200": [100, 200],
  "$200-400": [200, 400],
  "$400+": [400, Infinity],
};

const TRUST_THRESHOLDS: Record<string, number> = {
  "95+": 95,
  "85+": 85,
  "70+": 70,
  Any: 0,
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(id: string): string {
  const colors = [
    "from-primary to-primary-container",
    "from-tertiary to-tertiary-container",
    "from-secondary to-secondary-container",
  ];
  const idx = parseInt(id, 10) % colors.length;
  return colors[idx];
}

export default function PublicTalentPage() {
  const [skillFilter, setSkillFilter] = useState<string>("All");
  const [rateFilter, setRateFilter] = useState<string>("Any");
  const [trustFilter, setTrustFilter] = useState<string>("Any");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("All");

  const filteredTalent = useMemo(() => {
    return DUMMY_TALENT.filter((talent) => {
      // Skill filter
      if (skillFilter !== "All" && !talent.skills.includes(skillFilter)) {
        return false;
      }

      // Rate filter
      if (rateFilter !== "Any") {
        const [min, max] = RATE_RANGES[rateFilter];
        if (talent.hourly_rate < min || talent.hourly_rate > max) {
          return false;
        }
      }

      // Trust score filter
      if (trustFilter !== "Any") {
        const threshold = TRUST_THRESHOLDS[trustFilter];
        if (talent.trust_score < threshold) {
          return false;
        }
      }

      // Availability filter
      if (
        availabilityFilter !== "All" &&
        talent.availability !== availabilityFilter
      ) {
        return false;
      }

      return true;
    });
  }, [skillFilter, rateFilter, trustFilter, availabilityFilter]);

  return (
    <main className="min-h-screen bg-[#07090F] relative overflow-hidden selection:bg-tertiary/30">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-tertiary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 relative z-10">
        {/* Hero Section */}
        <header className="text-center max-w-3xl mx-auto pt-20 pb-12 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <span className="font-headline font-black tracking-widest uppercase text-tertiary text-sm px-6 py-2 rounded-full border border-tertiary/30 bg-tertiary/10 shadow-[0_0_20px_rgba(var(--color-tertiary),0.2)] inline-block">
            Pre-Vetted Talent
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.9]">
            Find Your Next{" "}
            <span className="bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent">
              Project Facilitator
            </span>
          </h1>
          <p className="text-on-surface-variant text-lg font-medium max-w-2xl mx-auto">
            Access a curated network of elite facilitators ready to deliver
            complex projects. Every expert is vetted, tested, and backed by our
            trust score system.
          </p>
        </header>

        {/* Glassmorphic Filter Bar */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: "150ms" }}>
          <div className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/30 rounded-2xl p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {/* Skill Filter */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                  Skill
                </label>
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="bg-surface-container/80 border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="All">All Skills</option>
                  {TALENT_FILTERS.skill_vectors.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate Filter */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                  Hourly Rate
                </label>
                <select
                  value={rateFilter}
                  onChange={(e) => setRateFilter(e.target.value)}
                  className="bg-surface-container/80 border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="Any">Any Rate</option>
                  {TALENT_FILTERS.hourly_rates.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trust Score Filter */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                  Trust Score
                </label>
                <select
                  value={trustFilter}
                  onChange={(e) => setTrustFilter(e.target.value)}
                  className="bg-surface-container/80 border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="Any">Any Score</option>
                  {TALENT_FILTERS.trust_scores.map((score) => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                  Availability
                </label>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="bg-surface-container/80 border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="All">Any Availability</option>
                  {TALENT_FILTERS.availability.map((avail) => (
                    <option key={avail} value={avail}>
                      {avail}
                    </option>
                  ))}
                </select>
              </div>

              {/* Result count */}
              <div className="ml-auto flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">
                  people
                </span>
                <span>
                  {filteredTalent.length} talent
                  {filteredTalent.length !== DUMMY_TALENT.length
                    ? ` (filtered from ${DUMMY_TALENT.length})`
                    : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Talent Grid */}
        {filteredTalent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
            {filteredTalent.map((talent, idx) => (
              <div
                key={talent.id}
                className="group relative animate-in fade-in slide-in-from-bottom-8 duration-500"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Glow border effect */}
                <div
                  className={`absolute -inset-0.5 rounded-2xl blur opacity-15 transition-all group-hover:opacity-40 group-hover:blur-md bg-gradient-to-br ${
                    talent.platform_tier === "ELITE"
                      ? "from-primary to-primary-container"
                      : "from-tertiary to-tertiary-container"
                  }`}
                />

                {/* Card */}
                <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-6 relative h-full flex flex-col hover:border-outline-variant/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 z-10">
                  {/* Top accent glow */}
                  <div
                    className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 transition-all group-hover:scale-150 ${
                      talent.platform_tier === "ELITE"
                        ? "bg-primary"
                        : "bg-tertiary"
                    }`}
                  />

                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-5 relative z-10">
                    {/* Avatar */}
                    <div
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 border-outline-variant/40 bg-surface-container-high shadow-lg flex items-center justify-center bg-gradient-to-br ${getAvatarColor(
                        talent.id
                      )}`}
                    >
                      <span className="font-black font-headline text-lg text-on-surface">
                        {getInitials(talent.name)}
                      </span>
                    </div>

                    {/* Platform Tier Badge */}
                    <span
                      className={`px-3 py-1 rounded-full font-black font-headline uppercase tracking-widest text-[9px] shadow-lg border ${
                        talent.platform_tier === "ELITE"
                          ? "bg-primary/20 text-primary border-primary/50"
                          : "bg-tertiary/20 text-tertiary border-tertiary/50"
                      }`}
                    >
                      {talent.platform_tier}
                    </span>
                  </div>

                  {/* Name & Role */}
                  <div className="mb-5 relative z-10">
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface">
                      {talent.name}
                    </h3>
                    <p className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mt-0.5">
                      {talent.role}
                    </p>
                  </div>

                  {/* Skills Tags */}
                  <div className="flex flex-wrap gap-2 mb-5 relative z-10">
                    {talent.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-md bg-surface-container-high/60 border border-outline-variant/30 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between mb-5 relative z-10">
                    <div className="flex items-baseline gap-1">
                      <span className="font-black font-headline text-2xl text-primary">
                        ${talent.hourly_rate}
                      </span>
                      <span className="text-xs font-bold text-on-surface-variant">
                        /hr
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-tertiary/10 border border-tertiary/30 rounded-full px-3 py-1">
                      <span className="material-symbols-outlined text-tertiary text-sm">
                        verified
                      </span>
                      <span className="font-black font-headline text-sm text-tertiary">
                        {talent.trust_score}
                      </span>
                      <span className="text-[10px] font-bold text-on-surface-variant">
                        /100
                      </span>
                    </div>
                  </div>

                  {/* Availability Pill */}
                  <div className="mb-5 relative z-10">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        talent.availability === "Available Now"
                          ? "bg-[#059669]/20 text-[#059669] border border-[#059669]/30"
                          : talent.availability === "Available in 1-2 weeks"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-outline/20 text-on-surface-variant border border-outline/30"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          talent.availability === "Available Now"
                            ? "bg-[#059669]"
                            : talent.availability === "Available in 1-2 weeks"
                            ? "bg-primary"
                            : "bg-outline"
                        }`}
                      />
                      {talent.availability}
                    </span>
                  </div>

                  {/* Hire Button */}
                  <Link
                    href={`/facilitators/${talent.id}`}
                    className={`mt-auto w-full group/btn block border border-outline-variant/30 rounded-xl p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg relative z-10 ${
                      talent.platform_tier === "ELITE"
                        ? "hover:bg-primary hover:border-primary hover:text-on-primary"
                        : "hover:bg-tertiary hover:border-tertiary hover:text-on-tertiary"
                    }`}
                  >
                    <span className="font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                      Hire Now
                      <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-surface/30 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <span className="material-symbols-outlined text-outline-variant text-6xl mb-4 block">
                search_off
              </span>
              <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">
                No Matches Found
              </h3>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                No facilitators match your current filter criteria. Try adjusting
                your filters to see more results.
              </p>
              <button
                onClick={() => {
                  setSkillFilter("All");
                  setRateFilter("Any");
                  setTrustFilter("Any");
                  setAvailabilityFilter("All");
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Stats Footer */}
        <footer className="border-t border-outline-variant/20 py-12 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: "300ms" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="font-black font-headline text-4xl text-primary mb-1">
                500+
              </div>
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                Verified Facilitators
              </p>
            </div>
            <div>
              <div className="font-black font-headline text-4xl text-tertiary mb-1">
                98%
              </div>
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                Client Satisfaction
              </p>
            </div>
            <div>
              <div className="font-black font-headline text-4xl text-secondary mb-1">
                $50M+
              </div>
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                Value Delivered
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}