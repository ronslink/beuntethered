import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buyerProjectListWhere } from "@/lib/project-access";
import {
  getPendingMilestoneFundingBreakdown,
  getLatestLedgerPaymentRecord,
  summarizePendingClientFunding,
  summarizeWalletEscrowStates,
  getWalletMilestoneAction,
  sumSucceededClientFundingFeesCents,
  sumSucceededFacilitatorPayoutCents,
  type WalletEscrowStatusKey,
  type WalletEscrowSummary,
  type WalletFundingForecast,
  type WalletFundingMilestone,
} from "@/lib/wallet-ledger";
import { BYOC_CLIENT_FEE_RATE, formatFeeRate, MARKETPLACE_CLIENT_FEE_RATE } from "@/lib/platform-fees";

const FACILITATOR_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  APPROVED_AND_PAID:    { label: "Paid Out",       color: "text-tertiary",           bg: "bg-tertiary/10 border-tertiary/20",    icon: "check_circle" },
  FUNDED_IN_ESCROW:     { label: "In Escrow",      color: "text-primary",            bg: "bg-primary/10 border-primary/20",      icon: "lock" },
  SUBMITTED_FOR_REVIEW: { label: "Under Review",   color: "text-secondary",          bg: "bg-secondary/10 border-secondary/20",  icon: "rate_review" },
  PENDING:              { label: "Pending",         color: "text-on-surface-variant", bg: "bg-surface-container-high border-outline-variant/20", icon: "hourglass_empty" },
  DISPUTED:             { label: "Disputed",        color: "text-error",              bg: "bg-error/10 border-error/20",          icon: "gavel" },
};

const CLIENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  APPROVED_AND_PAID:    { label: "Released",       color: "text-tertiary",           bg: "bg-tertiary/10 border-tertiary/20",    icon: "check_circle" },
  FUNDED_IN_ESCROW:     { label: "Locked in Escrow", color: "text-primary",          bg: "bg-primary/10 border-primary/20",      icon: "lock" },
  SUBMITTED_FOR_REVIEW: { label: "Under Review",   color: "text-secondary",          bg: "bg-secondary/10 border-secondary/20",  icon: "rate_review" },
  PENDING:              { label: "Awaiting Funding", color: "text-on-surface-variant", bg: "bg-surface-container-high border-outline-variant/20", icon: "hourglass_empty" },
  DISPUTED:             { label: "Disputed",        color: "text-error",              bg: "bg-error/10 border-error/20",          icon: "gavel" },
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

const centsToCurrency = (cents: number) => formatCurrency(cents / 100);

type LedgerPaymentRecord = {
  id: string;
  kind: string;
  status: string;
  gross_amount_cents: number;
  platform_fee_cents: number;
  facilitator_payout_cents: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  created_at: Date;
};

type LedgerMilestone = {
  id: string;
  project_id: string;
  title: string;
  amount: WalletFundingMilestone["amount"];
  status: string;
  paid_at?: Date | null;
  project: {
    id: string;
    title: string;
    status: string;
    is_byoc?: boolean | null;
  };
  payment_records?: LedgerPaymentRecord[];
};

function TrustMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
        <span className="material-symbols-outlined text-primary text-[16px]">{icon}</span>
      </div>
      <p className="text-3xl font-black text-on-surface tracking-tighter">{value}</p>
      <p className="text-[10px] text-on-surface-variant font-medium mt-3 leading-relaxed">{detail}</p>
    </div>
  );
}

function PaymentExplainer({ role }: { role: "CLIENT" | "FACILITATOR" }) {
  return (
    <section className="relative z-10 px-4 lg:px-0 mb-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Milestone escrow</p>
          <p className="mt-2 text-sm font-bold text-on-surface">
            {role === "CLIENT" ? "Funds are locked before delivery work starts." : "Funded milestones are visible before submission."}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Fee clarity</p>
          <p className="mt-2 text-sm font-bold text-on-surface">
            {role === "CLIENT" ? "Client fee is shown separately before checkout." : "Facilitator fee is 0%; payout equals approved milestone amount."}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Release control</p>
          <p className="mt-2 text-sm font-bold text-on-surface">
            {role === "CLIENT" ? "Release happens after review and approval." : "Payout occurs after client approval and Stripe processing."}
          </p>
        </div>
      </div>
    </section>
  );
}

