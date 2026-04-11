import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/api/auth/signin");
  }

  // Calculate live database metrics resolving Escrow states automatically
  const milestones = await prisma.milestone.findMany({
    where: {
      facilitator_id: user.id
    },
    include: { project: true },
    orderBy: { id: "desc" }
  });

  // Calculate distinct sums depending on the Escrow pipeline progression
  const pendingEscrow = milestones
    .filter(m => m.status === "FUNDED_IN_ESCROW" || m.status === "SUBMITTED_FOR_REVIEW")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const availableBalance = milestones
    .filter(m => m.status === "APPROVED_AND_PAID" || m.status === "PENDING") // Pending typically signifies an offline state or zero bypass
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const isStripeConnected = !!user.stripe_account_id;

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full">
      {/* Background Ambient Light */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="relative mb-12">
        <div className="flex items-end justify-between flex-wrap gap-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface leading-tight">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Wallet & Payouts</span>
            </h1>
          </div>

          <div className="flex gap-4">
             {isStripeConnected ? (
                <div className="bg-tertiary/10 border border-tertiary/30 px-6 py-3 rounded-full flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_var(--color-tertiary)]"></span>
                  <span className="text-tertiary font-bold font-headline text-sm tracking-widest uppercase">Stripe Express Connected</span>
                </div>
             ) : (
                <form action="/api/stripe/onboard" method="POST">
                  <button type="submit" className="bg-surface-bright text-on-surface hover:bg-surface-container-high transition-colors px-6 py-3 rounded-full flex items-center gap-3 shadow-lg shadow-surface-variant/20 border border-outline-variant/30 cursor-pointer active:scale-95 duration-200">
                    <span className="material-symbols-outlined text-primary">account_balance</span>
                    <span className="font-bold font-headline text-sm tracking-widest uppercase">Connect Bank Account</span>
                  </button>
                </form>
             )}
          </div>
        </div>
      </header>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-surface-container/80 to-surface-container-low/40 backdrop-blur-3xl border border-outline-variant/30 p-8 rounded-3xl relative overflow-hidden group">
          <p className="text-xs font-bold font-headline uppercase tracking-widest text-on-surface-variant mb-2 relative z-10">Available to Withdraw</p>
          <p className="text-5xl font-black text-on-surface tracking-tighter relative z-10">{formatCurrency(availableBalance)}</p>
          
          <div className="mt-8 relative z-10">
            <button className={`w-full py-4 rounded-xl font-bold font-headline text-sm tracking-widest uppercase transition-all shadow-xl ${isStripeConnected ? 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-primary/20 hover:-translate-y-0.5 pointer-events-auto' : 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50'}`} disabled={!isStripeConnected}>
              Initiate Payout
            </button>
          </div>
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all pointer-events-none"></div>
        </div>

        {/* Escrow Holds */}
        <div className="bg-surface/40 backdrop-blur-xl border border-outline-variant/20 p-8 rounded-3xl relative overflow-hidden group hover:border-secondary/30 transition-all">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <p className="text-xs font-bold font-headline uppercase tracking-widest text-on-surface-variant">Pending Escrow</p>
            <span className="material-symbols-outlined text-secondary">lock_clock</span>
          </div>
          <p className="text-4xl font-black text-on-surface tracking-tighter relative z-10">{formatCurrency(pendingEscrow)}</p>
          
          <div className="mt-6 p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/10 relative z-10">
            <p className="text-xs text-on-surface-variant leading-relaxed">Funds are securely locked in Stripe Escrow. Upon client approval, these values instantly shift to your available balance.</p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-all pointer-events-none"></div>
        </div>

        {/* Platform Stats */}
        <div className="bg-surface/40 backdrop-blur-xl border border-outline-variant/20 p-8 rounded-3xl relative overflow-hidden hidden xl:block">
           <p className="text-xs font-bold font-headline uppercase tracking-widest text-on-surface-variant mb-6">Historical Flow</p>
           
           <div className="space-y-6">
             <div className="flex justify-between items-end">
               <p className="text-sm font-medium text-on-surface-variant">Total Volume</p>
               <p className="text-xl font-bold text-on-surface">{formatCurrency(availableBalance + pendingEscrow)}</p>
             </div>
             <div className="flex justify-between items-end">
               <p className="text-sm font-medium text-on-surface-variant">Zero-Fee BYOC Volume</p>
               <p className="text-xl font-bold text-tertiary">{formatCurrency(0)}</p>
             </div>
           </div>
        </div>
      </div>

      {/* Transaction History */}
      <section className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/20 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold font-headline flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Recent Transactions
          </h3>
          <button className="text-primary text-sm font-bold font-headline hover:underline transition-all">Download CSV</button>
        </div>

        {milestones.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-outline-variant/20 rounded-2xl bg-surface-container-low/30">
             <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">search_off</span>
             <p className="text-lg font-bold text-on-surface font-headline">No transactions yet</p>
             <p className="text-on-surface-variant text-sm mt-2 max-w-sm mx-auto">Once a client funds a project, your escrow deposits and payouts will explicitly log here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map(milestone => (
              <div key={milestone.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-surface-container-low/40 hover:bg-surface-container-high/60 border border-outline-variant/10 transition-all gap-4">
                 <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      milestone.status === 'APPROVED_AND_PAID' ? 'bg-tertiary/10 text-tertiary border border-tertiary/20' : 
                      milestone.status === 'FUNDED_IN_ESCROW' ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-outline-variant/20 text-outline-variant border border-outline-variant/30'
                    }`}>
                      <span className="material-symbols-outlined">
                        {milestone.status === 'APPROVED_AND_PAID' ? 'account_balance' : 'lock'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-lg">{milestone.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{milestone.project.title} &bull; ID: {milestone.id.split('-')[0]}</p>
                    </div>
                 </div>
                 <div className="flex items-center justify-between md:justify-end gap-8">
                    <div className="text-right">
                      <p className="font-black text-xl text-on-surface">{formatCurrency(Number(milestone.amount))}</p>
                      <p className={`text-[10px] font-bold font-headline uppercase tracking-widest mt-1 ${
                        milestone.status === 'APPROVED_AND_PAID' ? 'text-tertiary' : 
                        milestone.status === 'FUNDED_IN_ESCROW' ? 'text-secondary' : 'text-on-surface-variant'
                      }`}>
                        {milestone.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
