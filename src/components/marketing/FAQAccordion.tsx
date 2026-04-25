"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How does Untether make money if facilitators pay 0%?",
    a: "Clients pay an 8% Escrow Orchestration premium on top of each milestone. This covers AI scoping, Stripe escrow management, dispute resolution, and platform operations. Facilitators keep 100% of their agreed rate.",
  },
  {
    q: "What is a Facilitator?",
    a: "A Facilitator is our term for the modern developer who orchestrates AI agents alongside their own human expertise to deliver software. They don't just write code — they architect solutions, deploy AI coding agents, and manage delivery from scope to launch.",
  },
  {
    q: "How does Escrow work?",
    a: "When a client approves a bid, each milestone is funded into Stripe Escrow before the facilitator starts work. Once the facilitator submits the deliverable and the client approves it, escrow releases instantly to the facilitator's connected Stripe account. If there's a dispute, our AI-powered arbitration system reviews the evidence.",
  },
  {
    q: "Is my code safe?",
    a: "Yes. We use Atomic Code Swaps — facilitators deliver code artifacts that only fully transfer when escrow clears. All communication is encrypted, API keys are stored with AES-256-GCM encryption, and we never access your repositories without explicit authorization.",
  },
  {
    q: "Can I use my own AI tools on the platform?",
    a: "Absolutely. We support BYOC (Bring Your Own Credentials) — connect your OpenAI, Anthropic, or Google Gemini API keys to power the platform's AI features with your own accounts. Your keys are encrypted at rest and never shared.",
  },
  {
    q: "What happens if I'm not satisfied with a delivery?",
    a: "You can flag a deliverable for dispute. Our AI fact-finding system reviews the milestone requirements, acceptance criteria, and submitted work to generate an impartial report. Both parties can present evidence before resolution. Escrow stays locked throughout the process.",
  },
  {
    q: "How is the AI-generated scope created?",
    a: "You describe your project in plain English. Our AI analyses the description, identifies technical components, generates phased milestones with acceptance criteria, estimates complexity and cost, and produces a full Statement of Work. Facilitators then review and refine this scope in their proposals.",
  },
  {
    q: "Do I need to be in the US to use Untether?",
    a: "Untether is available globally. Payments are processed through Stripe, which supports facilitator payouts to 40+ countries. Identity verification and tax compliance are handled by Stripe's KYC infrastructure.",
  },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className={`border rounded-2xl transition-all overflow-hidden ${
              isOpen
                ? "border-primary/20 bg-primary/[0.02] shadow-sm"
                : "border-outline-variant/20 bg-surface/40 hover:border-outline-variant/40"
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="text-sm font-bold text-on-surface">{faq.q}</span>
              <span
                className={`material-symbols-outlined text-[20px] shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-180 text-primary" : "text-on-surface-variant"
                }`}
              >
                expand_more
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-sm text-on-surface-variant leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
