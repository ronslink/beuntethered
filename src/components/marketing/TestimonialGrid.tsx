const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "CTO, StackLayer",
    type: "CLIENT" as const,
    quote:
      "We went from vague requirements to a deployed MVP in 3 weeks. The AI scope was 90% right from day one — our facilitator just refined the edge cases.",
    metric: "3-week MVP",
  },
  {
    name: "Marcus Rivera",
    role: "Full-Stack Facilitator",
    type: "FACILITATOR" as const,
    quote:
      "I made $14k more in my first quarter on Untether compared to Upwork. Zero platform fees and the AI audit reports actually make clients trust me faster.",
    metric: "$14k more per quarter",
  },
  {
    name: "Priya Sharma",
    role: "Founder, HealthSync",
    type: "CLIENT" as const,
    quote:
      "The milestone escrow changed everything. I fund each phase, review the deliverable, and release payment — no more scope creep arguments or invoice chaos.",
    metric: "Zero payment disputes",
  },
  {
    name: "James Okafor",
    role: "AI/ML Facilitator",
    type: "CLIENT" as const,
    quote:
      "Clients can actually see my AI tool stack: Cursor, Claude, and custom review pipelines. On other platforms I had to hide my AI usage. Here it's part of how I prove delivery quality.",
    metric: "5× more bids accepted",
  },
  {
    name: "Emily Zhang",
    role: "VP Engineering, Meridian",
    type: "CLIENT" as const,
    quote:
      "We've posted 8 projects so far. The AI-assisted SOW drafts give our team a strong starting point, and facilitator matching is impressively accurate.",
    metric: "8 projects shipped",
  },
  {
    name: "Daniel Kowalski",
    role: "DevOps Facilitator",
    type: "FACILITATOR" as const,
    quote:
      "Instant Stripe payouts on milestone approval. I submitted my Terraform deliverable at 2pm and had the money in my account by 2:01pm. That's the dream.",
    metric: "Instant payouts",
  },
];

export default function TestimonialGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {TESTIMONIALS.map((t, i) => (
        <div
          key={i}
          className="group relative"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/5 blur opacity-0 group-hover:opacity-40 transition-all duration-500" />
          <div className="bg-surface/50 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-6 relative z-10 h-full flex flex-col hover:border-outline-variant/40 transition-all">
            {/* Quote */}
            <p className="text-sm text-on-surface-variant leading-relaxed flex-1 mb-5">
              &ldquo;{t.quote}&rdquo;
            </p>

            {/* Metric chip */}
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                <span
                  className="material-symbols-outlined text-[12px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  trending_up
                </span>
                {t.metric}
              </span>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/15">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-primary">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div>
                <p className="text-xs font-black text-on-surface">{t.name}</p>
                <p className="text-[10px] text-on-surface-variant">{t.role}</p>
              </div>
              <span
                className={`ml-auto text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                  t.type === "CLIENT"
                    ? "text-tertiary border-tertiary/20 bg-tertiary/5"
                    : "text-secondary border-secondary/20 bg-secondary/5"
                }`}
              >
                {t.type}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
