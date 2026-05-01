import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import MarketplaceFilterBar from "@/components/dashboard/marketplace/MarketplaceFilterBar";
import MarketplaceShell from "@/components/dashboard/marketplace/MarketplaceShell";
import { computeOpportunityFit } from "@/lib/opportunity-fit";
import { normalizeSavedSearchFilters } from "@/lib/saved-search-alert-rules";
import { Suspense } from "react";
import type { ProjectInviteStatus } from "@prisma/client";

const PAGE_SIZE = 15;
const ACTIVE_INVITE_STATUSES: ProjectInviteStatus[] = ["SENT", "VIEWED", "ACCEPTED"];

type SortOption = "best_match" | "newest" | "budget_desc" | "most_bidding";
type BudgetOption = "ALL" | "UNDER_1K" | "1K_5K" | "5K_20K" | "OVER_20K";

const BUDGET_RANGES: Record<Exclude<BudgetOption, "ALL">, { min: number; max: number | null }> = {
  UNDER_1K: { min: 0, max: 1000 },
  "1K_5K": { min: 1000, max: 5000 },
  "5K_20K": { min: 5000, max: 20000 },
  OVER_20K: { min: 20000, max: null },
};

interface SearchParams {
  search?: string;
  budget?: string;
  sort?: string;
  page?: string;
}

export default async function MarketplaceDealFeed({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");

  const resolvedParams = await searchParams;
  const search = resolvedParams.search?.trim() ?? "";
  const budget = resolvedParams.budget ?? "ALL";
  const sort = (resolvedParams.sort as SortOption) ?? "best_match";
  const page = Math.max(1, parseInt(resolvedParams.page ?? "1", 10));
  const facilitatorProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      skills: true,
      ai_agent_stack: true,
      trust_score: true,
      average_ai_audit_score: true,
      total_sprints_completed: true,
      platform_tier: true,
      availability: true,
      portfolio_url: true,
      proof_capabilities: true,
    },
  });
  const savedSearches = await prisma.savedSearch.findMany({
    where: { user_id: user.id },
    orderBy: { updated_at: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      alert_frequency: true,
      enabled: true,
      last_alerted_at: true,
      last_alert_match_count: true,
      filters: true,
    },
  });

  // Build where clause. Always locked to OPEN_BIDDING for the feed.
  const where: Record<string, unknown> = { status: "OPEN_BIDDING" };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { ai_generated_sow: { contains: search, mode: "insensitive" } },
    ];
  }

  const totalCount = await prisma.project.count({ where });
  const skip = (page - 1) * PAGE_SIZE;

  const rawProjects = await prisma.project.findMany({
    where,
    include: {
      organization: { select: { name: true, type: true, website: true } },
      milestones: true,
      invites: {
        where: { facilitator_id: user.id, status: { in: ACTIVE_INVITE_STATUSES } },
        select: { id: true, status: true },
      },
      _count: { select: { bids: true } }
    },
    orderBy: (() => {
      switch (sort) {
        case "most_bidding": return { bids: { _count: "desc" as const } };
        case "best_match": return { created_at: "desc" as const };
        default: return { created_at: "desc" as const };
      }
    })(),
    take: PAGE_SIZE,
    skip,
  });

  // In-memory budget filter & sort
  let projects = rawProjects.map(project => ({
    ...project,
    created_at: project.created_at.toISOString(),
    milestones: project.milestones.map(milestone => ({
      ...milestone,
      amount: Number(milestone.amount),
      paid_at: milestone.paid_at?.toISOString() ?? null,
    })),
    totalValue: project.milestones.reduce((acc, m) => acc + Number(m.amount), 0),
    invited: project.invites.length > 0,
    inviteStatus: project.invites[0]?.status,
    opportunityFit: computeOpportunityFit(project, facilitatorProfile),
  }));

  if (budget !== "ALL" && budget in BUDGET_RANGES) {
    const range = BUDGET_RANGES[budget as Exclude<BudgetOption, "ALL">];
    projects = projects.filter(p => {
      if (range.max === null) return p.totalValue >= range.min;
      return p.totalValue >= range.min && p.totalValue < range.max;
    });
  }

  if (sort === "budget_desc") {
    projects.sort((a, b) => b.totalValue - a.totalValue);
  } else if (sort === "best_match") {
    projects.sort((a, b) => b.opportunityFit.score - a.opportunityFit.score);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <main className="lg:p-6 relative min-h-full pb-20 overflow-hidden">
      <div className="px-4 lg:px-0 relative z-10 max-w-[1400px] mx-auto w-full">

        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <span className="px-3 py-1 rounded-md bg-surface-container-low text-on-surface-variant text-[10px] font-bold tracking-widest uppercase border border-outline-variant/30 mb-3 inline-block">
                Open Projects
              </span>
              <h1 className="text-2xl lg:text-3xl font-black font-headline tracking-tight text-on-surface uppercase leading-tight">
                Marketplace Deal Feed
              </h1>
              <p className="text-on-surface-variant font-medium mt-2 text-sm leading-relaxed max-w-2xl">
                Review verified software opportunities, invited work, escrow expectations, and milestone scope before bidding.
              </p>
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        <Suspense>
          <MarketplaceFilterBar
            totalCount={totalCount}
            savedSearches={savedSearches.map((savedSearch) => ({
              id: savedSearch.id,
              name: savedSearch.name,
              alertFrequency: savedSearch.alert_frequency,
              enabled: savedSearch.enabled,
              lastAlertedAt: savedSearch.last_alerted_at?.toISOString() ?? null,
              lastAlertMatchCount: savedSearch.last_alert_match_count,
              filters: normalizeSavedSearchFilters(savedSearch.filters),
            }))}
          />
        </Suspense>

        {/* Split-Pane Results Shell */}
        <MarketplaceShell
          projects={projects}
          page={page}
          totalPages={totalPages}
          searchParams={{
            search: resolvedParams.search,
            budget: resolvedParams.budget,
            sort: resolvedParams.sort,
          }}
        />
      </div>
    </main>
  );
}
