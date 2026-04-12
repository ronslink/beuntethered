import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProjectDealCard from "@/components/dashboard/marketplace/ProjectDealCard";
import MarketplaceFilterBar from "@/components/dashboard/marketplace/MarketplaceFilterBar";

const PAGE_SIZE = 20;

type SortOption = "newest" | "budget_desc" | "most_bidding";
type BudgetOption = "ALL" | "UNDER_1K" | "1K_5K" | "5K_20K" | "OVER_20K";

// Consistent match score based on UUID hash to prevent hydration/render bouncing
function generateConsistentMockScore(projectId: string, userId: string): number {
  let hash = 0;
  const str = projectId + userId;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 85 + (Math.abs(hash) % 14);
}

// Budget range filter map
const BUDGET_RANGES: Record<Exclude<BudgetOption, "ALL">, { min: number; max: number | null }> = {
  UNDER_1K: { min: 0, max: 1000 },
  "1K_5K": { min: 1000, max: 5000 },
  "5K_20K": { min: 5000, max: 20000 },
  OVER_20K: { min: 20000, max: null },
};

interface SearchParams {
  search?: string;
  status?: string;
  budget?: string;
  sort?: string;
  page?: string;
}

export default async function MarketplaceDealFeed({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");

  const search = searchParams.search?.trim() ?? "";
  const status = searchParams.status ?? "ALL";
  const budget = searchParams.budget ?? "ALL";
  const sort = (searchParams.sort as SortOption) ?? "newest";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  // Build Prisma where clause
  const where: Record<string, unknown> = {};

  // Status filter
  if (status !== "ALL") {
    where.status = status;
  }

  // Text search on title and ai_generated_sow
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { ai_generated_sow: { contains: search, mode: "insensitive" } },
    ];
  }

  // Count total matching (before pagination)
  const totalCount = await prisma.project.count({ where });

  // Cursor-style offset pagination
  const skip = (page - 1) * PAGE_SIZE;

  // Fetch projects with milestones
  const rawProjects = await prisma.project.findMany({
    where,
    include: { milestones: true, _count: { select: { bids: true } } },
    orderBy: (() => {
      switch (sort) {
        case "budget_desc": return { milestones: { _count: "desc" } };
        case "most_bidding": return { bids: { _count: "desc" } };
        default: return { createdAt: "desc" };
      }
    })(),
    take: PAGE_SIZE,
    skip,
  });

  // Sort in-memory for budget_desc (requires computing total value from milestones)
  let projects = rawProjects.map(project => {
    const totalValue = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
    const matchScore = generateConsistentMockScore(project.id, user.id);
    return { ...project, totalValue, matchScore };
  });

  if (sort === "budget_desc") {
    projects.sort((a, b) => b.totalValue - a.totalValue);
  }

  // Apply budget range filter in-memory (since it depends on milestone aggregation)
  if (budget !== "ALL" && budget in BUDGET_RANGES) {
    const range = BUDGET_RANGES[budget as Exclude<BudgetOption, "ALL">];
    projects = projects.filter(p => {
      if (range.max === null) return p.totalValue >= range.min;
      return p.totalValue >= range.min && p.totalValue < range.max;
    });
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <main className="lg:p-6 relative min-h-full pb-20 overflow-hidden">
      <div className="absolute top-[-10%] left-[30%] w-[500px] h-[500px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="px-4 lg:px-0 relative z-10 max-w-7xl mx-auto w-full">
        <header className="mb-8 border-b border-outline-variant/30 pb-8 relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="px-4 py-1.5 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-black font-headline tracking-widest uppercase border border-tertiary/30 mb-4 inline-block shadow-[0_0_15px_rgba(var(--color-tertiary),0.2)]">Open Projects</span>
              <h1 className="text-4xl lg:text-6xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.9]">
                Expert Deal <span className="bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent drop-shadow-sm">Feed</span>
              </h1>
              <p className="text-on-surface-variant font-medium mt-4 max-w-2xl text-sm leading-relaxed">
                Find projects that match your skills and experience. Submit proposals to start working with clients safely.
              </p>
            </div>
          </div>
        </header>

        <MarketplaceFilterBar totalCount={totalCount} />

        {projects.length === 0 ? (
          <div className="bg-surface-container-low/40 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8">
            <span className="material-symbols-outlined text-outline-variant text-[80px] mb-6" style={{ fontVariationSettings: "'FILL' 0" }}>work_off</span>
            <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">
              {search || status !== "ALL" || budget !== "ALL"
                ? "Nothing Matches Your Search"
                : "No Open Projects Yet"}
            </h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-8">
              {search || status !== "ALL" || budget !== "ALL"
                ? "No projects match your current filters. Try adjusting your search criteria or clear the filters to see all open projects."
                : "No open projects are available right now. New projects are posted daily — check back soon or browse posted listings to get started."}
            </p>
            {search || status !== "ALL" || budget !== "ALL" ? (
              <a
                href="/marketplace"
                className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
              >
                Clear Filters
              </a>
            ) : (
              <Link
                href="/projects/new"
                className="px-8 py-3.5 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95"
              >
                Browse Project Listings
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {projects.map((project, idx) => (
                <div key={project.id} className="animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${idx * 150}ms` }}>
                  <ProjectDealCard
                    project={project}
                    matchScore={project.matchScore}
                    totalValue={project.totalValue}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                {page > 1 && (
                  <a
                    href={buildPageUrl(page - 1, searchParams)}
                    className="px-4 py-2 rounded-xl bg-surface border border-outline-variant/30 text-on-surface-variant font-bold text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
                  >
                    ← Prev
                  </a>
                )}
                <span className="px-4 py-2 text-xs font-bold text-on-surface-variant">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <a
                    href={buildPageUrl(page + 1, searchParams)}
                    className="px-4 py-2 rounded-xl bg-surface border border-outline-variant/30 text-on-surface-variant font-bold text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
                  >
                    Next →
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function buildPageUrl(page: number, params: SearchParams): string {
  const p = new URLSearchParams();
  if (params.search) p.set("search", params.search);
  if (params.status && params.status !== "ALL") p.set("status", params.status);
  if (params.budget && params.budget !== "ALL") p.set("budget", params.budget);
  if (params.sort && params.sort !== "newest") p.set("sort", params.sort);
  p.set("page", String(page));
  return `/marketplace?${p.toString()}`;
}
