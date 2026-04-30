import Link from "next/link";
import type { Metadata } from "next";
import EarningsCalculator from "@/components/marketing/EarningsCalculator";

export const metadata: Metadata = {
  title: "Build on Untether - Verified Software Delivery",
  description:
    "Join Untether as a human-led, AI-assisted software facilitator. Keep 100% of your milestone rate, work from funded escrow, and build audit-backed delivery reputation.",
};

const PLATFORM_SIGNALS = [
  { label: "Facilitator platform fee", value: "0%", detail: "Client fees fund the marketplace, not deductions from your payout." },
  { label: "Work model", value: "Milestones", detail: "Outcome-based delivery with acceptance criteria before work starts." },
  { label: "Payment protection", value: "Escrow", detail: "Milestones are funded before delivery work begins." },
  { label: "Reputation layer", value: "Audit-backed", detail: "Delivery reports help quality work compound into trust." },
];

const FACILITATOR_PERKS = [
  {
    icon: "payments",
    title: "Keep 100% of your accepted milestone rate",
    body: "Untether charges a transparent client fee. Your accepted facilitator amount is not reduced by a marketplace commission.",
  },
  {
    icon: "lock",
    title: "Build against funded escrow",
    body: "Milestone state is explicit: pending funding, funded, submitted, audited, approved, paid, or disputed.",
  },
  {
    icon: "verified",
    title: "Turn delivery quality into buyer confidence",
    body: "Completed milestones, audit scores, dispute history, and verification signals become part of your marketplace profile.",
  },
  {
    icon: "smart_toy",
    title: "Show your AI-assisted workflow",
    body: "Document your AI tool stack, code assistants, review process, and BYOK setup so clients understand how you deliver outcomes.",
  },
];

const DELIVERY_FLOW = [
  { step: "01", title: "Complete verification", desc: "Add identity, Stripe payout readiness, portfolio links, skills, availability, and AI tool stack." },
  { step: "02", title: "Find the right opportunities", desc: "Review open projects, invited bids, saved searches, scope quality, budget, timeline, and buyer readiness." },
  { step: "03", title: "Propose milestones", desc: "Submit delivery plans with scope, risks, timeline, acceptance criteria, and a clear escrow requirement." },
  { step: "04", title: "Submit evidence", desc: "Attach artifacts, links, notes, and completion proof so the client and audit report can review the milestone." },
  { step: "05", title: "Get approved and paid", desc: "When the milestone passes review and the client approves, payout records make the release traceable." },
];

const PROFILE_REQUIREMENTS = [
  "Stripe payout readiness and verification status",
  "Portfolio URL, GitHub activity, or relevant delivery evidence",
  "Skills, preferred project types, and availability",
  "AI tool stack, review workflow, and quality controls",
  "Clear response expectations and proposal preference",
];

export default function BuildPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <section className="border-b border-outline-variant/30 bg-[linear-gradient(135deg,rgba(var(--color-primary),0.08),rgba(var(--color-secondary),0.045)_42%,rgba(var(--color-tertiary),0.035))] px-4 pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface px-3 py-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">engineering</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                For AI-assisted software facilitators
              </span>
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-on-surface sm:text-5xl md:text-6xl">
              Build verified software outcomes{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent">
                without giving up your margin.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-on-surface-variant sm:text-lg">
              Untether is built for facilitators who combine AI tools, engineering judgment, and milestone discipline to ship software. Work from funded escrow, keep 100% of your accepted facilitator rate, and turn audited delivery into reputation.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register?role=FACILITATOR"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-[17px]">verified</span>
                Apply as a facilitator
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-6 py-3 text-xs font-black uppercase tracking-widest text-on-surface transition hover:border-primary/40"
              >
                Sign in
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-primary/20 bg-surface shadow-sm">
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-tertiary" />
            <div className="border-b border-outline-variant/30 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Facilitator control plane</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-on-surface">Outcome work, visible state</h2>
            </div>
            <div className="divide-y divide-outline-variant/25">
              {PLATFORM_SIGNALS.map((signal) => (
                <div key={signal.label} className="grid gap-3 px-5 py-4 sm:grid-cols-[150px_90px_1fr] sm:items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{signal.label}</p>
                  <p className="font-mono text-lg font-black text-on-surface">{signal.value}</p>
                  <p className="text-sm leading-6 text-on-surface-variant">{signal.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Why build here</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              The marketplace layer is designed around trust, not hourly staffing.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {FACILITATOR_PERKS.map((perk) => (
              <div key={perk.title} className="rounded-lg border border-outline-variant/35 bg-surface p-6 shadow-[0_12px_35px_rgba(var(--color-primary),0.035)]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <span className="material-symbols-outlined text-[22px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {perk.icon}
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-on-surface">{perk.title}</h3>
                <p className="mt-2 text-sm leading-7 text-on-surface-variant">{perk.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-outline-variant/30 bg-[linear-gradient(180deg,rgba(var(--color-secondary),0.05),rgba(var(--color-primary),0.025))] px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Milestone workflow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              From profile readiness to audit-backed payout.
            </h2>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              Facilitators should be able to understand the next required action at every point in the delivery cycle. This is the workflow the app is being shaped around.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-secondary/20 bg-surface shadow-sm">
            <div className="h-1 bg-gradient-to-r from-secondary via-primary to-tertiary" />
            {DELIVERY_FLOW.map((item, index) => (
              <div key={item.step} className="grid gap-4 border-b border-outline-variant/25 px-5 py-5 last:border-b-0 sm:grid-cols-[70px_1fr]">
                <div className="font-mono text-xl font-black text-primary/80">{item.step}</div>
                <div>
                  <h3 className="font-black tracking-tight text-on-surface">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.desc}</p>
                  {index < DELIVERY_FLOW.length - 1 ? (
                    <div className="mt-4 h-px w-16 bg-outline-variant/40 sm:hidden" />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Facilitator economics</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              0% facilitator fee, with buyer pricing shown before checkout.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
              The calculator still uses hourly inputs for comparison because the market thinks that way, but Untether’s operating model is milestone-based. Your proposal should translate effort into outcomes, deliverables, and acceptance criteria.
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/35 bg-surface p-5">
            <ul className="space-y-3">
              {PROFILE_REQUIREMENTS.map((requirement) => (
                <li key={requirement} className="flex gap-3 text-sm leading-6 text-on-surface-variant">
                  <span className="material-symbols-outlined mt-0.5 text-[17px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-5xl">
          <EarningsCalculator />
        </div>
      </section>

      <section className="border-t border-outline-variant/30 bg-surface-container-low/40 px-4 py-16 text-center md:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight text-on-surface md:text-4xl">
            Ready to build with clearer scope, funded milestones, and audit-backed reputation?
          </h2>
          <p className="mt-4 text-sm leading-7 text-on-surface-variant">
            Create your facilitator profile, connect payout readiness, and start competing for outcome-based software projects.
          </p>
          <Link
            href="/register?role=FACILITATOR"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition hover:bg-primary/90"
          >
            Apply as a facilitator
            <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
