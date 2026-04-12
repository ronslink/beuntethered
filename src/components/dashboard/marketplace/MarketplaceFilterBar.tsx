"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useCallback } from "react";

type SortOption = "newest" | "budget_desc" | "most_bidding";
type StatusOption = "ALL" | "OPEN_BIDDING" | "ACTIVE" | "COMPLETED" | "DISPUTED";
type BudgetOption = "ALL" | "UNDER_1K" | "1K_5K" | "5K_20K" | "OVER_20K";

const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "OPEN_BIDDING", label: "Open Bidding" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DISPUTED", label: "Disputed" },
];

const BUDGET_OPTIONS: { value: BudgetOption; label: string }[] = [
  { value: "ALL", label: "All Budgets" },
  { value: "UNDER_1K", label: "Under $1K" },
  { value: "1K_5K", label: "$1K – $5K" },
  { value: "5K_20K", label: "$5K – $20K" },
  { value: "OVER_20K", label: "$20K+" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "budget_desc", label: "Budget: High–Low" },
  { value: "most_bidding", label: "Most Bidding" },
];

interface MarketplaceFilterBarProps {
  totalCount?: number;
}

export default function MarketplaceFilterBar({ totalCount }: MarketplaceFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<StatusOption>(searchParams.get("status") as StatusOption ?? "ALL");
  const [budget, setBudget] = useState<BudgetOption>(searchParams.get("budget") as BudgetOption ?? "ALL");
  const [sort, setSort] = useState<SortOption>(searchParams.get("sort") as SortOption ?? "newest");

  const applyFilters = useCallback((overrides?: { search?: string; status?: StatusOption; budget?: BudgetOption; sort?: SortOption }) => {
    const s = overrides?.search ?? search;
    const st = overrides?.status ?? status;
    const b = overrides?.budget ?? budget;
    const so = overrides?.sort ?? sort;

    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (st !== "ALL") params.set("status", st);
    if (b !== "ALL") params.set("budget", b);
    if (so !== "newest") params.set("sort", so);
    params.delete("page"); // reset to page 1 on filter change

    const query = params.toString();
    router.push(`/marketplace${query ? `?${query}` : ""}`);
  }, [search, status, budget, sort, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => applyFilters());
  };

  const handleClear = () => {
    setSearch("");
    setStatus("ALL");
    setBudget("ALL");
    setSort("newest");
    router.push("/marketplace");
  };

  const hasActiveFilters = search || status !== "ALL" || budget !== "ALL" || sort !== "newest";

  return (
    <div className="mb-8">
      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-end">

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1.5">Search</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Project title or description..."
              className="w-full bg-surface border border-outline-variant/30 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
        </form>

        {/* Status */}
        <div className="min-w-[140px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1.5">Status</label>
          <select
            value={status}
            onChange={e => { const v = e.target.value as StatusOption; setStatus(v); startTransition(() => applyFilters({ status: v })); }}
            className="w-full bg-surface border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer appearance-none"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Budget */}
        <div className="min-w-[140px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1.5">Budget</label>
          <select
            value={budget}
            onChange={e => { const v = e.target.value as BudgetOption; setBudget(v); startTransition(() => applyFilters({ budget: v })); }}
            className="w-full bg-surface border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer appearance-none"
          >
            {BUDGET_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="min-w-[160px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1.5">Sort By</label>
          <select
            value={sort}
            onChange={e => { const v = e.target.value as SortOption; setSort(v); startTransition(() => applyFilters({ sort: v })); }}
            className="w-full bg-surface border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer appearance-none"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-outline-variant/30 text-on-surface-variant hover:border-error hover:text-error transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count + pending indicator */}
      {isPending && (
        <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-primary animate-spin text-sm">progress_activity</span>
          Updating results...
        </div>
      )}
      {!isPending && totalCount !== undefined && (
        <p className="mt-3 text-xs text-on-surface-variant font-medium">
          {totalCount === 0 ? "No projects found" : `Showing ${totalCount} project${totalCount !== 1 ? "s" : ""}`}
          {hasActiveFilters && " with active filters"}
        </p>
      )}
    </div>
  );
}
