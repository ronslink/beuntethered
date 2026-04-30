import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hire AI-Assisted Software Facilitators - Untether",
  description:
    "Post a software project, turn it into milestone scope, fund escrow, and review audit-backed delivery from verified human-led, AI-assisted facilitators.",
};

const BUYER_SIGNALS = [
  { label: "Delivery model", value: "Human-led", detail: "Verified facilitators use AI-assisted workflows, but they remain accountable for the outcome." },
  { label: "Payment structure", value: "Escrow", detail: "Fund each milestone before work begins and release payment after review and approval." },
  { label: "Client fee", value: "8%", detail: "Fee math is shown before checkout with facilitator payout and total due." },
  { label: "Facilitator fee", value: "0%", detail: "Facilitators keep their accepted delivery amount, making pricing easier to reason about." },
];

const VALUE_PROPS = [
  {
    icon: "contract",
    title: "AI-assisted scope before you hire",
    body: "Turn a plain-English project brief into milestones, deliverables, acceptance criteria, and budget assumptions before proposals arrive.",
  },
  {
    icon: "manage_search",
    title: "Compare proposals with structured evidence",
    body: "Review amount, timeline, milestones, risk notes, AI score card, and facilitator trust signals in one decision view.",
  },
  {
    icon: "account_balance_wallet",
    title: "Fund only the next milestone",
    body: "Escrow status is visible across the project so you know what is pending, funded, submitted, audited, approved, paid, or disputed.",
  },
  {
    icon: "fact_check",
    title: "Review audit-backed delivery",
    body: "Milestone submissions can include artifacts, links, evidence notes, and AI-assisted delivery reports before release approval.",
  },
];

const PROJECT_FLOW = [
  { step: "01", title: "Describe the outcome", desc: "Start with what the software needs to accomplish, who uses it, and what success looks like." },
  { step: "02", title: "Review generated scope", desc: "Refine milestones, deliverables, acceptance criteria, risks, budget, and timeline before publishing." },
  { step: "03", title: "Invite or receive bids", desc: "Invite selected facilitators or open the project to marketplace proposals with comparable bid details." },
  { step: "04", title: "Fund the milestone", desc: "See facilitator payout, client fee, and total due before checkout. Work begins once escrow is funded." },
  { step: "05", title: "Approve with evidence", desc: "Review submission artifacts and audit report, then approve release or raise a dispute with evidence." },
];

const TRUST_ITEMS = [
  "Facilitator identity, Stripe payout, and portfolio verification statuses",
  "Completed milestone count and average audit score",
  "Dispute count, response readiness, and profile completeness",
  "Skills, delivery categories, portfolio links, and AI tool workflow",
  "Project activity logs for bids, payments, milestones, audits, messages, and disputes",
];

export default function HirePage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <section className="border-b border-outline-variant/30 bg-surface-container-low/40 px-4 pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface px-3 py-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                For software buyers
              </span>
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-on-surface sm:text-5xl md:text-6xl">
              Hire for verified software delivery, not endless staffing.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-on-surface-variant sm:text-lg">
              Untether helps SMB tech buyers scope outcomes, compare verified facilitators who use AI-assisted workflows, fund milestones through escrow, and approve delivery with audit evidence before payment release.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register?role=CLIENT"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-[17px]">add_circle</span>
                Post a project
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-6 py-3 text-xs font-black uppercase tracking-widest text-on-surface transition hover:border-primary/40"
              >
                View pricing
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-outline-variant/40 bg-surface shadow-sm">
            <div className="border-b border-outline-variant/30 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Buyer control plane</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-on-surface">Clear scope, payment, and delivery states</h2>
            </div>
            <div className="divide-y divide-outline-variant/25">
              {BUYER_SIGNALS.map((signal) => (
                <div key={signal.label} className="grid gap-3 px-5 py-4 sm:grid-cols-[145px_115px_1fr] sm:items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{signal.label}</p>
                  <p className="font-mono text-base font-black text-on-surface">{signal.value}</p>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Why buyers use Untether</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              The workflow is built for decision clarity.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className="rounded-lg border border-outline-variant/35 bg-surface p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <span className="material-symbols-outlined text-[22px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {item.icon}
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-on-surface">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-on-surface-variant">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-outline-variant/30 bg-surface-container-low/35 px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Project workflow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              From idea to release approval with evidence.
            </h2>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              The first release is intentionally focused on practical buyer confidence: accountable facilitators, clear scope, milestone escrow, delivery evidence, and a clean activity trail.
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/35 bg-surface">
            {PROJECT_FLOW.map((item) => (
              <div key={item.step} className="grid gap-4 border-b border-outline-variant/25 px-5 py-5 last:border-b-0 sm:grid-cols-[70px_1fr]">
                <div className="font-mono text-xl font-black text-primary/80">{item.step}</div>
                <div>
                  <h3 className="font-black tracking-tight text-on-surface">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Marketplace trust</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              Review facilitator quality before you accept a bid.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Untether is being shaped as a trust-first delivery marketplace. The point is not more bids. The point is better buyer decisions and traceable delivery outcomes.
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/35 bg-surface p-5">
            <ul className="space-y-3">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-on-surface-variant">
                  <span className="material-symbols-outlined mt-0.5 text-[17px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-outline-variant/30 bg-surface-container-low/40 px-4 py-16 text-center md:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight text-on-surface md:text-4xl">
            Ready to turn a software need into a funded milestone plan?
          </h2>
          <p className="mt-4 text-sm leading-7 text-on-surface-variant">
            Post a project, review the generated scope, and choose a facilitator based on evidence instead of guesswork.
          </p>
          <Link
            href="/register?role=CLIENT"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition hover:bg-primary/90"
          >
            Post a project
            <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
