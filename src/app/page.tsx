import Link from "next/link";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import PublicNavbar from "@/components/layout/PublicNavbar";
import InteractiveDemo from "@/components/marketing/InteractiveDemo";
import TestimonialGrid from "@/components/marketing/TestimonialGrid";
import FAQAccordion from "@/components/marketing/FAQAccordion";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Untether — AI-Native Freelance Marketplace with Escrow Protection",
  description:
    "Post projects, get AI-generated scopes, and hire vetted facilitators who orchestrate AI agents and human expertise. Milestone-based Stripe Escrow. 0% facilitator fees.",
  openGraph: {
    title: "Untether — AI-Native Freelance Marketplace with Escrow Protection",
    description:
      "Stop paying for hours. Start paying for verifiable software. AI scopes, Stripe escrow, 0% facilitator fees.",
    type: "website",
  },
};

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const CONTRAST_ROWS = [
  { old: "Vague job posts nobody reads", now: "AI-generated Statements of Work" },
  { old: "Hourly tracking spyware", now: "Fixed-price milestone escrow" },
  { old: "Blindly paying for unverified code", now: "AI Code Audits verify Acceptance Criteria" },
  { old: "20% platform fees on talent", now: "0% facilitator fees — they keep every dollar" },
  { old: "IP hostage situations", now: "Atomic Code Swaps — code unlocks on payment" },
];

const STATS = [
  { label: "Facilitator Fee", value: "0%", sub: "They keep everything" },
  { label: "Client Premium", value: "8%", sub: "Escrow orchestration" },
  { label: "Payout Speed", value: "Instant", sub: "On milestone approval" },
];

