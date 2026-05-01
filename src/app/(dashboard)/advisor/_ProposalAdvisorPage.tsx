import Link from "next/link";
import type { Prisma, ProjectInviteStatus } from "@prisma/client";
import { prisma } from "@/lib/auth";
import { computeOpportunityFit } from "@/lib/opportunity-fit";
import { getFacilitatorAwardReadiness } from "@/lib/bid-award-rules";
import { buildProposalAdvisorPacket } from "@/lib/proposal-advisor";

const ACTIVE_INVITE_STATUSES: ProjectInviteStatus[] = ["SENT", "VIEWED", "ACCEPTED"];

const advisorInclude = {
  organization: { select: { name: true, type: true, website: true } },
  milestones: true,
  invites: {
    select: { id: true, status: true, message: true, created_at: true },
  },
  bids: {
    select: {
      id: true,
      status: true,
      proposed_amount: true,
      estimated_days: true,
      technical_approach: true,
      created_at: true,
    },
  },
  evidence_sources: {
    select: { type: true, status: true, label: true },
  },
  _count: { select: { bids: true } },
} satisfies Prisma.ProjectInclude;

type AdvisorProject = Prisma.ProjectGetPayload<{ include: typeof advisorInclude }>;

type ProposalAdvisorPageProps = {
  userId: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactText(value: string | null | undefined, maxLength = 220) {
  if (!value) return "No scope narrative has been added yet.";
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function listFromUnknown(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function verificationPrompts(project: AdvisorProject) {
  const prompts = new Set<string>();

  project.milestones.forEach((milestone) => {
    listFromUnknown(milestone.deliverables).forEach((item) => {
      if (/preview|demo|url|link|deployment/i.test(item)) prompts.add("Live preview or demo URL");
      if (/repo|github|code|branch|commit/i.test(item)) prompts.add("Repository, branch, or commit reference");
      if (/test|qa|coverage|acceptance/i.test(item)) prompts.add("Test run or QA evidence");
      if (/design|figma|prototype/i.test(item)) prompts.add("Design handoff or prototype link");
    });

    listFromUnknown(milestone.acceptance_criteria).forEach((item) => {
      if (/performance|speed|load/i.test(item)) prompts.add("Performance result or benchmark");
      if (/security|auth|permission/i.test(item)) prompts.add("Security/authentication evidence");
      if (/payment|stripe|checkout/i.test(item)) prompts.add("Payment test proof");
      if (/audit|verify|evidence|artifact/i.test(item)) prompts.add("Audit artifact bundle");
    });
  });

  if (prompts.size === 0) {
    prompts.add("Live preview or recorded walkthrough");
    prompts.add("Repository or artifact link");
    prompts.add("Acceptance checklist mapped to each milestone");
  }

  return Array.from(prompts).slice(0, 4);
}

function bidRisks(project: AdvisorProject) {
  const risks = new Set<string>();
  const scope = `${project.title} ${project.ai_generated_sow}`.toLowerCase();

  if (project.milestones.length === 0) risks.add("No buyer milestones exist yet; propose a clear milestone breakdown.");
  if (/legacy|migration|existing system|data import/.test(scope)) risks.add("Confirm access to the current system and migration data.");
  if (/payment|stripe|billing|subscription/.test(scope)) risks.add("Ask for test account access and expected payment scenarios.");
  if (/ai|llm|agent|automation/.test(scope)) risks.add("Clarify model/provider, evaluation criteria, and fallback behavior.");
  if (/mobile|ios|android|app store/.test(scope)) risks.add("Confirm device targets and release-store expectations.");

  if (risks.size === 0) {
    risks.add("Confirm buyer priorities, acceptance evidence, and review cadence before quoting.");
  }

  return Array.from(risks).slice(0, 3);
}

function ProjectAdvisorCard({
  project,
  fit,
}: {
  project: AdvisorProject;
  fit: ReturnType<typeof computeOpportunityFit>;
}) {
  const buyerBudgetReference = project.milestones.reduce((total, milestone) => total + Number(milestone.amount), 0);
  const ownBid = project.bids[0];
  const invite = project.invites[0];
  const proofPrompts = verificationPrompts(project);
  const risks = bidRisks(project);
  const proposalPacket = buildProposalAdvisorPacket(project);

  return (
    <article className="border border-outline-variant/40 bg-surface rounded-lg shadow-sm overflow-hidden">
      <div className="p-5 border-b border-outline-variant/30 bg-surface-container-low/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {invite ? (
                <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                  Client invited
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-surface border border-outline-variant/40 text-on-surface-variant text-[10px] font-black uppercase tracking-widest">
                  Open marketplace
                </span>
              )}
              {ownBid && (
                <span className="px-2.5 py-1 rounded-md bg-tertiary/10 text-tertiary text-[10px] font-black uppercase tracking-widest">
                  Proposal {ownBid.status.toLowerCase().replace(/_/g, " ")}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black font-headline tracking-tight text-on-surface">
              {project.title}
            </h2>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed max-w-3xl">
              {compactText(project.ai_generated_sow)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant">Fit score</p>
            <p className="text-3xl font-black text-primary">{fit.score}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">
        <section className="xl:col-span-4 p-5 border-b xl:border-b-0 xl:border-r border-outline-variant/30">
          <h3 className="text-[11px] uppercase tracking-widest font-black text-on-surface mb-4">
            Bid readiness
          </h3>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-3">
              <dt className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Buyer budget reference</dt>
              <dd className="text-sm font-black text-on-surface mt-1">
                {buyerBudgetReference > 0 ? formatCurrency(buyerBudgetReference) : "Buyer TBD"}
              </dd>
            </div>
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-3">
              <dt className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Buyer timeline reference</dt>
              <dd className="text-sm font-black text-on-surface mt-1">
                {proposalPacket.buyerTimelineDays ? `${proposalPacket.buyerTimelineDays} days` : "Buyer TBD"}
              </dd>
            </div>
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-3">
              <dt className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Milestones</dt>
              <dd className="text-sm font-black text-on-surface mt-1">{project.milestones.length}</dd>
            </div>
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-3">
              <dt className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Bids</dt>
              <dd className="text-sm font-black text-on-surface mt-1">{project._count.bids}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">
              Why this may fit
            </p>
            <ul className="space-y-2">
              {fit.reasons.slice(0, 3).map((reason) => (
                <li key={reason} className="flex gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[17px] mt-0.5">check_circle</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="xl:col-span-5 p-5 border-b xl:border-b-0 xl:border-r border-outline-variant/30">
          <h3 className="text-[11px] uppercase tracking-widest font-black text-on-surface mb-4">
            Proposal packet
          </h3>
          <div className="mb-4 rounded-lg border border-primary/15 bg-primary/5 p-3">
            <p className="text-[10px] uppercase tracking-widest font-black text-primary mb-1">Positioning</p>
            <p className="text-xs leading-relaxed text-on-surface-variant">{proposalPacket.positioning}</p>
          </div>
          <div className="mb-4 rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant">
                  Evidence confidence
                </p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  {proposalPacket.evidenceConfidence.hasSystemEvidence
                    ? "Connected technical sources can make this bid more credible than screenshots alone."
                    : "Current proof is mostly self-attested; attach deployment, service, repository, or data evidence when possible."}
                </p>
              </div>
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                {proposalPacket.evidenceConfidence.level} · {proposalPacket.evidenceConfidence.score}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {proposalPacket.evidenceConfidence.strengths.slice(0, 3).map((strength) => (
                <span key={strength} className="rounded-md border border-outline-variant/30 bg-surface px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                  {strength}
                </span>
              ))}
            </div>
          </div>
          {project.milestones.length > 0 ? (
            <ol className="space-y-3">
              {proposalPacket.milestoneStrategy.slice(0, 4).map((milestone, index) => (
                <li key={`${milestone.title}-${index}`} className="rounded-lg border border-outline-variant/30 p-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-on-surface">{milestone.title}</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                        {milestone.outcome}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mt-2">
                        Buyer baseline: {milestone.buyerAmount ? formatCurrency(milestone.buyerAmount) : "budget TBD"}
                        {milestone.buyerDays ? ` · ${milestone.buyerDays} days` : " · timeline TBD"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-lg border border-dashed border-outline-variant/50 p-4 text-sm text-on-surface-variant">
              Use your proposal to turn the buyer scope into verifiable milestones with clear acceptance criteria.
            </div>
          )}
        </section>

        <section className="xl:col-span-3 p-5">
          <h3 className="text-[11px] uppercase tracking-widest font-black text-on-surface mb-4">
            Evidence plan
          </h3>
          <ul className="space-y-2 mb-5">
            {proposalPacket.evidencePlan.slice(0, 4).map((prompt) => (
              <li key={prompt} className="rounded-md bg-surface-container-low/60 border border-outline-variant/30 px-3 py-2 text-xs font-semibold text-on-surface">
                {prompt}
              </li>
            ))}
          </ul>

          {proposalPacket.evidenceConfidence.gaps.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">
                Confidence gaps
              </p>
              <ul className="space-y-2 mb-5">
                {proposalPacket.evidenceConfidence.gaps.slice(0, 2).map((gap) => (
                  <li key={gap} className="text-xs leading-relaxed text-on-surface-variant">
                    {gap}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">
            Proof prompts
          </p>
          <ul className="space-y-1.5 mb-5">
            {proofPrompts.slice(0, 3).map((prompt) => (
              <li key={prompt} className="text-xs leading-relaxed text-on-surface-variant">
                {prompt}
              </li>
            ))}
          </ul>

          <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">
            Clarify before quoting
          </p>
          <ul className="space-y-2 mb-5">
            {proposalPacket.buyerQuestions.slice(0, 3).map((question) => (
              <li key={question} className="text-xs leading-relaxed text-on-surface-variant">
                {question}
              </li>
            ))}
          </ul>

          <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">
            Risk notes
          </p>
          <ul className="space-y-2 mb-5">
            {[...proposalPacket.riskNotes, ...risks].slice(0, 3).map((risk) => (
              <li key={risk} className="text-xs leading-relaxed text-on-surface-variant">
                {risk}
              </li>
            ))}
          </ul>

          <Link
            href={`/marketplace/project/${project.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            {ownBid ? "Review proposal" : "Open bid form"}
          </Link>
        </section>
      </div>
    </article>
  );
}

export default async function ProposalAdvisorPage({ userId }: ProposalAdvisorPageProps) {
  const facilitatorProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      skills: true,
      ai_agent_stack: true,
      trust_score: true,
      average_ai_audit_score: true,
      total_sprints_completed: true,
      platform_tier: true,
      availability: true,
      portfolio_url: true,
      stripe_account_id: true,
      verifications: {
        select: {
          type: true,
          status: true,
        },
      },
    },
  });
  const awardReadiness = getFacilitatorAwardReadiness(facilitatorProfile);

  const projects = await prisma.project.findMany({
    where: {
      status: "OPEN_BIDDING",
    },
    include: {
      ...advisorInclude,
      invites: {
        where: { facilitator_id: userId, status: { in: ACTIVE_INVITE_STATUSES } },
        select: advisorInclude.invites.select,
      },
      bids: {
        where: { developer_id: userId },
        select: advisorInclude.bids.select,
        orderBy: { created_at: "desc" },
      },
    },
    orderBy: { created_at: "desc" },
    take: 8,
  });

  const scoredProjects = projects
    .map((project) => ({
      project,
      fit: computeOpportunityFit(project, facilitatorProfile),
      priority: (project.invites.length ? 100 : 0) + (project.bids.length ? 40 : 0),
    }))
    .sort((a, b) => b.priority + b.fit.score - (a.priority + a.fit.score));

  const invitedCount = scoredProjects.filter(({ project }) => project.invites.length > 0).length;
  const draftableCount = scoredProjects.filter(({ project }) => project.bids.length === 0).length;

  return (
    <main className="lg:p-6 min-h-full pb-20">
      <div className="px-4 lg:px-0 max-w-[1400px] mx-auto">
        <header className="mb-6">
          <span className="px-3 py-1 rounded-md bg-surface-container-low text-on-surface-variant text-[10px] font-bold tracking-widest uppercase border border-outline-variant/30 mb-3 inline-block">
            Facilitator Advisor
          </span>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-black font-headline tracking-tight text-on-surface uppercase leading-tight">
                Proposal Advisor
              </h1>
              <p className="text-on-surface-variant font-medium mt-2 text-sm leading-relaxed max-w-3xl">
                Turn live buyer SOWs into outcome-based proposal plans with buyer budget references,
                delivery proof, and risk questions before you quote.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              Browse marketplace
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg border border-outline-variant/40 bg-surface p-4">
            <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant">Invited opportunities</p>
            <p className="text-2xl font-black text-on-surface mt-1">{invitedCount}</p>
          </div>
          <div className="rounded-lg border border-outline-variant/40 bg-surface p-4">
            <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant">Ready to draft</p>
            <p className="text-2xl font-black text-on-surface mt-1">{draftableCount}</p>
          </div>
          <div className="rounded-lg border border-outline-variant/40 bg-surface p-4">
            <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant">Advisor source</p>
            <p className="text-sm font-black text-on-surface mt-2">Live projects, milestones, invites, and your profile</p>
          </div>
        </section>

        {!awardReadiness.ok && (
          <section className="mb-6 rounded-lg border border-secondary/30 bg-secondary/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">verified_user</span>
                <div>
                  <p className="text-sm font-black text-on-surface">Marketplace award readiness is incomplete</p>
                  <p className="text-sm text-on-surface-variant mt-1 leading-relaxed max-w-3xl">
                    {awardReadiness.error} You can still shape a stronger proposal here, but buyers cannot safely award
                    paid marketplace work until this trust step is cleared.
                  </p>
                </div>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-on-secondary px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                Finish verification
              </Link>
            </div>
          </section>
        )}

        {scoredProjects.length > 0 ? (
          <div className="space-y-4">
            {scoredProjects.map(({ project, fit }) => (
              <ProjectAdvisorCard key={project.id} project={project} fit={fit} />
            ))}
          </div>
        ) : (
          <section className="rounded-lg border border-dashed border-outline-variant/50 bg-surface p-8 text-center">
            <span className="material-symbols-outlined text-primary text-4xl mb-3">travel_explore</span>
            <h2 className="text-xl font-black font-headline text-on-surface">No open SOWs to advise on yet</h2>
            <p className="text-sm text-on-surface-variant max-w-xl mx-auto mt-2">
              When buyers publish software delivery projects or invite you to bid, this page will turn those SOWs into a proposal plan.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-3 text-[10px] font-black uppercase tracking-widest mt-5"
            >
              Browse open projects
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
