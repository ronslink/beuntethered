"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOnboardingStep, completeOnboarding } from "@/app/actions/onboarding";

// ─── Constants ───────────────────────────────────────
const SKILL_SUGGESTIONS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "PostgreSQL",
  "AWS", "Docker", "Prisma", "GraphQL", "Tailwind CSS", "Supabase",
  "React Native", "Swift", "Kotlin", "Flutter", "Vue.js", "Go", "Rust",
  "MongoDB", "Redis", "Stripe", "OpenAI API", "LangChain",
];

const AI_AGENT_OPTIONS = [
  { id: "cursor", label: "Cursor", icon: "code" },
  { id: "copilot", label: "GitHub Copilot", icon: "smart_toy" },
  { id: "claude", label: "Claude (Anthropic)", icon: "psychology" },
  { id: "gpt4o", label: "GPT-4o (OpenAI)", icon: "psychology" },
  { id: "gemini", label: "Gemini (Google)", icon: "auto_awesome" },
  { id: "aider", label: "Aider", icon: "terminal" },
  { id: "cline", label: "Cline", icon: "terminal" },
  { id: "devin", label: "Devin", icon: "robot_2" },
  { id: "v0", label: "v0 (Vercel)", icon: "web" },
  { id: "bolt", label: "Bolt.new", icon: "bolt" },
  { id: "windsurf", label: "Windsurf", icon: "sailing" },
];

const COMPANY_TYPES = ["Individual / Freelancer", "LLC", "Corporation", "Partnership", "Non-Profit", "Other"];
const BUDGET_RANGES = [
  { value: "SUB_5K", label: "Under $5,000" },
  { value: "5K_25K", label: "$5,000 – $25,000" },
  { value: "25K_75K", label: "$25,000 – $75,000" },
  { value: "75K_PLUS", label: "$75,000+" },
];
const PROJECT_SIZES = [
  { value: "SMALL", label: "Small", sub: "< $5k · < 30 days" },
  { value: "MEDIUM", label: "Medium", sub: "$5k–$25k · 1–3 months" },
  { value: "LARGE", label: "Large", sub: "$25k+ · 3+ months" },
  { value: "ANY", label: "Any size", sub: "No preference" },
];

// ─── Step progress bar ───────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full max-w-sm mx-auto mb-8">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-all duration-500 ${
              i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-outline-variant/20"
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-on-surface-variant text-center mt-2 font-medium">
        Step {current + 1} of {total}
      </p>
    </div>
  );
}

