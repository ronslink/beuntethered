import Link from "next/link";
import type { Metadata } from "next";
import EarningsCalculator from "@/components/marketing/EarningsCalculator";

export const metadata: Metadata = {
  title: "Build on Untether — Keep 100% of Your Rate",
  description:
    "Join the AI-native marketplace where facilitators keep 0% platform fees, get instant Stripe payouts, and showcase their AI agent stack to clients.",
};

const FACILITATOR_PERKS = [
  {
    icon: "payments",
    title: "Keep 100% of Your Rate",
    body: "We charge clients, not you. Your hourly rate is your take-home. No 20% tax, no hidden deductions, no monthly fees.",
  },
  {
    icon: "bolt",
    title: "Instant Stripe Payouts",
    body: "The moment a client approves your milestone, escrow releases instantly to your connected Stripe account. No net-30, no invoice chasing.",
  },
  {
    icon: "smart_toy",
    title: "AI is Your Edge — Not a Secret",
    body: "Showcase your AI agent stack — Cursor, Copilot, Claude, custom pipelines. Clients on Untether value AI-augmented delivery. It's your competitive advantage.",
  },
  {
    icon: "shield",
    title: "Guaranteed Payment",
    body: "Every milestone is funded into escrow before you start work. You never build on a promise — the money is already locked in Stripe.",
  },
];

const VETTING_CRITERIA = [
  "Verified identity via Stripe KYC",
  "Demonstrated portfolio or GitHub activity",
  "AI tooling proficiency (BYOC credentials or agent stack)",
  "Professional bio and skills profile completed",
  "Terms of Service and platform guidelines accepted",
];

const HOW_IT_WORKS = [
  { step: "01", title: "Complete your profile", desc: "Add your skills, AI agent stack, hourly rate, and connect Stripe for payouts." },
  { step: "02", title: "Browse open projects", desc: "Filter by tech stack, budget, and timeline. AI-generated scopes make requirements crystal clear." },
  { step: "03", title: "Submit proposals", desc: "Propose your approach, timeline, and milestones. Our AI scores and ranks proposals for clients." },
  { step: "04", title: "Build & get paid", desc: "Deliver milestone by milestone. Submit, get approved, get paid — instantly." },
];

export default function BuildPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface overflow-hidden">
      {/* ─── Hero ── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 px-4">
        <div className="absolute top-[-15%] right-[-10%] w-[700px] h-[700px] bg-secondary/8 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary/6 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/20 bg-secondary/5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
              For Facilitators
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-headline tracking-tighter leading-[0.95] mb-6">
            We take 0%.
            <br />
            <span className="bg-gradient-to-r from-secondary via-primary to-[#7c3aed] bg-clip-text text-transparent">
              You keep everything.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
            The marketplace built for developers who orchestrate AI agents. No platform tax on your earnings,
            instant Stripe payouts, and clients who actually value your AI workflow.
          </p>

          <Link
            href="/register?role=FACILITATOR"
            className="inline-flex items-center gap-2.5 px-10 py-4 bg-on-surface text-surface font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all active:scale-95 dark:bg-white dark:text-[#0a0e18]"
          >
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
            Apply as a Facilitator
          </Link>
        </div>
      </section>

      {/* ─── Perks Grid ── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Why facilitators choose us</p>
            <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter">
              Built for <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">modern developers</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FACILITATOR_PERKS.map((p, i) => (
              <div key={i} className="group relative">
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-secondary/15 to-primary/10 blur opacity-0 group-hover:opacity-30 transition-all duration-500" />
                <div className="bg-surface/50 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-8 relative z-10 h-full hover:border-outline-variant/40 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-5 border border-secondary/10">
                    <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
                  </div>
                  <h3 className="text-lg font-black font-headline tracking-tight text-on-surface mb-3">{p.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Earnings Calculator ── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Earnings Calculator</p>
            <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter">
              See how much more you <span className="text-primary">keep</span>
            </h2>
            <p className="text-on-surface-variant mt-3 max-w-lg mx-auto">
              Adjust your rate and hours to compare your annual take-home across platforms.
            </p>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      {/* ─── How It Works ── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter">
              From signup to <span className="text-primary">first payout</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-surface/50 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-6 hover:border-outline-variant/40 transition-all">
                <span className="text-3xl font-black text-primary/20 font-mono tracking-tighter">{s.step}</span>
                <h3 className="text-sm font-black text-on-surface mt-2 mb-1.5">{s.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Vetting Criteria ── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-surface/50 backdrop-blur-xl border border-secondary/20 rounded-3xl p-10 md:p-14 relative overflow-hidden shadow-[0_0_60px_rgba(var(--color-secondary),0.04)]">
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-secondary/5 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-secondary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <h2 className="text-xl font-black font-headline tracking-tight">Facilitator Vetting Criteria</h2>
              </div>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                To maintain platform quality, all facilitators must complete these requirements before submitting their first bid:
              </p>
              <ul className="space-y-3">
                {VETTING_CRITERIA.map((c, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#059669] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-sm text-on-surface font-medium">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ── */}
      <section className="relative py-24 md:py-32 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/3 to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter mb-5">
            Ready to keep <span className="text-primary">100%</span> of your rate?
          </h2>
          <p className="text-on-surface-variant mb-8">
            Join the marketplace where AI is your edge, not your secret. Free to join, instant payouts on delivery.
          </p>
          <Link
            href="/register?role=FACILITATOR"
            className="inline-flex items-center gap-2.5 px-10 py-4 bg-primary text-on-primary font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_20px_40px_rgba(var(--color-primary),0.3)] hover:-translate-y-1 transition-all active:scale-95"
          >
            Apply as a Facilitator
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
