"use client";

import { useState } from "react";
import ProjectListRow from "./ProjectListRow";
import ProjectDetailPane from "./ProjectDetailPane";

function generateConsistentMockScore(projectId: string, userId: string): number {
  let hash = 0;
  const str = projectId + userId;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 85 + (Math.abs(hash) % 14);
}

export default function MarketplaceShell({
  projects,
  userId,
  page,
  totalPages,
  searchParams,
}: {
  projects: any[];
  userId: string;
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  const enriched = projects.map(p => ({
    ...p,
    totalValue: p.milestones.reduce((acc: number, m: any) => acc + Number(m.amount), 0),
    matchScore: generateConsistentMockScore(p.id, userId),
  }));

  const [selectedId, setSelectedId] = useState<string | null>(enriched[0]?.id ?? null);
  const selectedProject = enriched.find(p => p.id === selectedId);

  function buildPageUrl(newPage: number) {
    const p = new URLSearchParams();
    if (searchParams.search) p.set("search", searchParams.search);
    if (searchParams.budget && searchParams.budget !== "ALL") p.set("budget", searchParams.budget);
    if (searchParams.sort && searchParams.sort !== "newest") p.set("sort", searchParams.sort);
    p.set("page", String(newPage));
    return `/marketplace?${p.toString()}`;
  }

  if (enriched.length === 0) {
    return (
      <div className="bg-surface-container-low/40 border border-outline-variant/30 rounded-3xl p-16 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
        <span className="material-symbols-outlined text-outline-variant text-[64px] mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>work_off</span>
        <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Projects Found</h3>
        <p className="text-sm text-on-surface-variant max-w-sm">
          Try clearing your filters or check back soon — new projects post daily.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">

      {/* ── LEFT: Scrollable Project List ── */}
      <div className="w-full lg:w-[42%] shrink-0 space-y-2">
        {enriched.map((project, idx) => (
          <div
            key={project.id}
            className="animate-in fade-in slide-in-from-left-4"
            style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
          >
            <ProjectListRow
              project={project}
              matchScore={project.matchScore}
              totalValue={project.totalValue}
              isSelected={selectedId === project.id}
              onClick={() => setSelectedId(project.id)}
            />
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20">
            {page > 1 ? (
              <a href={buildPageUrl(page - 1)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary transition-all text-xs font-bold uppercase tracking-widest">
                <span className="material-symbols-outlined text-[14px]">arrow_back</span> Prev
              </a>
            ) : <div />}
            <span className="text-xs font-bold text-on-surface-variant">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <a href={buildPageUrl(page + 1)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary transition-all text-xs font-bold uppercase tracking-widest">
                Next <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            ) : <div />}
          </div>
        )}
      </div>

      {/* ── RIGHT: Sticky Detail Pane (desktop only) ── */}
      {selectedProject && (
        <div className="hidden lg:flex flex-col flex-1 sticky top-6 h-[calc(100vh-120px)] bg-surface border border-outline-variant/30 rounded-3xl overflow-hidden shadow-xl shadow-surface-variant/10 animate-in fade-in slide-in-from-right-4 duration-300">
          <ProjectDetailPane
            key={selectedProject.id}
            project={selectedProject}
            totalValue={selectedProject.totalValue}
            matchScore={selectedProject.matchScore}
          />
        </div>
      )}
    </div>
  );
}
