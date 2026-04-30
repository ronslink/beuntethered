"use client";

import { useState } from "react";
import ProjectListRow from "./ProjectListRow";
import ProjectDetailPane from "./ProjectDetailPane";

export default function MarketplaceShell({
  projects,
  page,
  totalPages,
  searchParams,
}: {
  projects: any[];
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  const enriched = projects.map(p => ({
    ...p,
    totalValue: p.milestones.reduce((acc: number, m: any) => acc + Number(m.amount), 0),
    matchScore: p.opportunityFit?.score ?? 52,
  }));

  const [selectedId, setSelectedId] = useState<string | null>(enriched[0]?.id ?? null);
  const selectedProject = enriched.find(p => p.id === selectedId);
  const invitedProjects = enriched.filter(project => project.invited);
  const openProjects = enriched.filter(project => !project.invited);

  function buildPageUrl(newPage: number) {
    const p = new URLSearchParams();
    if (searchParams.search) p.set("search", searchParams.search);
    if (searchParams.budget && searchParams.budget !== "ALL") p.set("budget", searchParams.budget);
    if (searchParams.sort && searchParams.sort !== "best_match") p.set("sort", searchParams.sort);
    p.set("page", String(newPage));
    return `/marketplace?${p.toString()}`;
  }

  if (enriched.length === 0) {
    return (
      <div className="bg-surface border border-outline-variant/30 rounded-lg p-12 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
        <span className="material-symbols-outlined text-outline-variant text-[64px] mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>work_off</span>
        <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Projects Found</h3>
        <p className="text-sm text-on-surface-variant max-w-sm">
          Try clearing your filters or check back soon. New projects post daily.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">

      {/* ── LEFT: Scrollable Project List ── */}
      <div className="w-full lg:w-[42%] shrink-0 space-y-5">
        {invitedProjects.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Invited Opportunities</p>
                  <p className="text-xs font-medium text-on-surface-variant">Clients specifically asked you to review these projects.</p>
                </div>
              </div>
              <span className="rounded-md border border-primary/20 bg-surface px-2.5 py-1 text-[10px] font-black text-primary">
                {invitedProjects.length}
              </span>
            </div>
            {invitedProjects.map((project, idx) => (
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
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Open Marketplace</p>
              <p className="text-xs font-medium text-on-surface-variant">Projects ranked by profile fit, budget, and activity.</p>
            </div>
            <span className="rounded-md border border-outline-variant/25 bg-surface px-2.5 py-1 text-[10px] font-black text-on-surface-variant">
              {openProjects.length}
            </span>
          </div>
          {openProjects.length === 0 ? (
            <div className="rounded-lg border border-outline-variant/20 bg-surface p-6 text-center">
              <p className="text-xs font-medium text-on-surface-variant">
                No open marketplace projects match these filters beyond your invited work.
              </p>
            </div>
          ) : (
            openProjects.map((project, idx) => (
              <div
                key={project.id}
                className="animate-in fade-in slide-in-from-left-4"
                style={{ animationDelay: `${(idx + invitedProjects.length) * 40}ms`, animationFillMode: "both" }}
              >
                <ProjectListRow
                  project={project}
                  matchScore={project.matchScore}
                  totalValue={project.totalValue}
                  isSelected={selectedId === project.id}
                  onClick={() => setSelectedId(project.id)}
                />
              </div>
            ))
          )}
        </section>

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
        <div className="hidden lg:flex flex-col flex-1 sticky top-6 h-[calc(100vh-120px)] bg-surface border border-outline-variant/30 rounded-lg overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
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
