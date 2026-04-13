import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import MarketplaceFilterBar from "@/components/dashboard/marketplace/MarketplaceFilterBar";
import MarketplaceShell from "@/components/dashboard/marketplace/MarketplaceShell";
import { Suspense } from "react";

const PAGE_SIZE = 15;

type SortOption = "newest" | "budget_desc" | "most_bidding";
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
  const sort = (resolvedParams.sort as SortOption) ?? "newest";
  const page = Math.max(1, parseInt(resolvedParams.page ?? "1", 10));

  // Build where clause — always locked to OPEN_BIDDING for the feed
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
      milestones: true,
      _count: { select: { bids: true } }
    },
    orderBy: (() => {
      switch (sort) {
        case "most_bidding": return { bids: { _count: "desc" as const } };
        default: return { created_at: "desc" as const };
      }
    })(),
    take: PAGE_SIZE,
    skip,
  });

  // In-memory budget filter & sort
  let projects = rawProjects.map(project => ({
    ...project,
    totalValue: project.milestones.reduce((acc, m) => acc + Number(m.amount), 0),
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
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <main className="lg:p-6 relative min-h-full pb-20 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[30%] w-[500px] h-[500px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="px-4 lg:px-0 relative z-10 max-w-[1400px] mx-auto w-full">

        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <span className="px-4 py-1.5 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-black font-headline tracking-widest uppercase border border-tertiary/30 mb-4 inline-block shadow-[0_0_15px_rgba(var(--color-tertiary),0.2)]">
                Open Projects
              </span>
              <h1 className="text-4xl lg:text-5xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.9]">
                Marketplace <span className="bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent">Deal Feed</span>
              </h1>
              <p className="text-on-surface-variant font-medium mt-3 text-sm leading-relaxed">
                Find projects that match your skills. Scan the brief, then bid in one step.
              </p>
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        <Suspense>
          <MarketplaceFilterBar totalCount={totalCount} />
        </Suspense>

        {/* Split-Pane Results Shell */}
        <MarketplaceShell
          projects={projects}
          userId={user.id}
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
