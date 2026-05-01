import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AcceptSquadButton from "@/components/marketplace/AcceptSquadButton";
import ListingControlArray from "@/components/dashboard/projects/ListingControlArray";
import BidReviewShell from "@/components/dashboard/projects/BidReviewShell";
import { ScopeValidationReportCard } from "@/components/dashboard/projects/ScopeValidationReportCard";
import ProjectActivityLedger from "@/components/dashboard/ProjectActivityLedger";
import { canManageBuyerProjectRole, getBuyerProjectRoleFromMembership } from "@/lib/project-access";
import { isSowGuardrailReport, type SowGuardrailReport } from "@/lib/sow-guardrails";

export const dynamic = "force-dynamic";

function getScopeValidationReport(metadata: unknown): SowGuardrailReport | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const report = (metadata as Record<string, unknown>).scope_validation_report;
  return isSowGuardrailReport(report) ? report : null;
}

export default async function ProjectReviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") redirect("/dashboard");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      bids: {
        include: {
          developer: {
            select: {
              id: true, name: true, email: true, image: true,
              trust_score: true, platform_tier: true, total_sprints_completed: true,
              average_ai_audit_score: true,
              skills: true,
              ai_agent_stack: true,
              portfolio_url: true,
              availability: true,
              stripe_account_id: true,
              verifications: {
                select: { type: true, status: true },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
      milestones: { orderBy: { id: "asc" } },
      organization: {
        select: {
          members: {
            where: { user_id: user.id },
            select: { user_id: true, role: true },
          },
        },
      },
      squad_proposals: {
        include: {
          members: {
            include: { facilitator: true, milestone: true },
          },
        },
      },
      activity_logs: {
        orderBy: { created_at: "desc" },
        take: 20,
        include: { actor: { select: { name: true, email: true, role: true } } },
      },
    },
  });

  if (!project) redirect("/dashboard");
  const buyerRole = getBuyerProjectRoleFromMembership({
    clientId: project.client_id,
    userId: user.id,
    members: project.organization?.members ?? [],
  });
  if (!buyerRole) redirect("/dashboard");
  const canManageProposals = canManageBuyerProjectRole(buyerRole);
  if (project.status === "ACTIVE") redirect(`/command-center/${project.id}`);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const totalBudget = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
  const daysActive = Math.max(1, Math.ceil((Date.now() - project.created_at.getTime()) / 86400000));
  const meanBid =
    project.bids.length > 0
      ? project.bids.reduce((acc, bid) => acc + Number(bid.proposed_amount), 0) / project.bids.length
      : 0;
  const isOpen = project.status === "OPEN_BIDDING";
  const totalProposals = project.bids.length + project.squad_proposals.length;

  const biddingClosesAt = (project as any).bidding_closes_at as Date | null;
  const msRemaining = biddingClosesAt ? new Date(biddingClosesAt).getTime() - Date.now() : null;
  const hoursRemaining = msRemaining != null ? Math.max(0, Math.floor(msRemaining / 3600000)) : null;
  const daysRemaining = hoursRemaining != null ? Math.floor(hoursRemaining / 24) : null;
  const isCritical = hoursRemaining != null && hoursRemaining <= 24;
  const isExpired = msRemaining != null && msRemaining <= 0;
  const deadlineLabel = isExpired
    ? "Bidding Closed"
    : daysRemaining != null && daysRemaining >= 1
    ? `${daysRemaining}d ${hoursRemaining! % 24}h left`
    : hoursRemaining != null
    ? `${hoursRemaining}h left`
    : null;
  const scopeValidationReport = project.activity_logs
    .map((log) => getScopeValidationReport(log.metadata))
    .find((report): report is SowGuardrailReport => Boolean(report));

  return (
    <main className="lg:p-6 min-h-full pb-20 relative overflow-hidden">
      {/* ── Header ── */}
      <header className="mb-8 px-4 lg:px-0 relative z-10 w-full max-w-[1400px]">
        <div className="flex items-center gap-2 mb-5">
          <Link
            href="/dashboard"
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center text-xs font-bold uppercase tracking-widest gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Dashboard
          </Link>
          <span className="text-outline-variant/50 text-xs">/</span>
          <span className="text-on-surface-variant text-xs font-medium truncate max-w-[200px]">{project.title}</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="px-3 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 inline-block mb-3">
              {isOpen ? "Reviewing Proposals" : project.status}
            </span>
            <h1 className="text-2xl lg:text-3xl font-black font-headline tracking-tight text-on-surface leading-snug max-w-2xl">
              {project.title}
            </h1>
          </div>

          {/* Stats Row */}
          <div className="flex items-stretch gap-3 shrink-0 flex-wrap">
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-3 rounded-lg text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Proposals</p>
              <p className="text-2xl font-black text-on-surface">{totalProposals}</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-3 rounded-lg text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Avg Bid</p>
              <p className="text-2xl font-black text-on-surface">{meanBid > 0 ? formatCurrency(meanBid) : "-"}</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-3 rounded-lg text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Posted</p>
              <p className="text-2xl font-black text-on-surface">{daysActive}d</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-3 rounded-lg text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Budget</p>
              <p className="text-2xl font-black text-on-surface">{formatCurrency(totalBudget)}</p>
            </div>
            {deadlineLabel && (
              <div className={`px-5 py-3 rounded-lg text-center border ${isCritical ? "bg-error/10 border-error/30" : "bg-surface-container-low border-outline-variant/20"}`}>
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isCritical ? "text-error" : "text-on-surface-variant"}`}>Closes In</p>
                <p className={`text-2xl font-black ${isCritical ? "text-error" : "text-on-surface"}`}>{deadlineLabel}</p>
              </div>
            )}
          </div>
        </div>

        {/* Urgency alert */}
        {isCritical && !isExpired && (
          <div className="mt-4 flex items-center gap-2.5 bg-error/10 border border-error/30 rounded-xl px-4 py-3">
            <span className="w-2 h-2 rounded-md bg-error animate-pulse shrink-0" />
            <p className="text-xs font-bold text-error">Bidding closes in under 24 hours. Accept or negotiate a proposal before the window closes.</p>
          </div>
        )}
        {isExpired && isOpen && (
          <div className="mt-4 flex items-center gap-2.5 bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">timer_off</span>
            <p className="text-xs font-medium text-on-surface-variant">The bidding window has closed. You can still accept an existing proposal or re-open bidding for new ones.</p>
          </div>
        )}
      </header>

      <div className="px-4 lg:px-0 relative z-10 w-full max-w-[1400px] space-y-8">

        {/* ── Listing Controls (only when open) ── */}
        {isOpen && canManageProposals && (
          <div className="bg-surface border border-outline-variant/20 rounded-lg px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-md bg-tertiary animate-pulse" />
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Listing is live on the Marketplace</p>
            </div>
            <ListingControlArray projectId={project.id} initialSow={project.ai_generated_sow} />
          </div>
        )}
        {isOpen && !canManageProposals && (
          <div className="bg-surface border border-outline-variant/20 rounded-lg px-6 py-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">visibility</span>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Workspace member view. Owners and admins manage listing changes and proposal decisions.
            </p>
          </div>
        )}

        {scopeValidationReport && (
          <ScopeValidationReportCard
            report={scopeValidationReport}
            eyebrow="Scope evidence"
            titlePassed="Posted scope checks passed."
            titleAttention="Posted scope has review items."
            description="Captured when the project entered the marketplace so proposal review can reference buyer constraints and evidence readiness."
          />
        )}

        {project.activity_logs.length > 0 && (
          <ProjectActivityLedger
            logs={project.activity_logs}
            eyebrow="Decision Audit Trail"
            description=""
            layout="grid"
          />
        )}

        {/* ── AI Squad Proposals ── */}
        {project.squad_proposals.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <h2 className="text-sm font-black font-headline uppercase tracking-widest text-on-surface">AI-Curated Dream Teams</h2>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest">
                {project.squad_proposals.length}
              </span>
            </div>

            <div className="space-y-4">
              {project.squad_proposals.map(squad => (
                <div
                  key={squad.id}
                  className="bg-surface border border-primary/30 rounded-lg p-6 lg:p-8 relative overflow-hidden"
                >
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed mb-6 max-w-3xl relative z-10">
                    {squad.pitch_to_client}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 relative z-10">
                    {squad.members.map(member => (
                      <div
                        key={member.id}
                        className="bg-surface border border-outline-variant/20 rounded-lg p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary shrink-0">
                          {(member.facilitator.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{member.facilitator.name || "Untether Expert"}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium truncate">{member.milestone.title}</p>
                        </div>
                        <span className="text-xs font-black text-on-surface shrink-0">{formatCurrency(Number(member.milestone.amount))}</span>
                      </div>
                    ))}
                  </div>

                  {isOpen && canManageProposals && (
                    <div className="relative z-10 max-w-xs">
                      <AcceptSquadButton squadId={squad.id} projectId={project.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Individual Bids ── */}
        <section>
          {project.bids.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-on-surface-variant text-xl">person_search</span>
              <h2 className="text-sm font-black font-headline uppercase tracking-widest text-on-surface">
                Individual Proposals
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-surface-container-high border border-outline-variant/20 text-on-surface-variant text-[10px] font-black uppercase tracking-widest">
                {project.bids.length}
              </span>
            </div>
          )}

          {totalProposals === 0 ? (
            <div className="bg-surface border border-outline-variant/20 rounded-lg p-16 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-[64px] text-outline-variant/40 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>radar</span>
              <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">Scanning for Proposals</h3>
              <p className="text-sm text-on-surface-variant max-w-sm font-medium">
                Your listing is live. Developers are reviewing your scope. Check back soon.
              </p>
            </div>
          ) : (
          <BidReviewShell
              project={{
                id: project.id,
                title: project.title,
                status: project.status,
                active_bid_id: (project as any).active_bid_id ?? null,
              }}
              projectBudget={totalBudget}
              canManageProposals={canManageProposals}
              bids={project.bids.map((b: any) => ({
                id: b.id,
                proposed_amount: Number(b.proposed_amount),
                estimated_days: b.estimated_days,
                technical_approach: b.technical_approach,
                proposed_tech_stack: b.proposed_tech_stack ?? null,
                tech_stack_reason: b.tech_stack_reason ?? null,
                proposed_milestones: b.proposed_milestones ?? null,
                counter_amount: b.counter_amount ? Number(b.counter_amount) : null,
                counter_reason: b.counter_reason ?? null,
                counter_milestones: b.counter_milestones ?? null,
                last_action_by: b.last_action_by ?? null,
                negotiation_rounds: b.negotiation_rounds ?? 0,
                required_escrow_pct: (b as any).required_escrow_pct ?? 100,
                counter_escrow_pct: (b as any).counter_escrow_pct ?? null,
                status: b.status,
                ai_score_card: b.ai_score_card ?? null,
                developer: {
                  id: b.developer.id,
                  name: b.developer.name,
                  email: b.developer.email,
                  image: b.developer.image ?? null,
                  trust_score: b.developer.trust_score,
                  platform_tier: b.developer.platform_tier,
                  total_sprints_completed: b.developer.total_sprints_completed,
                  average_ai_audit_score: b.developer.average_ai_audit_score,
                  skills: b.developer.skills ?? [],
                  ai_agent_stack: b.developer.ai_agent_stack ?? [],
                  portfolio_url: b.developer.portfolio_url ?? null,
                  availability: b.developer.availability ?? null,
                  stripe_account_id: b.developer.stripe_account_id ?? null,
                  verifications: b.developer.verifications ?? [],
                },
              }))}
            />
          )}
        </section>
      </div>
    </main>
  );
}
