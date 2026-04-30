import { prisma } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { calculateBYOCInviteTotals } from "@/lib/byoc-sow";
import { getBYOCTransitionBaseline } from "@/lib/byoc-transition";
import { getCurrentUser } from "@/lib/session";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "the invited email";
  return `${local.slice(0, 1)}***@${domain}`;
}

export default async function BYOCMagicLinkClaim(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();

  const project = await prisma.project.findUnique({
    where: { invite_token: params.token },
    include: {
      creator: true,
      milestones: { orderBy: { id: "asc" } }
    }
  });

  if (!project || project.status !== "DRAFT" || !project.is_byoc) {
    notFound(); // Protects against invalid, expired, or actively claimed links 
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalValuation = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
  const totals = calculateBYOCInviteTotals(project.milestones.map((milestone) => ({ amount: Number(milestone.amount) })));
  const facilitatorName = project.creator.name || "Your facilitator";
  const transitionBaseline = getBYOCTransitionBaseline(project.ai_generated_sow);

  // If they are already heavily onboarded and mapping correctly natively as a Client,
  // we bypass external friction logic
  const callbackUrl = `/invite/${params.token}/claim`;
  const signInUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const invitedEmail = project.invited_client_email?.toLowerCase() ?? null;
  const userEmail = user?.email.toLowerCase() ?? null;
  const isWrongRole = Boolean(user && user.role !== "CLIENT");
  const isWrongInvitedEmail = Boolean(userEmail && invitedEmail && userEmail !== invitedEmail);
  const canClaimNow = Boolean(user && user.role === "CLIENT" && !isWrongInvitedEmail);
  const claimHref = canClaimNow ? callbackUrl : signInUrl;
  const claimCopy = !user
    ? {
        title: "Create your client account to continue",
        body: "Claiming links this private scope to your workspace so you can fund milestones, review evidence, and manage approvals.",
        action: "Create Account & Claim",
        tone: "primary" as const,
      }
    : isWrongRole
      ? {
          title: "Client account required",
          body: "You are signed in as a facilitator. This private invite must be claimed from a buyer/client account.",
          action: "Switch to Client Account",
          tone: "secondary" as const,
        }
      : isWrongInvitedEmail
        ? {
            title: "Invite email mismatch",
            body: `This packet is locked to ${maskEmail(invitedEmail!)}. Sign in with that client email or ask your facilitator to issue a new invite.`,
            action: "Review Account",
            tone: "secondary" as const,
          }
        : {
            title: "Ready to claim",
            body: "This account can claim the private delivery packet and move the scope into your workspace.",
            action: "Claim Project",
            tone: "primary" as const,
          };

  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-lg border border-outline-variant/40 bg-surface-container-low/50 p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span>
                  Private BYOC Review
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/40 bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Outcome-based delivery
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight md:text-4xl">Review your verified delivery scope</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
                <span className="font-bold text-on-surface">{facilitatorName}</span> prepared a private
                milestone-based project packet. Review the scope, evidence expectations, and escrow totals
                before claiming the project.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-lg border border-outline-variant/30 bg-surface p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Project value</p>
                <p className="mt-1 text-xl font-black">{formatCurrency(totalValuation)}</p>
              </div>
              <div className="rounded-lg border border-outline-variant/30 bg-surface p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Platform fee</p>
                <p className="mt-1 text-xl font-black">{formatCurrency(totals.platformFeeCents / 100)}</p>
              </div>
              <div className="rounded-lg border border-outline-variant/30 bg-surface p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Escrow total</p>
                <p className="mt-1 text-xl font-black">{formatCurrency(totals.clientTotalCents / 100)}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-outline-variant/40 bg-surface shadow-sm">
            <div className="border-b border-outline-variant/30 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-primary">Locked Scope</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">{project.title}</h2>
            </div>

            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <section className="rounded-lg border border-outline-variant/30 bg-surface-container-low/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Scope Snapshot</p>
                    <h3 className="mt-1 text-base font-black">What is included</h3>
                  </div>
                  <span className="rounded-md bg-primary/10 p-2 text-primary">
                    <span className="material-symbols-outlined text-[18px]">description</span>
                  </span>
                </div>
                <p className="mt-4 max-h-[520px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-outline-variant/25 bg-surface p-4 text-sm leading-7 text-on-surface-variant custom-scrollbar">
                  {project.ai_generated_sow}
                </p>
              </section>

              <section>
                {transitionBaseline && (
                  <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-primary">Transition baseline</p>
                        <h3 className="mt-1 text-base font-black">What Untether governs from here</h3>
                      </div>
                      <span className="rounded-md bg-primary/10 p-2 text-primary">
                        <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ["Mode", transitionBaseline.transitionMode],
                        ["Current state", transitionBaseline.currentState],
                        ["Prior work/assets", transitionBaseline.priorWork],
                        ["Remaining governed work", transitionBaseline.remainingWork],
                        ["Known risks", transitionBaseline.knownRisks],
                      ].map(([label, value]) => (
                        value ? (
                          <div key={label} className="rounded-lg border border-primary/15 bg-surface p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
                            <p className="mt-1 text-xs leading-5 text-on-surface-variant">{value}</p>
                          </div>
                        ) : null
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-on-surface-variant">
                      Prior work is recorded as context unless it appears inside a funded milestone. Payment, evidence, and disputes attach to this accepted packet going forward.
                    </p>
                  </div>
                )}

                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-primary">Verifiable Milestones</p>
                    <h3 className="mt-1 text-base font-black">Funding and acceptance plan</h3>
                  </div>
                  <span className="rounded-md border border-outline-variant/35 bg-surface-container-low px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {project.milestones.length} milestones
                  </span>
                </div>
                <div className="space-y-3">
                  {project.milestones.map((m, idx) => (
                    <article key={m.id} className="rounded-lg border border-outline-variant/35 bg-surface p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-black">{m.title}</h4>
                            {m.description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{m.description}</p>}
                          </div>
                        </div>
                        <p className="text-lg font-black">{formatCurrency(Number(m.amount))}</p>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low/40 p-3">
                          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px] text-primary">inventory_2</span>
                            Deliverables
                          </p>
                          <div className="space-y-2">
                            {m.deliverables.slice(0, 4).map((item) => (
                              <p key={item} className="flex gap-2 text-xs leading-5 text-on-surface-variant">
                                <span className="material-symbols-outlined mt-0.5 text-[13px] text-primary">check_circle</span>
                                {item}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low/40 p-3">
                          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px] text-secondary">fact_check</span>
                            Acceptance checks
                          </p>
                          <div className="space-y-2">
                            {m.acceptance_criteria.slice(0, 4).map((item) => (
                              <p key={item} className="flex gap-2 text-xs leading-5 text-on-surface-variant">
                                <span className="material-symbols-outlined mt-0.5 text-[13px] text-secondary">verified</span>
                                {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-outline-variant/40 bg-surface p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-primary">Trust Model</p>
              <div className="mt-4 space-y-3">
                {[
                  ["payments", "Milestone escrow", "Fund each milestone before work release."],
                  ["upload_file", "Evidence trail", "Delivery artifacts attach to the project record."],
                  ["rule", "Acceptance checks", "Approve against objective milestone criteria."],
                  ["gavel", "Dispute path", "Escalation keeps payment, audit, and evidence in one place."],
                ].map(([icon, title, body]) => (
                  <div key={title} className="flex gap-3 rounded-lg border border-outline-variant/25 bg-surface-container-low/35 p-3">
                    <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                      <span className="material-symbols-outlined text-[15px]">{icon}</span>
                    </span>
                    <div>
                      <p className="text-sm font-black">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-on-surface-variant">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky top-6 rounded-lg border border-primary/25 bg-surface p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-primary">Claim Project</p>
              <h3 className="mt-2 text-lg font-black">{claimCopy.title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {claimCopy.body}
              </p>
              {invitedEmail && (
                <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Private claim guard</p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                    This invite is restricted to {maskEmail(invitedEmail)}.
                  </p>
                </div>
              )}
              <div className="mt-4 rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-4">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-on-surface-variant">Project value</span>
                  <span className="font-black">{formatCurrency(totalValuation)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-4 text-sm">
                  <span className="text-on-surface-variant">BYOC platform fee</span>
                  <span className="font-black">{formatCurrency(totals.platformFeeCents / 100)}</span>
                </div>
                <div className="mt-3 border-t border-outline-variant/25 pt-3 flex justify-between gap-4 text-sm">
                  <span className="font-bold">Estimated escrow total</span>
                  <span className="font-black">{formatCurrency(totals.clientTotalCents / 100)}</span>
                </div>
              </div>
              <Link
                href={isWrongRole ? "/dashboard?invite_error=client_account_required" : isWrongInvitedEmail ? "/dashboard?invite_error=wrong_client_email" : claimHref}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:opacity-90 ${
                  claimCopy.tone === "secondary" ? "bg-secondary" : "bg-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{canClaimNow ? "task_alt" : "login"}</span>
                {claimCopy.action}
              </Link>
              <p className="mt-3 text-center text-[11px] leading-5 text-on-surface-variant">
                Funding happens after account setup and project claim.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
