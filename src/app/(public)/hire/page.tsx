import Link from "next/link";
import type { Metadata } from "next";
import TestimonialGrid from "@/components/marketing/TestimonialGrid";

export const metadata: Metadata = {
  title: "Hire AI-Native Developers — Untether",
  description:
    "Post your project, get an AI-generated scope, and hire vetted facilitators who ship milestone-verified software with Stripe Escrow protection.",
};

const VALUE_PROPS = [
  {
    icon: "psychology",
    title: "AI Writes Your Scope",
    body: "Describe your project in plain English. Our AI generates a phased Statement of Work with milestones, deliverables, acceptance criteria, and cost estimates — in under 60 seconds.",
  },
  {
    icon: "verified_user",
    title: "Vetted Facilitators Only",
    body: "Every facilitator has a verified identity, trust score, and AI audit history. Review their tech stack, AI agent toolkit, and past delivery metrics before accepting any proposal.",
  },
  {
    icon: "lock",
    title: "Escrow-Protected Milestones",
    body: "Fund each milestone into Stripe Escrow before work begins. Funds release only when you approve the deliverable. Dispute? Our AI arbitration pipeline has you covered.",
  },
  {
    icon: "speed",
    title: "AI-Augmented Delivery",
    body: "Facilitators orchestrate AI agents alongside human expertise. Your software is built faster, audited by AI for quality, and verified before every escrow release.",
  },
];

const GUARANTEES = [
  { icon: "shield", text: "First milestone satisfaction guarantee" },
  { icon: "lock", text: "Stripe-secured escrow on every payment" },
  { icon: "gavel", text: "AI-powered dispute resolution" },
  { icon: "verified", text: "Identity-verified facilitators only" },
];

export default function HirePage() {
  return (
    <div className="min-h-screen bg-background text-on-surface overflow-hidden">
      {/* ─── Hero ── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 px-4">
        <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] bg-primary/8 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-tertiary/6 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-tertiary/20 bg-tertiary/5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-tertiary">
              For Clients
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-headline tracking-tighter leading-[0.95] mb-6">
            Stop managing freelancers.
            <br />
            <span className="bg-gradient-to-r from-primary via-[#7c3aed] to-tertiary bg-clip-text text-transparent">
              Start shipping verified software.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
            Post your project in plain English. Our AI scopes it, matches you with vetted facilitators,
            and locks payments in Stripe Escrow — you only pay when milestones are verified and approved.
          </p>

          <Link
            href="/register?role=CLIENT"
            className="inline-flex items-center gap-2.5 px-10 py-4 bg-on-surface text-surface font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all active:scale-95 dark:bg-white dark:text-[#0a0e18]"
          >
            <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
            Post Your First Project — Free
          </Link>
        </div>
      </section>

      {/* ─── Value Props ── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Why clients choose us</p>
            <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter">
              Your project, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">protected at every step</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUE_PROPS.map((vp, i) => (
              <div key={i} className="group relative">
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary/15 to-tertiary/10 blur opacity-0 group-hover:opacity-30 transition-all duration-500" />
                <div className="bg-surface/50 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-8 relative z-10 h-full hover:border-outline-variant/40 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/10">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{vp.icon}</span>
                  </div>
                  <h3 className="text-lg font-black font-headline tracking-tight text-on-surface mb-3">{vp.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{vp.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Risk Reversal ── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-surface/50 backdrop-blur-xl border border-primary/20 rounded-3xl p-10 md:p-14 relative overflow-hidden shadow-[0_0_60px_rgba(var(--color-primary),0.05)]">
            <div className="absolute top-0 right-0 w-60 h-60 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 text-center">
              <span className="material-symbols-outlined text-primary text-[40px] mb-5 block" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
              <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tighter mb-4">
                Your money is always protected
              </h2>
              <p className="text-on-surface-variant max-w-xl mx-auto mb-8 leading-relaxed">
                Every dollar you put into escrow is held by Stripe until you approve the deliverable. Not happy?
                Flag it for dispute and our AI arbitration pipeline will review the evidence impartially.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {GUARANTEES.map((g, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-outline-variant/15 bg-surface/40">
                    <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{g.icon}</span>
                    <p className="text-[10px] font-bold text-on-surface-variant text-center leading-snug">{g.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Client Testimonials ── */}
      <section className="relative py-20 md:py-28 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">Social proof</p>
            <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter">
              Teams that ship with <span className="text-primary">Untether</span>
            </h2>
          </div>
          <TestimonialGrid />
        </div>
      </section>

      {/* ─── Final CTA ── */}
      <section className="relative py-24 md:py-32 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter mb-5">
            Ready to post your first project?
          </h2>
          <p className="text-on-surface-variant mb-8">
            Free to post. No commitment until you fund a milestone. AI scopes your project in 60 seconds.
          </p>
          <Link
            href="/register?role=CLIENT"
            className="inline-flex items-center gap-2.5 px-10 py-4 bg-primary text-on-primary font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_20px_40px_rgba(var(--color-primary),0.3)] hover:-translate-y-1 transition-all active:scale-95"
          >
            Get Started Free
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
