import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Untether",
  description:
    "Transparent milestone pricing for verified software delivery. 0% facilitator fee, 8% marketplace client fee, and 5% BYOC fee.",
};

const clientPlans = [
  {
    name: "Marketplace",
    price: "8%",
    sub: "client fee per funded milestone",
    features: [
      "AI scope generation",
      "Open marketplace posting",
      "Invite-to-bid",
      "Milestone escrow",
      "Delivery audit report",
      "Dispute evidence trail",
    ],
  },
  {
    name: "BYOC",
    price: "5%",
    sub: "client fee when facilitator brings the client",
    features: [
      "Secure client onboarding",
      "Facilitator-created SOW",
      "Milestone escrow",
      "Audit-backed acceptance",
      "Payment release workflow",
      "Project activity log",
    ],
  },
];

const feeExample = [
  ["Milestone amount", "$10,000"],
  ["Marketplace client fee at 8%", "$800"],
  ["Client total due", "$10,800"],
  ["Facilitator payout", "$10,000"],
];

const facilitatorFeatures = [
  "0% platform fee on facilitator earnings",
  "Stripe Connect payouts after milestone approval",
  "Trust score and audit-backed reputation",
  "AI tool workflow and portfolio profile",
  "Invite-to-bid opportunities",
  "Saved searches and project alerts",
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background text-on-surface">
      <section className="px-4 pt-28 pb-14 md:pt-36 border-b border-outline-variant/30">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-widest text-primary">Transparent pricing</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-black font-headline tracking-tight max-w-3xl">
            Pay for verified milestones, not platform confusion.
          </h1>
          <p className="mt-5 text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Clients fund milestones through escrow. Facilitators keep their quoted rate. Untether charges a clear client-side orchestration fee.
          </p>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">
          {clientPlans.map((plan) => (
            <div key={plan.name} className="rounded-2xl border border-outline-variant/30 bg-surface p-7 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{plan.name}</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-black text-primary">{plan.price}</span>
                <span className="pb-2 text-sm font-semibold text-on-surface-variant">{plan.sub}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register?role=CLIENT" className="mt-7 inline-flex w-full justify-center rounded-lg bg-primary px-5 py-3 text-sm font-black uppercase tracking-widest text-on-primary">
                Start as Client
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-14">
        <div className="max-w-5xl mx-auto rounded-2xl border border-outline-variant/30 bg-surface overflow-hidden shadow-sm">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-7 border-b lg:border-b-0 lg:border-r border-outline-variant/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Before checkout</p>
              <h2 className="mt-3 text-3xl font-black font-headline tracking-tight">Every funded milestone shows the math.</h2>
              <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                Buyers see client fee, total due, facilitator payout, and escrow state before paying. Payment records keep Stripe session, intent, transfer, and refund identifiers for auditability.
              </p>
            </div>
            <div className="divide-y divide-outline-variant/15">
              {feeExample.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 px-7 py-5">
                  <span className="text-sm font-bold text-on-surface-variant">{label}</span>
                  <span className={`text-xl font-black ${label === "Facilitator payout" ? "text-tertiary" : "text-on-surface"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 bg-surface-container-low border-y border-outline-variant/30">
        <div className="max-w-5xl mx-auto rounded-2xl border border-outline-variant/30 bg-surface p-7">
          <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">For facilitators</p>
              <h2 className="mt-3 text-4xl font-black font-headline tracking-tight">Keep 100% of your rate.</h2>
              <p className="mt-4 text-on-surface-variant leading-relaxed">
                Untether monetizes the client-side trust, escrow, and verification layer. Facilitators are not penalized for earning more.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {facilitatorFeatures.map((feature) => (
                <div key={feature} className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
                  <p className="mt-2 text-sm font-semibold">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="max-w-5xl mx-auto rounded-2xl border border-outline-variant/30 bg-surface p-7 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Positioning</p>
          <h2 className="mt-3 text-3xl font-black font-headline tracking-tight">Outcome-based delivery, not hourly staffing.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            Untether pricing is tied to funded milestones, human-led delivery, audit-backed acceptance, and payment release. You are paying for a verified delivery workflow, not a generic freelancer directory.
          </p>
          <Link href="/register?role=CLIENT" className="mt-7 inline-flex justify-center rounded-lg bg-primary px-5 py-3 text-sm font-black uppercase tracking-widest text-on-primary">
            Start a Verified Project
          </Link>
        </div>
      </section>
    </main>
  );
}