// ─── Tag picker ──────────────────────────────────────
function TagPicker({
  label, tags, setTags, suggestions, placeholder,
}: {
  label: string; tags: string[]; setTags: (t: string[]) => void;
  suggestions: string[]; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const filtered = suggestions.filter(
    (s) => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );

  const add = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setInput("");
  };
  const remove = (tag: string) => setTags(tags.filter((t) => t !== tag));

  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
            {t}
            <button onClick={() => remove(t)} className="hover:text-error transition-colors ml-0.5">
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (input.trim()) add(input); } }}
          placeholder={placeholder ?? "Type and press Enter…"}
          className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors"
        />
        {input && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-surface-container-high border border-outline-variant/30 rounded-xl mt-1 overflow-hidden shadow-xl max-h-40 overflow-y-auto">
            {filtered.slice(0, 6).map((s) => (
              <button key={s} onClick={() => add(s)} className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {!input && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.filter((s) => !tags.includes(s)).slice(0, 8).map((s) => (
            <button key={s} onClick={() => add(s)}
              className="px-2.5 py-1 rounded-full border border-outline-variant/30 text-on-surface-variant text-[10px] font-bold hover:border-primary/40 hover:text-primary transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────
export default function OnboardingWizard({
  role, userName, stripeConnected,
}: {
  role: string; userName: string; stripeConnected: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isFacilitator = role === "FACILITATOR";
  const totalSteps = isFacilitator ? 4 : 3;
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── Shared state ─────────────────────────────────
  const [tos, setTos] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("US");

  // ── Facilitator state ────────────────────────────
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [aiStack, setAiStack] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [availability, setAvailability] = useState("AVAILABLE");
  const [yearsExp, setYearsExp] = useState(1);
  const [projectSize, setProjectSize] = useState("ANY");
  const [hourlyRate, setHourlyRate] = useState(75);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const stripeLinked = stripeConnected;
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");

  // ── Client state ─────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("Individual / Freelancer");
  const [preferredBidType, setPreferredBidType] = useState("BOTH");
  const [budgetRange, setBudgetRange] = useState("5K_25K");
  const [clientOpenaiKey, setClientOpenaiKey] = useState("");
  const [clientAnthropicKey, setClientAnthropicKey] = useState("");
  const [clientGoogleKey, setClientGoogleKey] = useState("");

  // ── Stripe Connect ───────────────────────────────
  const handleStripeConnect = async () => {
    setConnectingStripe(true);
    try {
      const res = await fetch("/api/stripe/onboard", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Failed to connect Stripe. You can do this later in Settings.");
    } finally {
      setConnectingStripe(false);
    }
  };

  // ── Step save ────────────────────────────────────
  const handleNext = () => {
    setError(null);
    startTransition(async () => {
      let result: { success: boolean; error?: string };

      if (step === 0) {
        if (!tos) { setError("Please accept the Terms of Service to continue."); return; }
        result = await saveOnboardingStep({ step: "legal", addressLine1, addressCity, addressState, addressZip, addressCountry, tosAccepted: tos });
      } else if (isFacilitator && step === 1) {
        if (skills.length === 0) { setError("Add at least one skill to continue."); return; }
        result = await saveOnboardingStep({ step: "profile", bio, skills, aiAgentStack: aiStack, portfolioUrl, availability, yearsExperience: yearsExp, preferredProjectSize: projectSize });
      } else if (isFacilitator && step === 2) {
        result = await saveOnboardingStep({ step: "pricing", hourlyRate });
      } else if (!isFacilitator && step === 1) {
        result = await saveOnboardingStep({ step: "preferences", companyName, companyType, preferredBidType, typicalProjectBudget: budgetRange });
      } else {
        // BYOC / final step
        const finalData = isFacilitator
          ? { step: "byoc" as const, openaiKey, anthropicKey, googleKey }
          : { step: "byoc" as const, openaiKey: clientOpenaiKey, anthropicKey: clientAnthropicKey, googleKey: clientGoogleKey };
        result = await completeOnboarding(finalData);
        if (result.success) { router.push("/dashboard"); return; }
      }

      if (result!.success) setStep((s) => s + 1);
      else setError(result!.error ?? "Something went wrong.");
    });
  };

  // ─── Step content ─────────────────────────────────
  const stepContent = () => {
    // ── Step 0: Legal / ToS ──────────────────────
    if (step === 0) return (
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Welcome</p>
          <h2 className="text-2xl font-black font-headline text-on-surface tracking-tight">
            Let's get you set up,<br />{userName.split(" ")[0]}
          </h2>
          <p className="text-sm text-on-surface-variant mt-2">
            {isFacilitator
              ? "Tell us about yourself so clients can find and trust you."
              : "A few quick details to personalise your experience."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Street Address</label>
            <input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="123 Main St"
              className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">City</label>
              <input value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="San Francisco"
                className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">State / Region</label>
              <input value={addressState} onChange={e => setAddressState(e.target.value)} placeholder="CA"
                className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">ZIP / Postal</label>
              <input value={addressZip} onChange={e => setAddressZip(e.target.value)} placeholder="94102"
                className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Country</label>
              <input value={addressCountry} onChange={e => setAddressCountry(e.target.value)} placeholder="US"
                className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <button
            type="button"
            onClick={() => setTos(!tos)}
            className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 mt-0.5 transition-all ${tos ? "bg-primary border-primary" : "border-outline-variant group-hover:border-primary/50"}`}
          >
            {tos && <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>}
          </button>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline cursor-pointer hover:text-on-surface transition-colors">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline cursor-pointer hover:text-on-surface transition-colors">Privacy Policy</a>.
            Payments and identity verification are handled by Stripe.
          </p>
        </label>
      </div>
    );

    // ── Step 1 (Facilitator): Profile ─────────────
    if (isFacilitator && step === 1) return (
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Your Profile</p>
          <h2 className="text-2xl font-black font-headline text-on-surface tracking-tight">Professional snapshot</h2>
          <p className="text-sm text-on-surface-variant mt-1">Clients see this when reviewing your bids.</p>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Professional Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder="I'm a full-stack engineer with 7 years building SaaS products. I specialise in React, Node, and AI integrations…"
            className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors resize-none" />
        </div>

        <TagPicker label="Skills & Technologies" tags={skills} setTags={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="e.g. React, Python…" />

        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">AI Tool Stack</label>
          <p className="text-[10px] text-on-surface-variant mb-3">Which AI tools assist your delivery workflow? Clients value transparency and human accountability.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AI_AGENT_OPTIONS.map((ag) => {
              const selected = aiStack.includes(ag.id);
              return (
                <button key={ag.id} type="button"
                  onClick={() => setAiStack(selected ? aiStack.filter(a => a !== ag.id) : [...aiStack, ag.id])}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selected ? "bg-primary/10 border-primary/40 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30 hover:text-on-surface"
                  }`}>
                  <span className="material-symbols-outlined text-[15px]">{ag.icon}</span>
                  {ag.label}
                  {selected && <span className="material-symbols-outlined text-[13px] ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Years of Experience</label>
            <input type="number" min={0} max={40} value={yearsExp} onChange={e => setYearsExp(Number(e.target.value))}
              className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Availability</label>
            <select value={availability} onChange={e => setAvailability(e.target.value)}
              className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none cursor-pointer">
              <option value="AVAILABLE">Available now</option>
              <option value="BUSY">Busy — limited bandwidth</option>
              <option value="ON_LEAVE">On leave</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Portfolio / GitHub URL</label>
          <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://github.com/yourhandle"
            className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
        </div>
      </div>
    );

    // ── Step 2 (Facilitator): Pricing + Stripe ────
    if (isFacilitator && step === 2) return (
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Pricing & Payments</p>
          <h2 className="text-2xl font-black font-headline text-on-surface tracking-tight">Set your rate</h2>
          <p className="text-sm text-on-surface-variant mt-1">Clients use your rate for reference when reviewing full proposals.</p>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Hourly Rate (USD)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-on-surface-variant">$</span>
            <input type="number" min={1} value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
              className="w-full bg-surface border border-outline-variant/30 rounded-xl pl-8 pr-4 py-3 text-xl font-black text-on-surface focus:border-primary outline-none transition-colors" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant font-bold">/hr</span>
          </div>
          <div className="flex gap-2 mt-2">
            {[50, 75, 100, 150, 200].map(r => (
              <button key={r} type="button" onClick={() => setHourlyRate(r)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-colors ${hourlyRate === r ? "bg-primary text-on-primary border-primary" : "border-outline-variant/30 text-on-surface-variant hover:border-primary/40"}`}>
                ${r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Preferred Project Size</label>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_SIZES.map(ps => (
              <button key={ps.value} type="button" onClick={() => setProjectSize(ps.value)}
                className={`text-left p-3 rounded-xl border transition-all ${projectSize === ps.value ? "bg-primary/10 border-primary/40 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"}`}>
                <p className="font-black text-xs">{ps.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{ps.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${stripeLinked ? "bg-[#059669]/5 border-[#059669]/30" : "bg-surface-container-low border-outline-variant/20"}`}>
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-[22px] ${stripeLinked ? "text-[#059669]" : "text-on-surface-variant"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {stripeLinked ? "check_circle" : "account_balance"}
            </span>
            <div>
              <p className="text-xs font-black text-on-surface">{stripeLinked ? "Stripe Connected" : "Connect Stripe"}</p>
              <p className="text-[10px] text-on-surface-variant">{stripeLinked ? "You'll receive escrow payouts to your account" : "Required to receive project payments"}</p>
            </div>
          </div>
          {!stripeLinked && (
            <button onClick={handleStripeConnect} disabled={connectingStripe}
              className="shrink-0 px-4 py-2 rounded-xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-1.5">
              {connectingStripe ? <span className="material-symbols-outlined animate-spin text-[14px]">refresh</span> : <span className="material-symbols-outlined text-[14px]">link</span>}
              {connectingStripe ? "Redirecting…" : "Connect"}
            </button>
          )}
        </div>
        <p className="text-[10px] text-on-surface-variant text-center">
          You can skip Stripe for now and connect it later in Settings. It's required before you receive your first payment.
        </p>
      </div>
    );

    // ── Step 1 (Client): Preferences ─────────────
    if (!isFacilitator && step === 1) return (
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Your Preferences</p>
          <h2 className="text-2xl font-black font-headline text-on-surface tracking-tight">How do you work?</h2>
          <p className="text-sm text-on-surface-variant mt-1">Helps us surface the right facilitators for your projects.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Company / Entity Name</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc."
              className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Entity Type</label>
            <select value={companyType} onChange={e => setCompanyType(e.target.value)}
              className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none cursor-pointer">
              {COMPANY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Proposal Review Preference</label>
          <p className="mb-3 text-xs font-medium text-on-surface-variant">
            Choose the type of facilitator responses you prefer to receive on future projects.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "QUICK", label: "Streamlined Quotes", sub: "Amount, timeline, approach", icon: "bolt" },
              { value: "FULL", label: "Detailed Delivery Plans", sub: "Milestones, stack, risks", icon: "article" },
              { value: "BOTH", label: "Allow Both", sub: "Compare both formats", icon: "shuffle" },
            ].map(b => (
              <button key={b.value} type="button" onClick={() => setPreferredBidType(b.value)}
                className={`text-center p-3 rounded-xl border transition-all ${preferredBidType === b.value ? "bg-primary/10 border-primary/40 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"}`}>
                <span className="material-symbols-outlined text-[22px] block mb-1">{b.icon}</span>
                <p className="font-black text-xs">{b.label}</p>
                <p className="text-[9px] opacity-70 mt-0.5">{b.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Typical Project Budget</label>
          <div className="grid grid-cols-2 gap-2">
            {BUDGET_RANGES.map(b => (
              <button key={b.value} type="button" onClick={() => setBudgetRange(b.value)}
                className={`text-left px-4 py-3 rounded-xl border transition-all text-sm font-bold ${budgetRange === b.value ? "bg-primary/10 border-primary/40 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"}`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    // ── Final step: BYOC API Keys ─────────────────
    const k_openai = isFacilitator ? openaiKey : clientOpenaiKey;
    const k_anthropic = isFacilitator ? anthropicKey : clientAnthropicKey;
    const k_google = isFacilitator ? googleKey : clientGoogleKey;
    const setK_openai = isFacilitator ? setOpenaiKey : setClientOpenaiKey;
    const setK_anthropic = isFacilitator ? setAnthropicKey : setClientAnthropicKey;
    const setK_google = isFacilitator ? setGoogleKey : setClientGoogleKey;

    return (
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">BYOC — Bring Your Own Credentials</p>
          <h2 className="text-2xl font-black font-headline text-on-surface tracking-tight">AI Access</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Optional. Add your own API keys to use the platform's AI tools. Keys never leave our encrypted servers.
            <span className="text-on-surface-variant/60"> You can add these any time in Settings.</span>
          </p>
        </div>

        {[
          { label: "OpenAI API Key", placeholder: "sk-proj-...", value: k_openai, set: setK_openai, icon: "psychology" },
          { label: "Anthropic API Key", placeholder: "sk-ant-...", value: k_anthropic, set: setK_anthropic, icon: "smart_toy" },
          { label: "Google Gemini API Key", placeholder: "AIza...", value: k_google, set: setK_google, icon: "auto_awesome" },
        ].map(({ label, placeholder, value, set, icon }) => (
          <div key={label}>
            <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]">{icon}</span>
              {label} <span className="text-outline-variant/60 normal-case font-medium">(optional)</span>
            </label>
            <input type="password" value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
              className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary outline-none transition-colors" />
          </div>
        ))}

        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">lock</span>
          <p>Keys are encrypted at rest and never shared with third parties. They are only used when you explicitly trigger AI features.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative z-10 w-full max-w-lg mx-auto px-4 py-12 mt-8">
      <StepBar current={step} total={totalSteps} />

      <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant/20 rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
        {stepContent()}

        {error && (
          <div className="mt-4 flex items-start gap-2 text-error text-xs font-medium bg-error/5 border border-error/20 rounded-xl p-3">
            <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">error</span>
            {error}
          </div>
        )}

        <div className="mt-7 flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => { setError(null); setStep(s => s - 1); }} disabled={isPending}
              className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back
            </button>
          ) : <div />}

          <button onClick={handleNext} disabled={isPending}
            className="px-6 py-3 rounded-xl bg-primary text-on-primary font-black text-xs uppercase tracking-widest hover:-translate-y-0.5 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center gap-2">
            {isPending
              ? <><span className="material-symbols-outlined animate-spin text-[15px]">refresh</span> Saving…</>
              : step === totalSteps - 1
              ? <><span className="material-symbols-outlined text-[15px]">rocket_launch</span> Launch Dashboard</>
              : <>Continue <span className="material-symbols-outlined text-[15px]">arrow_forward</span></>
            }
          </button>
        </div>

        {step === totalSteps - 1 && (
          <button
            onClick={() => {
              startTransition(async () => {
                const finalData = isFacilitator
                  ? { step: "byoc" as const, openaiKey: "", anthropicKey: "", googleKey: "" }
                  : { step: "byoc" as const, openaiKey: "", anthropicKey: "", googleKey: "" };
                const result = await completeOnboarding(finalData);
                if (result.success) {
                  router.push("/dashboard");
                } else {
                  setError(result.error ?? "Failed to complete onboarding.");
                }
              });
            }}
            disabled={isPending}
            className="w-full mt-3 text-center text-[10px] text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
          >
            Skip for now — add API keys later in Settings
          </button>
        )}
      </div>
    </div>
  );
}
