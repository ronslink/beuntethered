import Link from "next/link";
import type { Metadata } from "next";
import PublicNavbar from "@/components/layout/PublicNavbar";

export const metadata: Metadata = {
  title: "Untether - Verified Software Delivery Marketplace",
  description:
    "Hire human-led, AI-assisted software facilitators for milestone-based delivery, escrow protection, and audit-backed acceptance.",
};

const outcomes = [
  "AI-assisted scope, milestone budget, and acceptance criteria before work begins",
  "Human facilitators stay accountable for delivery quality, communication, and handoff",
  "Milestone escrow with 8% client fee, 0% facilitator fee, and visible payout math",
  "Durable delivery audits tied to evidence, demos, attachments, and activity logs",
];

const steps = [
  { title: "Scope", body: "Turn a rough business need into a structured software brief, milestones, budget, and acceptance criteria." },
  { title: "Match", body: "Invite vetted facilitators or post to the marketplace for proposals with timeline, escrow, and risk signals." },
  { title: "Verify", body: "Review submitted work with audit evidence before approving escrow release and IP transfer." },
];

const metrics = [
  { label: "Facilitator fee", value: "0%", body: "Talent keeps the rate they quote." },
  { label: "Client fee", value: "8%", body: "Applied to marketplace milestones." },
  { label: "BYOC fee", value: "5%", body: "For facilitator-sourced clients." },
];

const trustRows = [
  ["Scope", "Acceptance criteria, milestones, budget, and risk flags generated before posting."],
  ["Escrow", "Client total, platform fee, and facilitator payout shown before checkout."],
  ["Audit", "Delivery report records confidence, criteria met, criteria missed, and artifacts."],
  ["Release", "Funds release only after review, approval, and evidence-backed handoff."],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <PublicNavbar />

      <main>
        <section className="px-4 pt-24 md:pt-28 border-b border-outline-variant/30">
          <div className="max-w-7xl mx-auto min-h-[calc(100vh-7rem)] grid content-between gap-10">
            <div className="pt-8 md:pt-16 max-w-5xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary mb-6">
                <span className="material-symbols-outlined text-[14px]">verified_user</span>
                Verified software delivery
              </div>
              <h1 className="text-4xl md:text-7xl font-black font-headline tracking-tight leading-[0.95] max-w-5xl">
                Hire human-led software facilitators, accelerated by AI.
              </h1>
              <p className="mt-6 text-lg text-on-surface-variant leading-relaxed max-w-2xl">
                Untether is not hourly staffing or pure AI labor. SMB teams scope outcomes, compare verified facilitators, fund escrow, review audit-backed evidence, and release payment when software milestones are accepted.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/register?role=CLIENT" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-on-primary shadow-sm">
                  Post a Project
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
                <Link href="/talent" className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-6 py-3 text-sm font-bold text-on-surface hover:border-primary/50">
                  Browse Facilitators
                </Link>
              </div>
            </div>

            <div className="pb-6">
              <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="overflow-hidden rounded-lg border border-outline-variant/30 bg-surface shadow-xl shadow-black/5">
                  <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Live delivery control</p>
                      <h2 className="text-lg font-black">Customer Portal MVP</h2>
                    </div>
                    <span className="rounded-md bg-tertiary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-tertiary border border-tertiary/20">Audit passed</span>
                  </div>
                  <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-outline-variant/15">
                    {trustRows.map(([label, body]) => (
                      <div key={label} className="p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">{label}</p>
                        <p className="mt-3 text-sm font-semibold leading-relaxed text-on-surface">{body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-4 border-t border-outline-variant/20 bg-surface-container-low">
                    {["Escrow funded", "Preview submitted", "Audit report", "Client approval"].map((item, index) => (
                      <div key={item} className="flex items-center gap-3 px-5 py-4">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${index < 3 ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                          <span className="material-symbols-outlined text-[15px]">{index < 3 ? "check" : "lock"}</span>
                        </div>
                        <span className="text-sm font-bold">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-outline-variant/30 bg-surface p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Payment clarity</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Milestone amount</span>
                      <span className="font-black">$10,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Client fee at 8%</span>
                      <span className="font-black">$800</span>
                    </div>
                    <div className="flex justify-between border-t border-outline-variant/20 pt-3 text-sm">
                      <span className="text-on-surface-variant">Facilitator payout</span>
                      <span className="font-black text-tertiary">$10,000</span>
                    </div>
                  </div>
                  <div className="mt-5 rounded-lg border border-tertiary/20 bg-tertiary/10 px-4 py-3 text-xs font-bold text-tertiary">
                    Human-led delivery. 0% facilitator fee. No hourly ambiguity.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-10">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-primary">Why teams switch</p>
              <h2 className="mt-3 text-3xl font-black font-headline tracking-tight">Less staffing theater. More accountable delivery evidence.</h2>
              <p className="mt-4 text-on-surface-variant leading-relaxed">
                Upwork-style hiring optimizes for access. Untether optimizes for human-led, AI-assisted software outcomes: scope, escrow, audit, and handoff.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {outcomes.map((item) => (
                <div key={item} className="rounded-xl border border-outline-variant/30 bg-surface p-5">
                  <span className="material-symbols-outlined text-primary text-[20px]">task_alt</span>
                  <p className="mt-3 text-sm font-semibold leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 bg-surface-container-low border-y border-outline-variant/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-primary">Workflow</p>
                <h2 className="mt-3 text-3xl font-black font-headline tracking-tight">From idea to verified milestone.</h2>
              </div>
              <Link href="/pricing" className="text-sm font-bold text-primary">See pricing</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-xl border border-outline-variant/30 bg-surface p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">0{index + 1}</p>
                  <h3 className="mt-4 text-xl font-black">{step.title}</h3>
                  <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-outline-variant/30 bg-surface p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{metric.label}</p>
                <p className="mt-3 text-4xl font-black text-primary">{metric.value}</p>
                <p className="mt-2 text-sm text-on-surface-variant">{metric.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
