import Link from "next/link";
import type { Metadata } from "next";
import EarningsCalculator from "@/components/marketing/EarningsCalculator";
import FAQAccordion from "@/components/marketing/FAQAccordion";

export const metadata: Metadata = {
  title: "Pricing — Untether",
  description:
    "Transparent pricing for clients and facilitators. 0% facilitator fees. 8% client escrow premium. No hidden costs.",
};

const CLIENT_TIERS = [
  {
    name: "Standard",
    price: "Free",
    priceSub: "to post projects",
    highlight: false,
    features: [
      "AI-generated project scopes",
      "Unlimited project postings",
      "Facilitator matching & proposals",
      "Stripe Escrow protection",
      "8% escrow orchestration fee per milestone",
      "Email support",
    ],
  },
  {
    name: "BYOC Pro",
    price: "$49",
    priceSub: "/month",
    highlight: true,
    features: [
      "Everything in Standard",
      "Use your own AI keys (OpenAI, Anthropic, Gemini)",
      "Priority facilitator matching",
      "Advanced scope customization",
      "Dedicated concierge support",
      "Lower 6% escrow fee on milestones over $10k",
    ],
  },
];

const FACILITATOR_PRICING = {
  name: "Facilitator",
  price: "Free",
  priceSub: "forever",
  features: [
    "0% platform fee — you keep 100% of your rate",
    "Instant Stripe payouts on milestone approval",
    "AI agent stack showcase on your profile",
    "AI-scored proposal ranking",
    "Trust score & audit history tracking",
    "BYOC — bring your own AI credentials",
  ],
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface overflow-hidden">
      {/* ─── Hero ── */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-20 px-4">
        <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] bg-primary/6 blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Transparent Pricing
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-headline tracking-tighter leading-[0.95] mb-6">
            Simple pricing.
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              No surprises.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Facilitators pay <strong className="text-on-surface">0% — always</strong>. Clients pay an 8% Escrow Orchestration fee on each milestone.
            That&apos;s it. No hidden costs, no subscription required to post.
          </p>
        </div>
      </section>

      {/* ─── Client Pricing ── */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3">Client Plans</p>
            <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">
              Post projects, hire facilitators
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {CLIENT_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 flex flex-col h-full ${
                  tier.highlight
                    ? "bg-surface/50 backdrop-blur-xl border-2 border-primary/30 shadow-[0_0_50px_rgba(var(--color-primary),0.06)]"
                    : "bg-surface/40 backdrop-blur-xl border border-outline-variant/20"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg shadow-primary/20">
                      Recommended
                    </span>
                  </div>
                )}
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2">{tier.name}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black text-on-surface tracking-tighter">{tier.price}</span>
                  <span className="text-sm text-on-surface-variant font-bold ml-1">{tier.priceSub}</span>
                </div>
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="text-on-surface-variant">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register?role=CLIENT"
                  className={`mt-8 block text-center font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all ${
                    tier.highlight
                      ? "bg-primary text-on-primary shadow-lg shadow-primary/20 hover:-translate-y-0.5"
                      : "border-2 border-outline-variant/30 text-on-surface hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Facilitator Pricing ── */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">Facilitator Plan</p>
            <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">
              Build software, keep <span className="text-primary">everything</span>
            </h2>
          </div>

          <div className="bg-surface/50 backdrop-blur-xl border border-secondary/20 rounded-2xl p-8 md:p-10 relative overflow-hidden shadow-[0_0_50px_rgba(var(--color-secondary),0.04)]">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-secondary to-primary" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/5 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest text-secondary mb-2">{FACILITATOR_PRICING.name}</p>
                <div className="mb-4">
                  <span className="text-5xl font-black text-on-surface tracking-tighter">{FACILITATOR_PRICING.price}</span>
                  <span className="text-lg text-on-surface-variant font-bold ml-2">{FACILITATOR_PRICING.priceSub}</span>
                </div>
                <ul className="space-y-3">
                  {FACILITATOR_PRICING.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="material-symbols-outlined text-[#059669] text-[16px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="text-on-surface-variant">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/register?role=FACILITATOR"
                className="shrink-0 bg-on-surface text-surface font-black uppercase tracking-widest text-xs px-8 py-4 rounded-xl hover:-translate-y-0.5 transition-all shadow-lg active:scale-95 dark:bg-white dark:text-[#0a0e18]"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Earnings Calculator ── */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Earnings Calculator</p>
            <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">
              See how much you <span className="text-primary">save</span>
            </h2>
            <p className="text-on-surface-variant mt-3 max-w-lg mx-auto text-sm">
              Drag the sliders to compare your annual take-home on Untether vs. other platforms.
            </p>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      {/* ─── FAQ ── */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="absolute inset-0 bg-surface-container-low/30" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3">FAQ</p>
            <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">
              Frequently asked questions
            </h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* ─── Final CTA ── */}
      <section className="relative py-24 md:py-32 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter mb-5">
            Ready to get started?
          </h2>
          <p className="text-on-surface-variant mb-8">
            Free to join as a client or facilitator. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register?role=CLIENT"
              className="px-8 py-4 bg-primary text-on-primary font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_15px_30px_rgba(var(--color-primary),0.3)] hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              I&apos;m Hiring
            </Link>
            <Link
              href="/register?role=FACILITATOR"
              className="px-8 py-4 border-2 border-outline-variant/30 text-on-surface font-black uppercase tracking-widest text-xs rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              I&apos;m Building
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