function PaymentActionQueue({
  role,
  milestones,
}: {
  role: "CLIENT" | "FACILITATOR";
  milestones: LedgerMilestone[];
}) {
  const actionItems = milestones
    .map((milestone) => ({
      milestone,
      action: getWalletMilestoneAction({
        role,
        projectId: milestone.project_id,
        milestoneId: milestone.id,
        status: milestone.status,
      }),
    }))
    .filter((item): item is { milestone: LedgerMilestone; action: NonNullable<ReturnType<typeof getWalletMilestoneAction>> } => Boolean(item.action))
    .slice(0, 4);

  return (
    <section className="relative z-10 px-4 lg:px-0 mb-6">
      <div className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">task_alt</span>
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Payment Action Queue</h2>
            <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
              {role === "CLIENT" ? "Milestones that need funding, review, or dispute attention." : "Funded or review-stage milestones that affect payout timing."}
            </p>
          </div>
        </div>

        {actionItems.length === 0 ? (
          <div className="p-5">
            <div className="rounded-xl border border-tertiary/20 bg-tertiary/10 px-4 py-3 text-sm font-bold text-tertiary">
              No immediate payment actions.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {actionItems.map(({ milestone, action }) => {
              const fundingBreakdown = role === "CLIENT" ? getPendingMilestoneFundingBreakdown(milestone) : null;
              return (
                <Link
                  key={milestone.id}
                  href={action.href}
                  aria-label={`${action.label}: ${milestone.project.title} - ${milestone.title}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">arrow_right_alt</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-on-surface">{action.label}</p>
                    <p className="truncate text-xs font-medium text-on-surface-variant">{milestone.project.title} - {milestone.title}</p>
                    {fundingBreakdown && (
                      <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Total due {centsToCurrency(fundingBreakdown.clientTotalCents)} incl. {centsToCurrency(fundingBreakdown.platformFeeCents)} client fee
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-black text-on-surface">{formatCurrency(Number(milestone.amount))}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ClientFundingForecastPanel({ forecast }: { forecast: WalletFundingForecast }) {
  const feeModelLabel =
    forecast.marketplaceMilestoneCount > 0 && forecast.byocMilestoneCount > 0
      ? "Mixed 8% marketplace / 5% BYOC fee model"
      : forecast.byocMilestoneCount > 0
      ? "BYOC client fee model"
      : "Marketplace client fee model";

  return (
    <section className="relative z-10 px-4 lg:px-0 mb-6">
      <div data-testid="funding-forecast-panel" className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-outline-variant/10 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary">price_check</span>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Funding Forecast</h2>
              <p className="mt-1 text-[11px] font-medium leading-5 text-on-surface-variant">
                Checkout estimate for milestones that still need escrow funding. Final Stripe checkout remains the source of truth.
              </p>
            </div>
          </div>
          <span className="w-fit rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
            {feeModelLabel}
          </span>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-4">
          {[
            ["Awaiting funding", String(forecast.milestoneCount), `${forecast.marketplaceMilestoneCount} marketplace / ${forecast.byocMilestoneCount} BYOC`],
            ["Escrow amount", centsToCurrency(forecast.escrowAmountCents), "Paid to facilitator after approval"],
            [
              "Client fee",
              centsToCurrency(forecast.platformFeeCents),
              `${formatFeeRate(MARKETPLACE_CLIENT_FEE_RATE)} marketplace or ${formatFeeRate(BYOC_CLIENT_FEE_RATE)} BYOC`,
            ],
            ["Estimated total due", centsToCurrency(forecast.clientTotalCents), "Escrow amount plus client fee"],
          ].map(([label, value, detail]) => (
            <div key={label} className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-on-surface">{value}</p>
              <p className="mt-2 text-[10px] font-medium leading-4 text-on-surface-variant">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EscrowStateMap({
  role,
  summary,
}: {
  role: "CLIENT" | "FACILITATOR";
  summary: WalletEscrowSummary;
}) {
  const states: Array<{
    key: WalletEscrowStatusKey;
    label: string;
    detail: string;
    icon: string;
    tone: string;
  }> = role === "CLIENT"
    ? [
        {
          key: "pendingFunding",
          label: "Awaiting funding",
          detail: "Needs escrow checkout before work should start.",
          icon: "payments",
          tone: "text-on-surface-variant bg-surface-container-high border-outline-variant/30",
        },
        {
          key: "fundedEscrow",
          label: "Funded escrow",
          detail: "Funds are locked while delivery is underway.",
          icon: "lock",
          tone: "text-primary bg-primary/10 border-primary/20",
        },
        {
          key: "submittedReview",
          label: "Ready for review",
          detail: "Submitted work needs approval or feedback.",
          icon: "rate_review",
          tone: "text-secondary bg-secondary/10 border-secondary/20",
        },
        {
          key: "paidReleased",
          label: "Released",
          detail: "Approved milestone funds have been paid out.",
          icon: "check_circle",
          tone: "text-tertiary bg-tertiary/10 border-tertiary/20",
        },
        {
          key: "disputed",
          label: "Disputed",
          detail: "Needs resolution before funds can move.",
          icon: "gavel",
          tone: "text-error bg-error/10 border-error/20",
        },
      ]
    : [
        {
          key: "pendingFunding",
          label: "Not funded yet",
          detail: "Wait for escrow before starting delivery work.",
          icon: "hourglass_empty",
          tone: "text-on-surface-variant bg-surface-container-high border-outline-variant/30",
        },
        {
          key: "fundedEscrow",
          label: "Ready to deliver",
          detail: "Escrow is funded; submit evidence when complete.",
          icon: "lock",
          tone: "text-primary bg-primary/10 border-primary/20",
        },
        {
          key: "submittedReview",
          label: "Awaiting approval",
          detail: "Client is reviewing submitted delivery evidence.",
          icon: "rate_review",
          tone: "text-secondary bg-secondary/10 border-secondary/20",
        },
        {
          key: "paidReleased",
          label: "Paid out",
          detail: "Approved milestone payout has been recorded.",
          icon: "check_circle",
          tone: "text-tertiary bg-tertiary/10 border-tertiary/20",
        },
        {
          key: "disputed",
          label: "Disputed",
          detail: "Resolution is required before payout can proceed.",
          icon: "gavel",
          tone: "text-error bg-error/10 border-error/20",
        },
      ];

  return (
    <section className="relative z-10 px-4 lg:px-0 mb-6">
      <div data-testid="escrow-state-map" className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-outline-variant/10 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary">account_balance_wallet</span>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Escrow State Map</h2>
              <p className="mt-1 text-[11px] font-medium leading-5 text-on-surface-variant">
                {role === "CLIENT"
                  ? "A live view of which milestones need funding, review, release, or resolution."
                  : "A live view of which milestones are funded, waiting on review, paid, or blocked."}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
            Active escrow {centsToCurrency(summary.activeEscrowCents)}
          </div>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">
          {states.map((state) => {
            const bucket = summary[state.key];
            return (
              <div key={state.key} className={`rounded-xl border p-4 ${state.tone}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="material-symbols-outlined text-[18px]">{state.icon}</span>
                  <span className="rounded-full bg-surface/70 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-on-surface">
                    {bucket.count}
                  </span>
                </div>
                <p className="text-sm font-black text-on-surface">{state.label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-on-surface">{centsToCurrency(bucket.amountCents)}</p>
                <p className="mt-2 text-[10px] font-medium leading-4 text-on-surface-variant">{state.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  // ── FACILITATOR VIEW ────────────────────────────────────────────────────────
  if (user.role === "FACILITATOR") {
    const milestones = await prisma.milestone.findMany({
      where: { facilitator_id: user.id },
      include: {
        project: { select: { id: true, title: true, status: true, is_byoc: true } },
        payment_records: { orderBy: { created_at: "desc" } },
      },
      orderBy: { id: "desc" },
    });

    const paid     = milestones.filter(m => m.status === "APPROVED_AND_PAID");
    const inEscrow = milestones.filter(m => m.status === "FUNDED_IN_ESCROW" || m.status === "SUBMITTED_FOR_REVIEW");

    const totalEarned   = paid.reduce((s, m) => s + Number(m.amount), 0);
    const pendingEscrow = inEscrow.reduce((s, m) => s + Number(m.amount), 0);
    const totalVolume   = totalEarned + pendingEscrow;
    const paymentRecords = milestones.flatMap(m => m.payment_records);
    const totalPayoutCents = sumSucceededFacilitatorPayoutCents(paymentRecords);
    const isStripeConnected = !!user.stripe_account_id;
    const escrowSummary = summarizeWalletEscrowStates(milestones);

    return (
      <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

        <header className="relative z-10 mb-8 px-4 lg:px-0">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Earnings & Payouts</p>
              <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
                Wallet
              </h1>
            </div>

            {isStripeConnected ? (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-tertiary/10 border border-tertiary/30">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span className="text-tertiary font-bold text-xs uppercase tracking-widest">Stripe Express Connected</span>
              </div>
            ) : (
              <form action="/api/stripe/onboard" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-bold uppercase tracking-widest hover:border-primary/40 hover:-translate-y-0.5 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">account_balance</span>
                  Connect Bank Account
                </button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            <div className="sm:col-span-1 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Earned</p>
              <p className="text-3xl font-black text-on-surface tracking-tighter">{formatCurrency(totalEarned)}</p>
              <div className="mt-4">
                {isStripeConnected ? (
                  <form action={async () => {
                    "use server";
                    const { createStripeLoginLink } = await import("@/app/actions/stripe");
                    const { redirect: nav } = await import("next/navigation");
                    const res = await createStripeLoginLink();
                    if (res.success && res.url) nav(res.url);
                  }}>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      View Stripe Dashboard
                    </button>
                  </form>
                ) : (
                  <p className="text-[10px] text-on-surface-variant font-medium">Connect Stripe to withdraw funds.</p>
                )}
              </div>
            </div>

            <TrustMetric
              label="Held in Escrow"
              value={formatCurrency(pendingEscrow)}
              detail="Released to your wallet when each milestone is approved by the client."
              icon="lock"
            />

            <TrustMetric
              label="Payout Records"
              value={totalPayoutCents > 0 ? centsToCurrency(totalPayoutCents) : "$0"}
              detail="Confirmed payout ledger total from release records."
              icon="receipt_long"
            />

            <TrustMetric
              label="Lifetime Volume"
              value={formatCurrency(totalVolume)}
              detail="Earned + pending combined."
              icon="monitoring"
            />
          </div>
        </header>

        <PaymentExplainer role="FACILITATOR" />
        <EscrowStateMap role="FACILITATOR" summary={escrowSummary} />
        <PaymentActionQueue role="FACILITATOR" milestones={milestones} />
        <LedgerSection milestones={milestones} statusConfig={FACILITATOR_STATUS_CONFIG} role="FACILITATOR" />
      </main>
    );
  }

  // ── CLIENT VIEW ─────────────────────────────────────────────────────────────
  const projects = await prisma.project.findMany({
    where: buyerProjectListWhere(user.id),
    select: {
      id: true,
      title: true,
      status: true,
      is_byoc: true,
      created_at: true,
      milestones: {
        include: {
          payment_records: { orderBy: { created_at: "desc" } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const allMilestones = projects.flatMap(p =>
    p.milestones.map(m => ({ ...m, project: p }))
  );

  const released = allMilestones.filter(m => m.status === "APPROVED_AND_PAID");
  const inEscrow = allMilestones.filter(m => m.status === "FUNDED_IN_ESCROW" || m.status === "SUBMITTED_FOR_REVIEW");
  const totalDeployed = released.reduce((s, m) => s + Number(m.amount), 0);
  const lockedInEscrow = inEscrow.reduce((s, m) => s + Number(m.amount), 0);
  const paymentRecords = allMilestones.flatMap(m => m.payment_records);
  const totalFeesCents = sumSucceededClientFundingFeesCents(paymentRecords);
  const pendingFunding = allMilestones.filter(m => m.status === "PENDING").length;
  const reviewCount = allMilestones.filter(m => m.status === "SUBMITTED_FOR_REVIEW").length;
  const fundingForecast = summarizePendingClientFunding(allMilestones);
  const escrowSummary = summarizeWalletEscrowStates(allMilestones);

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <header className="relative z-10 mb-8 px-4 lg:px-0">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Payment Activity</p>
            <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
              Payments
            </h1>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            Post Project
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          <TrustMetric
            label="Total Deployed"
            value={formatCurrency(totalDeployed)}
            detail="Paid out to experts across all projects."
            icon="paid"
          />
          <TrustMetric
            label="Locked in Escrow"
            value={formatCurrency(lockedInEscrow)}
            detail="Held securely until each milestone is approved."
            icon="lock"
          />
          <TrustMetric
            label="Client Fees"
            value={totalFeesCents > 0 ? centsToCurrency(totalFeesCents) : "$0"}
            detail="Platform fees recorded separately from facilitator payout."
            icon="receipt_long"
          />
          <TrustMetric
            label="Action Items"
            value={String(pendingFunding + reviewCount)}
            detail={`${pendingFunding} awaiting funding, ${reviewCount} ready for review.`}
            icon="task_alt"
          />
        </div>
      </header>

      <PaymentExplainer role="CLIENT" />
      <EscrowStateMap role="CLIENT" summary={escrowSummary} />
      <ClientFundingForecastPanel forecast={fundingForecast} />
      <PaymentActionQueue role="CLIENT" milestones={allMilestones} />
      <LedgerSection milestones={allMilestones} statusConfig={CLIENT_STATUS_CONFIG} role="CLIENT" />
    </main>
  );
}

// ── Shared ledger table ──────────────────────────────────────────────────────
function LedgerSection({
  milestones,
  statusConfig,
  role,
}: {
  milestones: LedgerMilestone[];
  statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }>;
  role: "CLIENT" | "FACILITATOR";
}) {
  return (
    <section className="relative z-10 px-4 lg:px-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[16px]">receipt_long</span>
          Transaction Ledger
        </h2>
        <span className="text-[10px] text-on-surface-variant font-medium">{milestones.length} entries</span>
      </div>

      {milestones.length === 0 ? (
        <div className="bg-surface-container-low/40 border border-outline-variant/20 rounded-2xl p-16 text-center flex flex-col items-center">
          <span className="material-symbols-outlined text-[60px] text-outline-variant/40 mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>receipt</span>
          <h3 className="text-lg font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Transactions Yet</h3>
          <p className="text-sm text-on-surface-variant max-w-sm font-medium">
            Once a milestone is funded, it will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
          {milestones.map((milestone, idx) => {
            const cfg = statusConfig[milestone.status] ?? statusConfig.PENDING;
            const latestFunding = getLatestLedgerPaymentRecord(milestone.payment_records, "MILESTONE_FUNDING");
            const latestRelease = getLatestLedgerPaymentRecord(milestone.payment_records, "ESCROW_RELEASE");
            const relevantPayment = latestRelease ?? latestFunding;
            const href = `/command-center/${milestone.project_id}?tab=war-room#milestone-${milestone.id}`;

            return (
              <Link
                key={milestone.id}
                href={href}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low/40 transition-colors ${idx !== 0 ? "border-t border-outline-variant/10" : ""}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg}`}>
                  <span className={`material-symbols-outlined text-[16px] ${cfg.color}`} style={{ fontVariationSettings: milestone.status === "APPROVED_AND_PAID" ? "'FILL' 1" : "'FILL' 0" }}>
                    {cfg.icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-on-surface truncate">{milestone.title}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium truncate mt-0.5">
                    {milestone.project.title} · #{milestone.id.slice(0, 8)}
                  </p>
                  {relevantPayment && (
                    <p className="text-[10px] text-on-surface-variant font-medium truncate mt-1">
                      {role === "CLIENT"
                        ? `Fee ${centsToCurrency(relevantPayment.platform_fee_cents)} · payout ${centsToCurrency(relevantPayment.facilitator_payout_cents)}`
                        : `Payout ${centsToCurrency(relevantPayment.facilitator_payout_cents)} · fee $0`}
                    </p>
                  )}
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {relevantPayment && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {relevantPayment.status.toLowerCase()}
                    </span>
                  )}
                </div>

                <p className="text-base font-black text-on-surface shrink-0">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(milestone.amount))}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
