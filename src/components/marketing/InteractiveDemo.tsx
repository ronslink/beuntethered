"use client";

import { useState } from "react";

const TABS = [
  {
    id: "scope",
    icon: "psychology",
    label: "AI-Assisted Scoping",
    headline: "Describe it. Review the scope.",
    body: "Type your project idea in plain English. AI-assisted scoping analyzes complexity, drafts milestones, suggests acceptance criteria, and produces a phased Statement of Work for human review.",
    features: [
      "Natural-language project intake",
      "Auto-generated milestones & deliverables",
      "Instant cost estimation",
    ],
    visual: "edit_document",
  },
  {
    id: "match",
    icon: "groups",
    label: "Smart Matching",
    headline: "We match. You choose.",
    body: "Your scope is matched against our facilitator pool using semantic similarity on skills, past delivery quality, AI tooling proficiency, and availability. You review trust scores, audit history, and proposed approaches before selecting.",
    features: [
      "Embedding-based skill matching",
      "Trust scores & audit history",
      "Side-by-side proposal comparison",
    ],
    visual: "hub",
  },
  {
    id: "escrow",
    icon: "lock",
    label: "Stripe Escrow",
    headline: "Funds locked. Risk eliminated.",
    body: "Each milestone is funded into Stripe Escrow before work begins. Facilitators build with confidence knowing payment is guaranteed. Clients keep control — escrow only releases when the deliverable is reviewed and approved.",
    features: [
      "Per-milestone escrow funding",
      "Automated release on approval",
      "Dispute resolution pipeline",
    ],
    visual: "account_balance",
  },
  {
    id: "deliver",
    icon: "verified",
    label: "Verifiable Deliverables",
    headline: "Evidence reviewed. Escrow released.",
    body: "Every deliverable is paired with proof against the acceptance criteria locked in the Statement of Work. AI-assisted audit reports organize the evidence, while the client approves release after review.",
    features: [
      "AI-assisted audit reports",
      "Live preview environments",
      "Evidence-based approval gateway",
    ],
    visual: "gavel",
  },
];

export default function InteractiveDemo() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <div>
      {/* ── Tab Bar ── */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(i)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              i === active
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "text-on-surface-variant border border-outline-variant/20 hover:border-primary/30 hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">Step {i + 1}</span>
          </button>
        ))}
      </div>

      {/* ── Content Panel ── */}
      <div
        key={tab.id}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-bottom-3 duration-400"
      >
        {/* Text Side */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-black">
              {active + 1}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              {tab.label}
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black font-headline tracking-tighter text-on-surface mb-4">
            {tab.headline}
          </h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            {tab.body}
          </p>
          <ul className="space-y-2.5">
            {tab.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <span
                  className="material-symbols-outlined text-primary text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className="text-on-surface font-medium">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual Side */}
        <div className="relative">
          <div className="bg-surface/50 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-10 flex items-center justify-center aspect-[4/3] relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-[-30%] right-[-20%] w-[300px] h-[300px] bg-primary/8 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[200px] h-[200px] bg-secondary/6 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative z-10 text-center">
              <span
                className="material-symbols-outlined text-primary text-[64px] mb-4 block"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
              >
                {tab.visual}
              </span>
              <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
                {tab.label}
              </p>
            </div>

            {/* Decorative dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {TABS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === active ? "bg-primary w-4" : "bg-outline-variant/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
