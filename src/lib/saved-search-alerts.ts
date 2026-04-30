import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/auth";
import { sendSavedSearchAlert } from "@/lib/resend";
import { getAppBaseUrl } from "@/lib/app-url";
import { shouldSendEmailForPreference } from "@/lib/email-preferences";
import {
  buildMarketplaceQueryString,
  filterAndSortProjectsForSavedSearch,
  getAlertWindowKey,
  getProjectTotalValue,
  isSavedSearchAlertDue,
  normalizeSavedSearchFilters,
} from "@/lib/saved-search-alert-rules";

const MAX_ALERT_PROJECTS = 5;
const MAX_CANDIDATE_PROJECTS = 100;

function buildProjectWhere(filters: ReturnType<typeof normalizeSavedSearchFilters>, since: Date): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {
    status: "OPEN_BIDDING",
    created_at: { gt: since },
  };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { ai_generated_sow: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function runSavedSearchAlerts(now = new Date()) {
  const searches = await prisma.savedSearch.findMany({
    where: {
      enabled: true,
      alert_frequency: { not: "NEVER" },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { updated_at: "asc" },
    take: 250,
  });

  let processed = 0;
  let alertsCreated = 0;
  let emailsQueued = 0;
  let emailsSkipped = 0;

  for (const savedSearch of searches) {
    if (savedSearch.user.role !== "FACILITATOR") continue;
    if (!isSavedSearchAlertDue({
      enabled: savedSearch.enabled,
      alertFrequency: savedSearch.alert_frequency,
      lastAlertedAt: savedSearch.last_alerted_at,
      now,
    })) {
      continue;
    }

    processed += 1;
    const filters = normalizeSavedSearchFilters(savedSearch.filters);
    const since = savedSearch.last_alerted_at ?? savedSearch.created_at;
    const rawProjects = await prisma.project.findMany({
      where: buildProjectWhere(filters, since),
      include: {
        milestones: { select: { amount: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { created_at: "desc" },
      take: MAX_CANDIDATE_PROJECTS,
    });

    const matchingProjects = filterAndSortProjectsForSavedSearch(rawProjects, filters);
    const topProjects = matchingProjects.slice(0, MAX_ALERT_PROJECTS).map((project) => ({
      id: project.id,
      title: project.title,
      totalValue: getProjectTotalValue(project),
      bidCount: project._count?.bids ?? 0,
    }));
    const matchCount = matchingProjects.length;

    if (matchCount > 0) {
      const query = buildMarketplaceQueryString(filters);
      const href = `/marketplace${query ? `?${query}` : ""}`;
      const sourceKey = `saved-search:${savedSearch.id}:${getAlertWindowKey(now, savedSearch.alert_frequency)}`;
      const message = `${matchCount} new matching project${matchCount === 1 ? "" : "s"} for "${savedSearch.name}"`;

      const notification = await prisma.notification.upsert({
        where: { source_key: sourceKey },
        update: {
          message,
          href,
          metadata: {
            saved_search_id: savedSearch.id,
            match_count: matchCount,
            project_ids: topProjects.map((project) => project.id),
          },
        },
        create: {
          user_id: savedSearch.user_id,
          type: "ALERT",
          message,
          href,
          source_key: sourceKey,
          metadata: {
            saved_search_id: savedSearch.id,
            match_count: matchCount,
            project_ids: topProjects.map((project) => project.id),
          },
        },
      });

      if (notification.created_at.getTime() >= now.getTime() - 60_000) {
        alertsCreated += 1;
      }

      if (shouldSendEmailForPreference("SAVED_SEARCH_ALERT", null)) {
        const emailResult = await sendSavedSearchAlert({
          to: savedSearch.user.email,
          name: savedSearch.user.name || "there",
          searchName: savedSearch.name,
          matchCount,
          projects: topProjects,
          marketplaceUrl: `${getAppBaseUrl()}${href}`,
        });
        if (emailResult.sent) {
          emailsQueued += 1;
        } else {
          emailsSkipped += 1;
        }
      }
    }

    await prisma.savedSearch.update({
      where: { id: savedSearch.id },
      data: {
        last_alerted_at: now,
        last_alert_match_count: matchCount,
      },
    });
  }

  return {
    success: true,
    processed,
    alertsCreated,
    emailsQueued,
    emailsSkipped,
    checked: searches.length,
  };
}
