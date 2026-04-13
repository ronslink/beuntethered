import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  APPROVED_AND_PAID:    { label: "Paid Out",        color: "text-tertiary",          bg: "bg-tertiary/10 border-tertiary/20",    icon: "check_circle" },
  FUNDED_IN_ESCROW:     { label: "In Escrow",       color: "text-primary",           bg: "bg-primary/10 border-primary/20",      icon: "lock" },
  SUBMITTED_FOR_REVIEW: { label: "Under Review",    color: "text-secondary",         bg: "bg-secondary/10 border-secondary/20",  icon: "rate_review" },
  PENDING:              { label: "Pending",          color: "text-on-surface-variant", bg: "bg-surface-container-high border-outline-variant/20", icon: "hourglass_empty" },
  DISPUTED:             { label: "Disputed",         color: "text-error",             bg: "bg-error/10 border-error/20",          icon: "gavel" },
};

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  const milestones = await prisma.milestone.findMany({
    where: { facilitator_id: user.id },
    include: { project: true },
    orderBy: { id: "desc" },
  });

  const paid     = milestones.filter(m => m.status === "APPROVED_AND_PAID");
  const inEscrow = milestones.filter(m => m.status === "FUNDED_IN_ESCROW" || m.status === "SUBMITTED_FOR_REVIEW");

  const totalEarned   = paid.reduce((s, m) => s + Number(m.amount), 0);
  const pendingEscrow = inEscrow.reduce((s, m) => s + Number(m.amount), 0);
  const totalVolume   = totalEarned + pendingEscrow;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const isStripeConnected = !!user.stripe_account_id;

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Header ── */}
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

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {/* Primary: Total Earned */}
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

          {/* Pending Escrow */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Held in Escrow</p>
              <span className="material-symbols-outlined text-primary text-[16px]">lock</span>
            </div>
            <p className="text-3xl font-black text-on-surface tracking-tighter">{formatCurrency(pendingEscrow)}</p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-3 leading-relaxed">
              Released to your wallet when each milestone is approved by the client.
            </p>
          </div>

          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Lifetime Volume</p>
            <p className="text-3xl font-black text-on-surface tracking-tighter">{formatCurrency(totalVolume)}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[13px] text-on-surface-variant">info</span>
              <p className="text-[10px] text-on-surface-variant font-medium">Earned + pending combined</p>
            </div>
          </div>
        </div>
      </header>

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
              Once a client funds a milestone, it will appear here.
            </p>
            <Link href="/marketplace" className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20">
              Browse the Marketplace
            </Link>
          </div>
        ) : (
          <div className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
            {milestones.map((milestone, idx) => {
              const cfg = STATUS_CONFIG[milestone.status] ?? STATUS_CONFIG.PENDING;
              return (
                <div
                  key={milestone.id}
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
                  </div>

                  <span className={`hidden sm:block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>

                  <p className="text-base font-black text-on-surface shrink-0">{formatCurrency(Number(milestone.amount))}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
