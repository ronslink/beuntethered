"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useCallback } from "react";

type SortOption = "newest" | "budget_desc" | "most_bidding";
type StatusOption = "ALL" | "OPEN_BIDDING" | "ACTIVE" | "COMPLETED" | "DISPUTED";
type BudgetOption = "ALL" | "UNDER_1K" | "1K_5K" | "5K_20K" | "OVER_20K";

const BUDGET_OPTIONS: { value: BudgetOption; label: string }[] = [
  { value: "ALL", label: "Any Budget" },
  { value: "UNDER_1K", label: "Under $1K" },
  { value: "1K_5K", label: "$1K – $5K" },
  { value: "5K_20K", label: "$5K – $20K" },
  { value: "OVER_20K", label: "$20K+" },
];

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "newest", label: "Newest", icon: "schedule" },
  { value: "budget_desc", label: "Highest Budget", icon: "trending_up" },
  { value: "most_bidding", label: "Most Active", icon: "local_fire_department" },
];

interface MarketplaceFilterBarProps {
  totalCount?: number;
}

export default function MarketplaceFilterBar({ totalCount }: MarketplaceFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [budget, setBudget] = useState<BudgetOption>(searchParams.get("budget") as BudgetOption ?? "ALL");
  const [sort, setSort] = useState<SortOption>(searchParams.get("sort") as SortOption ?? "newest");

  const applyFilters = useCallback((overrides?: { search?: string; budget?: BudgetOption; sort?: SortOption }) => {
    const s = overrides?.search ?? search;
    const b = overrides?.budget ?? budget;
    const so = overrides?.sort ?? sort;

    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (b !== "ALL") params.set("budget", b);
    if (so !== "newest") params.set("sort", so);
    params.delete("page");

    const query = params.toString();
    startTransition(() => {
      router.push(`/marketplace${query ? `?${query}` : ""}`);
    });
  }, [search, budget, sort, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleClear = () => {
    setSearch("");
    setBudget("ALL");
    setSort("newest");
    router.push("/marketplace");
  };

  const hasActiveFilters = search || budget !== "ALL" || sort !== "newest";

  return (
    <div className="mb-6 space-y-4">
      {/* Search Row */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, stack, or keyword..."
          className="w-full bg-surface border border-outline-variant/30 rounded-2xl pl-11 pr-28 py-3.5 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-on-primary px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>

      {/* Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Budget Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0">Budget:</span>
          {BUDGET_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setBudget(opt.value); applyFilters({ budget: opt.value }); }}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all border ${
                budget === opt.value
                  ? "bg-primary text-on-primary border-primary shadow-sm shadow-primary/20"
                  : "bg-surface border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-outline-variant/30 hidden sm:block" />

        {/* Sort Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0">Sort:</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); applyFilters({ sort: opt.value }); }}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all border flex items-center gap-1.5 ${
                sort === opt.value
                  ? "bg-surface-container-high text-on-surface border-outline-variant/50"
                  : "bg-surface border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60 hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-error/30 text-error hover:bg-error/5 transition-all ml-auto"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            Clear
          </button>
        )}
      </div>

      {/* Results + Loading */}
      <div className="flex items-center gap-2 h-5">
        {isPending ? (
          <>
            <span className="material-symbols-outlined text-primary animate-spin text-sm">progress_activity</span>
            <span className="text-xs text-on-surface-variant font-medium">Searching...</span>
          </>
        ) : totalCount !== undefined ? (
          <p className="text-xs text-on-surface-variant font-medium">
            <span className="text-on-surface font-bold">{totalCount}</span>
            {" "}{totalCount === 1 ? "project" : "projects"} available
            {hasActiveFilters && <span className="text-primary font-bold"> · filtered</span>}
          </p>
        ) : null}
      </div>
    </div>
  );
}
