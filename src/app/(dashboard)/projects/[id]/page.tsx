import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AcceptSquadButton from "@/components/marketplace/AcceptSquadButton";
import ListingControlArray from "@/components/dashboard/projects/ListingControlArray";
import BidReviewShell from "@/components/dashboard/projects/BidReviewShell";

export const dynamic = "force-dynamic";

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
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
      milestones: { orderBy: { id: "asc" } },
      squad_proposals: {
        include: {
          members: {
            include: { facilitator: true, milestone: true },
          },
        },
      },
    },
  });

  if (!project || project.client_id !== user.id) redirect("/dashboard");
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

  return (
    <main className="lg:p-6 min-h-full pb-20 relative overflow-hidden">
      <div className="absolute top-[-5%] left-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

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
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 inline-block mb-3">
              {isOpen ? "Reviewing Proposals" : project.status}
            </span>
            <h1 className="text-3xl lg:text-5xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.95]">
              {project.title}
            </h1>
          </div>

          {/* Stats Row */}
          <div className="flex items-stretch gap-3 shrink-0 flex-wrap">
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-3 rounded-2xl text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Proposals</p>
              <p className="text-2xl font-black text-on-surface">{totalProposals}</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-3 rounded-2xl text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Avg Bid</p>
              <p className="text-2xl font-black text-on-surface">{meanBid > 0 ? formatCurrency(meanBid) : "—"}</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-3 rounded-2xl text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Posted</p>
              <p className="text-2xl font-black text-on-surface">{daysActive}d</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-3 rounded-2xl text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Budget</p>
              <p className="text-2xl font-black text-on-surface">{formatCurrency(totalBudget)}</p>
            </div>
            {deadlineLabel && (
              <div className={`px-5 py-3 rounded-2xl text-center border ${isCritical ? "bg-error/10 border-error/30" : "bg-surface-container-low border-outline-variant/20"}`}>
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isCritical ? "text-error" : "text-on-surface-variant"}`}>Closes In</p>
                <p className={`text-2xl font-black ${isCritical ? "text-error" : "text-on-surface"}`}>{deadlineLabel}</p>
              </div>
            )}
          </div>
        </div>

        {/* Urgency alert */}
        {isCritical && !isExpired && (
          <div className="mt-4 flex items-center gap-2.5 bg-error/10 border border-error/30 rounded-xl px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse shrink-0" />
            <p className="text-xs font-bold text-error">Bidding closes in under 24 hours — accept or negotiate a proposal before the window closes.</p>
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
        {isOpen && (
          <div className="bg-surface/40 backdrop-blur-md border border-outline-variant/20 rounded-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Listing is live on the Marketplace</p>
            </div>
            <ListingControlArray projectId={project.id} initialSow={project.ai_generated_sow} />
          </div>
        )}

        {/* ── AI Squad Proposals ── */}
        {project.squad_proposals.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <h2 className="text-sm font-black font-headline uppercase tracking-widest text-on-surface">AI-Curated Dream Teams</h2>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest">
                {project.squad_proposals.length}
              </span>
            </div>

            <div className="space-y-4">
              {project.squad_proposals.map(squad => (
                <div
                  key={squad.id}
                  className="bg-surface/50 backdrop-blur-xl border border-primary/30 rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-lg shadow-primary/5"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />

                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed mb-6 max-w-3xl relative z-10">
                    {squad.pitch_to_client}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 relative z-10">
                    {squad.members.map(member => (
                      <div
                        key={member.id}
                        className="bg-surface border border-outline-variant/20 rounded-2xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary shrink-0">
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

                  {isOpen && (
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
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant/20 text-on-surface-variant text-[10px] font-black uppercase tracking-widest">
                {project.bids.length}
              </span>
            </div>
          )}

          {totalProposals === 0 ? (
            <div className="bg-surface/50 border border-outline-variant/20 rounded-3xl p-16 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-[64px] text-outline-variant/40 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>radar</span>
              <h3 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">Scanning for Proposals</h3>
              <p className="text-sm text-on-surface-variant max-w-sm font-medium">
                Your listing is live. Developers are reviewing your scope — check back soon.
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
                },
              }))}
            />
          )}
        </section>
      </div>
    </main>
  );
}
