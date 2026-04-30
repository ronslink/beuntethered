"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { deleteMarketplaceSearch, saveMarketplaceSearch, updateMarketplaceSearch } from "@/app/actions/saved-searches";

type SortOption = "best_match" | "newest" | "budget_desc" | "most_bidding";
type BudgetOption = "ALL" | "UNDER_1K" | "1K_5K" | "5K_20K" | "OVER_20K";

const BUDGET_OPTIONS: { value: BudgetOption; label: string }[] = [
  { value: "ALL", label: "Any Budget" },
  { value: "UNDER_1K", label: "Under $1K" },
  { value: "1K_5K", label: "$1K-$5K" },
  { value: "5K_20K", label: "$5K-$20K" },
  { value: "OVER_20K", label: "$20K+" },
];

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "best_match", label: "Best Fit", icon: "verified" },
  { value: "newest", label: "Newest", icon: "schedule" },
  { value: "budget_desc", label: "Highest Budget", icon: "trending_up" },
  { value: "most_bidding", label: "Most Active", icon: "local_fire_department" },
];

type SavedMarketplaceSearch = {
  id: string;
  name: string;
  alertFrequency: "DAILY" | "WEEKLY" | "NEVER";
  enabled: boolean;
  lastAlertedAt: string | null;
  lastAlertMatchCount: number;
  filters: {
    search: string;
    budget: BudgetOption;
    sort: SortOption;
  };
};

interface MarketplaceFilterBarProps {
  totalCount?: number;
  savedSearches?: SavedMarketplaceSearch[];
}

export default function MarketplaceFilterBar({ totalCount, savedSearches = [] }: MarketplaceFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [budget, setBudget] = useState<BudgetOption>(searchParams.get("budget") as BudgetOption ?? "ALL");
  const [sort, setSort] = useState<SortOption>(searchParams.get("sort") as SortOption ?? "best_match");
  const [saveStatus, setSaveStatus] = useState("");
  const [activeSavedSearches, setActiveSavedSearches] = useState(savedSearches);

  useEffect(() => {
    setActiveSavedSearches(savedSearches);
  }, [savedSearches]);

  const applyFilters = useCallback((overrides?: { search?: string; budget?: BudgetOption; sort?: SortOption }) => {
    const s = overrides?.search ?? search;
    const b = overrides?.budget ?? budget;
    const so = overrides?.sort ?? sort;

    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (b !== "ALL") params.set("budget", b);
    if (so !== "best_match") params.set("sort", so);
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
    setSort("best_match");
    router.push("/marketplace");
  };

  const hasActiveFilters = search || budget !== "ALL" || sort !== "best_match";
  const handleSaveSearch = async () => {
    const name = search || `${budget === "ALL" ? "All budgets" : budget} projects`;
    setSaveStatus("Saving...");
    const res = await saveMarketplaceSearch({
      name,
      filters: { search, budget, sort },
      alertFrequency: "DAILY",
      enabled: true,
    });
    setSaveStatus(res.success ? "Saved with daily alerts." : res.error || "Could not save search.");
    if (res.success) router.refresh();
  };

  const handleDeleteSavedSearch = async (savedSearchId: string) => {
    setActiveSavedSearches(prev => prev.filter(search => search.id !== savedSearchId));
    const res = await deleteMarketplaceSearch(savedSearchId);
    if (!res.success) {
      setSaveStatus(res.error || "Could not remove saved alert.");
      router.refresh();
    }
  };

  const applySavedSearch = (savedSearch: SavedMarketplaceSearch) => {
    setSearch(savedSearch.filters.search);
    setBudget(savedSearch.filters.budget);
    setSort(savedSearch.filters.sort);
    applyFilters(savedSearch.filters);
  };

  const handleSavedSearchUpdate = async (
    savedSearchId: string,
    updates: { alertFrequency?: "DAILY" | "WEEKLY" | "NEVER"; enabled?: boolean }
  ) => {
    setActiveSavedSearches(prev => prev.map(savedSearch => (
      savedSearch.id === savedSearchId
        ? {
            ...savedSearch,
            alertFrequency: updates.alertFrequency ?? savedSearch.alertFrequency,
            enabled: updates.enabled ?? savedSearch.enabled,
          }
        : savedSearch
    )));
    const res = await updateMarketplaceSearch({ savedSearchId, ...updates });
    if (!res.success) {
      setSaveStatus(res.error || "Could not update saved alert.");
      router.refresh();
    }
  };

  const formatAlertedAt = (value: string | null) => {
    if (!value) return "Not sent yet";
    const date = new Date(value);
    return `Last sent ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  };

  return (
    <div className="mb-6 space-y-4 border border-outline-variant/30 bg-surface p-4 rounded-lg">
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
          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg pl-11 pr-28 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-on-primary px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
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
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all border ${
                budget === opt.value
                  ? "bg-primary text-on-primary border-primary"
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
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all border flex items-center gap-1.5 ${
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest border border-error/30 text-error hover:bg-error/5 transition-all ml-auto"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            Clear
          </button>
        )}
        {hasActiveFilters && (
          <button
            onClick={handleSaveSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest border border-primary/30 text-primary hover:bg-primary/5 transition-all"
          >
            <span className="material-symbols-outlined text-[13px]">notifications_active</span>
            Save Alert
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
        {saveStatus && <span className="text-xs text-primary font-bold ml-2">{saveStatus}</span>}
      </div>

      {activeSavedSearches.length > 0 && (
        <div className="border-t border-outline-variant/20 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-[15px]">notifications_active</span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Saved Alerts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSavedSearches.map((savedSearch) => (
              <div key={savedSearch.id} className="flex max-w-full items-center gap-2 rounded-md border border-outline-variant/30 bg-surface-container-low px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-on-surface">{savedSearch.name}</p>
                  <p className="text-[10px] font-medium text-on-surface-variant">
                    {savedSearch.enabled ? savedSearch.alertFrequency.toLowerCase() : "paused"} · {formatAlertedAt(savedSearch.lastAlertedAt)}
                    {savedSearch.lastAlertMatchCount > 0 ? ` · ${savedSearch.lastAlertMatchCount} matches` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applySavedSearch(savedSearch)}
                  className="rounded border border-outline-variant/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/5"
                >
                  Apply
                </button>
                <select
                  value={savedSearch.alertFrequency}
                  onChange={(event) => handleSavedSearchUpdate(savedSearch.id, {
                    alertFrequency: event.target.value as "DAILY" | "WEEKLY" | "NEVER",
                    enabled: event.target.value !== "NEVER",
                  })}
                  className="h-7 rounded border border-outline-variant/30 bg-surface px-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant outline-none"
                  aria-label={`Alert frequency for ${savedSearch.name}`}
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="NEVER">Off</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleSavedSearchUpdate(savedSearch.id, { enabled: !savedSearch.enabled })}
                  className={`rounded p-1 transition-colors ${
                    savedSearch.enabled
                      ? "text-primary hover:bg-primary/10"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                  title={savedSearch.enabled ? "Pause saved alert" : "Resume saved alert"}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {savedSearch.enabled ? "notifications_active" : "notifications_off"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSavedSearch(savedSearch.id)}
                  className="ml-1 rounded p-1 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                  title="Remove saved alert"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
