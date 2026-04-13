"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// Dummy talent data with images
const DUMMY_TALENT = [
  {
    id: "1",
    name: "Alex Chen",
    role: "Full-Stack Engineer",
    skills: ["React", "Node.js", "PostgreSQL"],
    hourly_rate: 150,
    trust_score: 97,
    availability: "Available Now",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
    platform_tier: "ELITE" as const,
    featured: true,
  },
  {
    id: "2",
    name: "Sarah Mitchell",
    role: "DevOps Architect",
    skills: ["AWS", "Kubernetes", "Terraform"],
    hourly_rate: 200,
    trust_score: 95,
    availability: "Available Now",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces",
    platform_tier: "ELITE" as const,
    featured: true,
  },
  {
    id: "3",
    name: "Marcus Johnson",
    role: "ML Engineer",
    skills: ["Python", "PyTorch", "MLOps"],
    hourly_rate: 220,
    trust_score: 93,
    availability: "Available in 1-2 weeks",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces",
    platform_tier: "PRO" as const,
    featured: false,
  },
  {
    id: "4",
    name: "Priya Patel",
    role: "Backend Specialist",
    skills: ["Go", "PostgreSQL", "gRPC"],
    hourly_rate: 175,
    trust_score: 91,
    availability: "Available Now",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
    platform_tier: "ELITE" as const,
    featured: true,
  },
  {
    id: "5",
    name: "Jordan Lee",
    role: "Frontend Lead",
    skills: ["React", "TypeScript", "Next.js"],
    hourly_rate: 160,
    trust_score: 89,
    availability: "Ongoing",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=faces",
    platform_tier: "PRO" as const,
    featured: false,
  },
  {
    id: "6",
    name: "Elena Rodriguez",
    role: "Data Engineer",
    skills: ["Python", "Airflow", "Spark"],
    hourly_rate: 185,
    trust_score: 88,
    availability: "Available in 1-2 weeks",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces",
    platform_tier: "PRO" as const,
    featured: false,
  },
];