const TRUST_BADGES = [
  { icon: "lock", text: "Stripe-secured escrow" },
  { icon: "verified_user", text: "Identity-verified facilitators" },
  { icon: "gavel", text: "Autonomous AI code audits" },
  { icon: "shield", text: "AES-256 encrypted credentials" },
];

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className={`${mono.variable} min-h-screen bg-background text-on-surface overflow-hidden`}>

      {/* ─── NAV ────────────────────────────────────────────────────────────── */}
      <PublicNavbar />

      {/* ─── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 px-4">
        {/* Ambient glows */}
        <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] bg-primary/8 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/6 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary" style={{ fontFamily: "var(--font-mono, monospace)" }}>AI-Native Escrow Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-headline tracking-tighter leading-[0.95] mb-6">
            Stop paying for hours.
            <br />
            <span className="bg-gradient-to-r from-primary via-[#7c3aed] to-secondary bg-[length:200%_auto] bg-clip-text text-transparent tracking-[-0.03em]">
              Start paying for verified software.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
            Tomorrow&apos;s software is built collaboratively. On Untether, both clients and facilitators work alongside autonomous AI agents to perfectly scope, build, and objectively verify every milestone before escrow releases.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register?role=CLIENT"
              className="px-8 py-4 bg-on-surface text-surface font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2.5 dark:bg-white dark:text-[#0a0e18]"
            >
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              Get Started Free — I&apos;m a Client
            </Link>
            <Link
              href="/register?role=FACILITATOR"
              className="px-8 py-4 border-2 border-outline-variant/30 text-on-surface font-black uppercase tracking-widest text-xs rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2.5"
            >
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              Apply as Facilitator — I Build Software
            </Link>
          </div>

          {/* Social proof pills */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Trusted by teams building in</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Fintech", "Healthtech", "SaaS", "AI Infrastructure", "Web3"].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full border border-outline-variant/30 text-on-surface-variant text-[10px] font-bold">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTRAST GRID (Enemy vs. Solution) ─────────────────────────────── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">Why switch?</p>
            <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter">
              The old way is{" "}
              <span className="line-through opacity-40">broken</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old Way */}
            <div className="bg-surface/40 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-outline-variant/30 to-transparent" />
              <div className="flex items-center gap-2.5 mb-6">
                <span className="material-symbols-outlined text-outline-variant text-xl">block</span>
                <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">The Old Way</h3>
              </div>
              <ul className="space-y-4">
                {CONTRAST_ROWS.map((row, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-outline-variant text-[16px] mt-0.5 shrink-0">close</span>
                    <span className="text-on-surface-variant line-through opacity-60 text-sm">{row.old}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Untether Way */}
            <div className="bg-surface/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(var(--color-primary),0.05)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-6 relative z-10">
                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">The Untether Way</h3>
              </div>
              <ul className="space-y-4 relative z-10">
                {CONTRAST_ROWS.map((row, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-on-surface font-medium text-sm">{row.now}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE HOW IT WORKS ───────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter">
              From idea to{" "}
              <span className="bg-gradient-to-r from-tertiary to-primary bg-clip-text text-transparent">verified delivery</span>
            </h2>
          </div>
          <InteractiveDemo />
        </div>
      </section>

      {/* ─── TALENT-FIRST DECLARATION ───────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="absolute top-[20%] left-[30%] w-[600px] h-[400px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-4">For Facilitators</p>
              <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter leading-[0.95] mb-6">
                We take 0%.
                <br />
                <span className="text-on-surface-variant">You keep your rate.</span>
              </h2>
              <p className="text-on-surface-variant leading-relaxed mb-8">
                We don&apos;t tax your expertise. Clients pay an 8% Escrow Orchestration premium
                so you can focus on delivering elite outcomes — with AI agents as your force multiplier.
                No scope creep. No invoice chasing. No surprises.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register?role=FACILITATOR"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-on-surface text-surface font-black uppercase tracking-widest text-xs rounded-xl hover:-translate-y-0.5 transition-all shadow-lg active:scale-95 dark:bg-white dark:text-[#0a0e18]"
                >
                  Join as a Facilitator
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
                <Link
                  href="/build"
                  className="inline-flex items-center gap-2 px-6 py-3.5 border border-outline-variant/30 text-on-surface-variant font-bold text-xs rounded-xl hover:border-primary/40 hover:text-on-surface transition-all"
                >
                  Learn more
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {STATS.map((stat, i) => (
                <div key={i} className="bg-surface/50 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-6 text-center hover:border-primary/30 transition-colors">
                  <p className="text-3xl font-black text-primary tracking-tighter mb-1" style={{ fontFamily: "var(--font-mono, monospace)" }}>{stat.value}</p>
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface mb-0.5">{stat.label}</p>
                  <p className="text-[10px] text-on-surface-variant">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">Social proof</p>
            <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter">
              What our users are <span className="text-primary">saying</span>
            </h2>
          </div>
          <TestimonialGrid />
        </div>
      </section>

      {/* ─── TRUST ARCHITECTURE ─────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3">Security</p>
            <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">
              Built on trust, secured by Stripe
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
            {TRUST_BADGES.map((b, i) => (
              <div key={i} className="bg-surface/50 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-5 flex flex-col items-center gap-3 text-center hover:border-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                <p className="text-[10px] font-bold text-on-surface-variant leading-snug">{b.text}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="text-center mb-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3">FAQ</p>
            <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">
              Frequently asked questions
            </h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-32 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter mb-5">
            Ready to build software{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">the right way?</span>
          </h2>
          <p className="text-on-surface-variant mb-8">
            Join the marketplace where AI writes the scope, agents build alongside facilitators, and Stripe locks the escrow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/hire"
              className="px-8 py-4 bg-primary text-on-primary font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_20px_40px_rgba(var(--color-primary),0.3)] hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              I&apos;m Hiring
            </Link>
            <Link
              href="/build"
              className="px-8 py-4 border-2 border-outline-variant/30 text-on-surface font-black uppercase tracking-widest text-xs rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              I&apos;m Building
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-outline-variant/15 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
            </div>
            <span className="font-black font-headline text-xs tracking-tight text-on-surface">Untether</span>
            <span className="text-[10px] text-on-surface-variant ml-1">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-on-surface-variant">
            <Link href="/hire" className="hover:text-on-surface transition-colors">For Clients</Link>
            <Link href="/build" className="hover:text-on-surface transition-colors">For Facilitators</Link>
            <Link href="/pricing" className="hover:text-on-surface transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-on-surface transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-on-surface transition-colors">Privacy</Link>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Payments secured by Stripe
          </div>
        </div>
      </footer>
    </div>
  );
}
