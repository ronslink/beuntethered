export type BudgetOption = "ALL" | "UNDER_1K" | "1K_5K" | "5K_20K" | "OVER_20K";
export type SortOption = "best_match" | "newest" | "budget_desc" | "most_bidding";
export type AlertFrequencyValue = "DAILY" | "WEEKLY" | "NEVER";

export interface NormalizedSavedSearchFilters {
  search: string;
  budget: BudgetOption;
  sort: SortOption;
}

export interface SavedSearchAlertProject {
  id: string;
  title: string;
  ai_generated_sow: string;
  created_at: Date;
  milestones: { amount: number | string | { toString(): string } }[];
  _count?: { bids?: number };
}

const BUDGET_RANGES: Record<Exclude<BudgetOption, "ALL">, { min: number; max: number | null }> = {
  UNDER_1K: { min: 0, max: 1000 },
  "1K_5K": { min: 1000, max: 5000 },
  "5K_20K": { min: 5000, max: 20000 },
  OVER_20K: { min: 20000, max: null },
};

const BUDGET_OPTIONS = new Set<BudgetOption>(["ALL", "UNDER_1K", "1K_5K", "5K_20K", "OVER_20K"]);
const SORT_OPTIONS = new Set<SortOption>(["best_match", "newest", "budget_desc", "most_bidding"]);

export function normalizeSavedSearchFilters(filters: unknown): NormalizedSavedSearchFilters {
  const value = typeof filters === "object" && filters !== null ? filters as Record<string, unknown> : {};
  const rawSearch = typeof value.search === "string" ? value.search.trim() : "";
  const rawBudget = typeof value.budget === "string" && BUDGET_OPTIONS.has(value.budget as BudgetOption)
    ? value.budget as BudgetOption
    : "ALL";
  const rawSort = typeof value.sort === "string" && SORT_OPTIONS.has(value.sort as SortOption)
    ? value.sort as SortOption
    : "best_match";

  return {
    search: rawSearch.slice(0, 120),
    budget: rawBudget,
    sort: rawSort,
  };
}

export function getAlertWindowMs(frequency: AlertFrequencyValue) {
  if (frequency === "DAILY") return 24 * 60 * 60 * 1000;
  if (frequency === "WEEKLY") return 7 * 24 * 60 * 60 * 1000;
  return null;
}

export function isSavedSearchAlertDue({
  enabled,
  alertFrequency,
  lastAlertedAt,
  now = new Date(),
}: {
  enabled: boolean;
  alertFrequency: AlertFrequencyValue;
  lastAlertedAt?: Date | null;
  now?: Date;
}) {
  if (!enabled) return false;
  const windowMs = getAlertWindowMs(alertFrequency);
  if (!windowMs) return false;
  if (!lastAlertedAt) return true;
  return now.getTime() - lastAlertedAt.getTime() >= windowMs;
}

export function getAlertWindowKey(now: Date, frequency: AlertFrequencyValue) {
  if (frequency === "WEEKLY") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const week = Math.floor(day / 7) + 1;
    return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  return now.toISOString().slice(0, 10);
}

export function getProjectTotalValue(project: SavedSearchAlertProject) {
  return project.milestones.reduce((sum, milestone) => {
    const amount = typeof milestone.amount === "number"
      ? milestone.amount
      : Number(milestone.amount.toString());
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

export function projectMatchesSavedSearchFilters(
  project: SavedSearchAlertProject,
  filters: NormalizedSavedSearchFilters
) {
  if (filters.search) {
    const haystack = `${project.title} ${project.ai_generated_sow}`.toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) return false;
  }

  if (filters.budget !== "ALL") {
    const range = BUDGET_RANGES[filters.budget];
    const totalValue = getProjectTotalValue(project);
    if (range.max === null) return totalValue >= range.min;
    return totalValue >= range.min && totalValue < range.max;
  }

  return true;
}

export function filterAndSortProjectsForSavedSearch(
  projects: SavedSearchAlertProject[],
  filters: NormalizedSavedSearchFilters
) {
  const matching = projects.filter((project) => projectMatchesSavedSearchFilters(project, filters));

  if (filters.sort === "budget_desc") {
    return matching.sort((a, b) => getProjectTotalValue(b) - getProjectTotalValue(a));
  }
  if (filters.sort === "most_bidding") {
    return matching.sort((a, b) => (b._count?.bids ?? 0) - (a._count?.bids ?? 0));
  }
  return matching.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}

export function buildMarketplaceQueryString(filters: NormalizedSavedSearchFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.budget !== "ALL") params.set("budget", filters.budget);
  if (filters.sort !== "best_match") params.set("sort", filters.sort);
  return params.toString();
}