const TALENT_FILTERS = {
  skill_vectors: ["React", "Node.js", "Python", "TypeScript", "PostgreSQL", "DevOps", "AI/ML"],
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
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function TalentCard({ talent, index }: { talent: any, index: number }) {
  return (
    <div
      className="group relative animate-in fade-in slide-in-from-bottom-8 duration-500"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Glow border effect */}
      <div
        className={`absolute -inset-0.5 rounded-2xl blur opacity-15 transition-all group-hover:opacity-40 group-hover:blur-md bg-gradient-to-br ${
          talent.platform_tier === "ELITE" ? "from-primary to-primary-container" : "from-tertiary to-tertiary-container"
        }`}
      />

      {/* Card */}
      <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-6 relative h-full flex flex-col hover:border-outline-variant/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 z-10">
        <div
          className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 transition-all group-hover:scale-150 ${
            talent.platform_tier === "ELITE" ? "bg-primary" : "bg-tertiary"
          }`}
        />

        <div className="flex justify-between items-start mb-5 relative z-10">
          {talent.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={talent.avatar} alt={talent.name} className="w-14 h-14 rounded-xl object-cover border-2 border-outline-variant/40 shadow-lg bg-surface-container-high" />
          ) : (
            <div className={`w-14 h-14 rounded-xl overflow-hidden border-2 border-outline-variant/40 bg-surface-container-high shadow-lg flex items-center justify-center bg-gradient-to-br from-primary to-primary-container`}>
              <span className="font-black font-headline text-lg text-on-surface">{getInitials(talent.name)}</span>
            </div>
          )}
          <span
            className={`px-3 py-1 rounded-full font-black font-headline uppercase tracking-widest text-[9px] shadow-lg border ${
              talent.platform_tier === "ELITE" ? "bg-primary/20 text-primary border-primary/50" : "bg-tertiary/20 text-tertiary border-tertiary/50"
            }`}
          >
            {talent.platform_tier}
          </span>
        </div>

        <div className="mb-5 relative z-10">
          <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface">{talent.name}</h3>
          <p className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mt-0.5">{talent.role}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-5 relative z-10">
          {talent.skills.map((skill: string) => (
            <span key={skill} className="px-2.5 py-1 rounded-md bg-surface-container-high/60 border border-outline-variant/30 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              {skill}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-baseline gap-1">
            <span className="font-black font-headline text-2xl text-primary">${talent.hourly_rate}</span>
            <span className="text-xs font-bold text-on-surface-variant">/hr</span>
          </div>
          <div className="flex items-center gap-1.5 bg-tertiary/10 border border-tertiary/30 rounded-full px-3 py-1">
            <span className="material-symbols-outlined text-tertiary text-sm">verified</span>
            <span className="font-black font-headline text-sm text-tertiary">{talent.trust_score}</span>
            <span className="text-[10px] font-bold text-on-surface-variant">/100</span>
          </div>
        </div>

        <div className="mb-5 relative z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              talent.availability === "Available Now" ? "bg-[#059669]/20 text-[#059669] border border-[#059669]/30" : talent.availability === "Available in 1-2 weeks" ? "bg-primary/20 text-primary border border-primary/30" : "bg-outline/20 text-on-surface-variant border border-outline/30"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${talent.availability === "Available Now" ? "bg-[#059669]" : talent.availability === "Available in 1-2 weeks" ? "bg-primary" : "bg-outline"}`} />
            {talent.availability}
          </span>
        </div>

        <Link
          href={`/facilitators/${talent.id}`}
          className={`mt-auto w-full group/btn block border border-outline-variant/30 rounded-xl p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg relative z-10 ${
            talent.platform_tier === "ELITE" ? "hover:bg-primary hover:border-primary hover:text-on-primary" : "hover:bg-tertiary hover:border-tertiary hover:text-on-tertiary"
          }`}
        >
          <span className="font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            View Profile
            <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function TalentPageClient() {
  const [skillFilter, setSkillFilter] = useState<string>("All");
  const [rateFilter, setRateFilter] = useState<string>("Any");
  const [trustFilter, setTrustFilter] = useState<string>("Any");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("All");

  const filteredTalent = useMemo(() => {
    return DUMMY_TALENT.filter((talent) => {
      if (skillFilter !== "All" && !talent.skills.includes(skillFilter)) return false;
      if (rateFilter !== "Any") {
        const [min, max] = RATE_RANGES[rateFilter];
        if (talent.hourly_rate < min || talent.hourly_rate > max) return false;
      }
      if (trustFilter !== "Any") {
        const threshold = TRUST_THRESHOLDS[trustFilter];
        if (talent.trust_score < threshold) return false;
      }
      if (availabilityFilter !== "All" && talent.availability !== availabilityFilter) return false;
      return true;
    });
  }, [skillFilter, rateFilter, trustFilter, availabilityFilter]);

  const featuredTalent = filteredTalent.filter(t => t.featured);
  const regularTalent = filteredTalent.filter(t => !t.featured);

  return (
    <main className="min-h-screen bg-[#07090F] relative overflow-hidden selection:bg-tertiary/30 pb-20">
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-tertiary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 relative z-10">
        <header className="text-center max-w-3xl mx-auto pt-20 pb-12 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <span className="font-headline font-black tracking-widest uppercase text-tertiary text-sm px-6 py-2 rounded-full border border-tertiary/30 bg-tertiary/10 shadow-[0_0_20px_rgba(var(--color-tertiary),0.2)] inline-block">
            Curated Network
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.9]">
            Discover Top{" "}
            <span className="bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent">Facilitators</span>
          </h1>
          <p className="text-on-surface-variant text-lg font-medium max-w-2xl mx-auto">
            Instead of sifting through thousands of profiles, we highlight the most vetted, high-performing experts ready to deliver.
          </p>
        </header>

        <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: "150ms" }}>
          <div className="bg-surface/40 backdrop-blur-3xl border border-outline-variant/30 rounded-2xl p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Skill</label>
                <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="bg-surface-container/80 border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer">
                  <option value="All">All Skills</option>
                  {TALENT_FILTERS.skill_vectors.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Hourly Rate</label>
                <select value={rateFilter} onChange={(e) => setRateFilter(e.target.value)} className="bg-surface-container/80 border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer">
                  <option value="Any">Any Rate</option>
                  {TALENT_FILTERS.hourly_rates.map((rate) => <option key={rate} value={rate}>{rate}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Trust Score</label>
                <select value={trustFilter} onChange={(e) => setTrustFilter(e.target.value)} className="bg-surface-container/80 border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer">
                  <option value="Any">Any Score</option>
                  {TALENT_FILTERS.trust_scores.map((score) => <option key={score} value={score}>{score}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Availability</label>
                <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="bg-surface-container/80 border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary transition-colors cursor-pointer">
                  <option value="All">Any Availability</option>
                  {TALENT_FILTERS.availability.map((avail) => <option key={avail} value={avail}>{avail}</option>)}
                </select>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs font-bold text-on-surface-variant border md:border-l-2 md:pl-4 border-outline-variant/20 rounded-xl md:rounded-none md:border-y-0 md:border-r-0 px-4 md:px-0 py-2 md:py-0 bg-surface-container/30 md:bg-transparent">
                <span className="material-symbols-outlined text-sm text-primary">verified</span>
                <span>{filteredTalent.length} Matching Experts</span>
              </div>
            </div>
          </div>
        </div>

        {filteredTalent.length > 0 ? (
          <div className="space-y-16">
            {/* Featured Picks */}
            {featuredTalent.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface">Untether Spotlight</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {featuredTalent.map((talent, idx) => (
                    <TalentCard key={talent.id} talent={talent} index={idx} />
                  ))}
                </div>
              </section>
            )}

            {/* Trending Talent */}
            {regularTalent.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">trending_up</span>
                    <h2 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface">Trending Facilitators</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-90">
                  {regularTalent.map((talent, idx) => (
                    <TalentCard key={talent.id} talent={talent} index={idx} />
                  ))}
                </div>
                <div className="mt-12 text-center">
                  <button className="px-6 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface font-black uppercase tracking-widest text-xs hover:border-primary/50 hover:bg-surface-container-highest transition-colors">
                    Load More Match Candidates
                  </button>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-surface/30 backdrop-blur-3xl border border-outline-variant/20 rounded-2xl p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
               <span className="material-symbols-outlined text-outline-variant text-6xl mb-4 block">search_off</span>
              <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Matches Found</h3>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-6">No facilitators match your current filter criteria. Try adjusting your filters to see more results.</p>
              <button
                onClick={() => { setSkillFilter("All"); setRateFilter("Any"); setTrustFilter("Any"); setAvailabilityFilter("All"); }}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
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
