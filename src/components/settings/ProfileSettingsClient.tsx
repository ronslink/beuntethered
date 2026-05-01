"use client";

import { useState, useTransition } from "react";
import { saveOnboardingStep } from "@/app/actions/onboarding";
import { useRouter } from "next/navigation";

const SKILL_SUGGESTIONS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "PostgreSQL",
  "AWS", "Docker", "Prisma", "GraphQL", "Tailwind CSS", "Supabase",
  "React Native", "Swift", "Kotlin", "Flutter", "Vue.js", "Go", "Rust",
  "MongoDB", "Redis", "Stripe", "OpenAI API", "LangChain",
];

const AI_AGENT_OPTIONS = [
  { id: "cursor", label: "Cursor", icon: "code" },
  { id: "copilot", label: "GitHub Copilot", icon: "smart_toy" },
  { id: "claude", label: "Claude", icon: "psychology" },
  { id: "gpt4o", label: "GPT-4o", icon: "psychology" },
  { id: "gemini", label: "Gemini", icon: "auto_awesome" },
  { id: "aider", label: "Aider", icon: "terminal" },
  { id: "cline", label: "Cline", icon: "terminal" },
  { id: "devin", label: "Devin", icon: "robot_2" },
  { id: "v0", label: "v0 (Vercel)", icon: "web" },
  { id: "bolt", label: "Bolt.new", icon: "bolt" },
  { id: "windsurf", label: "Windsurf", icon: "sailing" },
];

function TagPicker({ label, tags, setTags, suggestions }: {
  label: string; tags: string[]; setTags: (t: string[]) => void; suggestions: string[];
}) {
  const [input, setInput] = useState("");
  const filtered = suggestions.filter(s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase()));
  const add = (tag: string) => { const t = tag.trim(); if (t && !tags.includes(t)) setTags([...tags, t]); setInput(""); };
  const remove = (tag: string) => setTags(tags.filter(t => t !== tag));

  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
            {t}
            <button onClick={() => remove(t)} className="hover:text-error transition-colors ml-0.5">
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (input.trim()) add(input); } }}
          placeholder="Type and press Enter..."
          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
        {input && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-surface-container-high border border-outline-variant/30 rounded-lg mt-1 max-h-40 overflow-y-auto">
            {filtered.slice(0, 6).map(s => (
              <button key={s} onClick={() => add(s)} className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors">{s}</button>
            ))}
          </div>
        )}
      </div>
      {!input && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.filter(s => !tags.includes(s)).slice(0, 8).map(s => (
            <button key={s} onClick={() => add(s)}
              className="px-2.5 py-1 rounded-md border border-outline-variant/30 text-on-surface-variant text-[10px] font-bold hover:border-primary/40 hover:text-primary transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Facilitator profile section ──────────────────────────────────────────────
export function FacilitatorProfileSettings({ initial }: {
  initial: {
    bio: string | null; skills: string[]; aiAgentStack: string[];
    portfolioUrl: string | null; availability: string | null;
    yearsExperience: number | null; preferredProjectSize: string | null;
    hourlyRate: number;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [bio, setBio] = useState(initial.bio ?? "");
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [aiStack, setAiStack] = useState<string[]>(initial.aiAgentStack);
  const [portfolioUrl, setPortfolioUrl] = useState(initial.portfolioUrl ?? "");
  const [availability, setAvailability] = useState(initial.availability ?? "AVAILABLE");
  const [yearsExp, setYearsExp] = useState(initial.yearsExperience ?? 1);
  const [hourlyRate, setHourlyRate] = useState(initial.hourlyRate);
  const [projectSize, setProjectSize] = useState(initial.preferredProjectSize ?? "ANY");

  const handleSave = () => {
    setSaved(false);
    setStatusMessage("");
    startTransition(async () => {
      const profileResult = await saveOnboardingStep({ step: "profile", bio, skills, aiAgentStack: aiStack, portfolioUrl, availability, yearsExperience: yearsExp, preferredProjectSize: projectSize });
      if (!profileResult.success) {
        setStatusMessage(profileResult.error || "Profile could not be saved.");
        return;
      }
      const pricingResult = await saveOnboardingStep({ step: "pricing", hourlyRate });
      if (!pricingResult.success) {
        setStatusMessage(pricingResult.error || "Pricing could not be saved.");
        return;
      }
      setSaved(true);
      setStatusMessage(
        profileResult.portfolioVerificationStatus === "PENDING" && portfolioUrl
          ? "Saved. Portfolio evidence queued for manual review."
          : "Saved."
      );
      router.refresh();
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Bio */}
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Professional Bio</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
          placeholder="A short professional summary visible to clients on your bid cards…"
          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors resize-none" />
      </div>

      {/* Skills */}
      <TagPicker label="Skills & Technologies" tags={skills} setTags={setSkills} suggestions={SKILL_SUGGESTIONS} />

      {/* AI tool workflow */}
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">AI Tool Stack</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AI_AGENT_OPTIONS.map(ag => {
            const selected = aiStack.includes(ag.id);
            return (
              <button key={ag.id} type="button"
                onClick={() => setAiStack(selected ? aiStack.filter(a => a !== ag.id) : [...aiStack, ag.id])}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${selected ? "bg-primary/10 border-primary/40 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30 hover:text-on-surface"}`}>
                <span className="material-symbols-outlined text-[15px]">{ag.icon}</span>
                {ag.label}
                {selected && <span className="material-symbols-outlined text-[13px] ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row: rate + exp + availability */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Hourly Rate (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">$</span>
            <input type="number" min={1} value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg pl-7 pr-3 py-2.5 text-sm font-black text-on-surface focus:border-primary outline-none transition-colors" />
          </div>
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Years Exp.</label>
          <input type="number" min={0} max={40} value={yearsExp} onChange={e => setYearsExp(Number(e.target.value))}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface focus:border-primary outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Availability</label>
          <select value={availability} onChange={e => setAvailability(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none cursor-pointer">
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>
        </div>
      </div>

      {/* Portfolio URL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Portfolio / GitHub URL</label>
          <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://github.com/yourhandle"
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Preferred Project Size</label>
          <select value={projectSize} onChange={e => setProjectSize(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none cursor-pointer">
            <option value="ANY">Flexible</option>
            <option value="SUB_10K">Under $10K</option>
            <option value="10K_50K">$10K-$50K</option>
            <option value="50K_PLUS">$50K+</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2">
          {isPending ? <><span className="material-symbols-outlined animate-spin text-[15px]">refresh</span> Saving...</> : "Save Profile"}
        </button>
        {statusMessage && (
          <p className={`text-xs font-bold flex items-center gap-1 ${saved ? "text-[#059669]" : "text-error"}`}>
            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {saved ? "check_circle" : "error"}
            </span>
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Client preferences section ───────────────────────────────────────────────
export function ClientPreferencesSettings({ initial }: {
  initial: {
    companyName: string | null; companyType: string | null;
    preferredBidType: string | null; typicalProjectBudget: string | null;
    addressLine1: string | null; addressCity: string | null;
    addressState: string | null; addressZip: string | null; addressCountry: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [companyType, setCompanyType] = useState(initial.companyType ?? "Individual / Freelancer");
  const [preferredBidType, setPreferredBidType] = useState(initial.preferredBidType ?? "BOTH");
  const [budgetRange, setBudgetRange] = useState(initial.typicalProjectBudget ?? "5K_25K");
  const [addressLine1, setAddressLine1] = useState(initial.addressLine1 ?? "");
  const [addressCity, setAddressCity] = useState(initial.addressCity ?? "");
  const [addressState, setAddressState] = useState(initial.addressState ?? "");
  const [addressZip, setAddressZip] = useState(initial.addressZip ?? "");
  const [addressCountry, setAddressCountry] = useState(initial.addressCountry ?? "US");

  const handleSave = () => {
    setSaved(false);
    startTransition(async () => {
      await saveOnboardingStep({ step: "preferences", companyName, companyType, preferredBidType, typicalProjectBudget: budgetRange });
      await saveOnboardingStep({ step: "legal", addressLine1, addressCity, addressState, addressZip, addressCountry, tosAccepted: false });
      setSaved(true);
      router.refresh();
    });
  };

  const BUDGET_RANGES = [
    { value: "SUB_5K", label: "Under $5,000" },
    { value: "5K_25K", label: "$5k-$25k" },
    { value: "25K_75K", label: "$25k-$75k" },
    { value: "75K_PLUS", label: "$75,000+" },
  ];
  const PROPOSAL_REVIEW_OPTIONS = [
    { value: "QUICK", label: "Streamlined Quotes", detail: "Amount, timeline, and approach", icon: "bolt" },
    { value: "FULL", label: "Detailed Delivery Plans", detail: "Milestones, stack, and risks", icon: "article" },
    { value: "BOTH", label: "Allow Both", detail: "Compare lightweight and detailed responses", icon: "shuffle" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Company / Entity Name</label>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc."
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">Entity Type</label>
          <select value={companyType} onChange={e => setCompanyType(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none cursor-pointer">
            {["Individual / Freelancer", "LLC", "Corporation", "Partnership", "Non-Profit", "Other"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Proposal Review Preference</label>
        <p className="mb-3 text-xs font-medium text-on-surface-variant">
          Choose the type of facilitator responses you prefer to receive on future projects.
        </p>
        <div className="flex gap-2">
          {PROPOSAL_REVIEW_OPTIONS.map(b => (
            <button key={b.value} type="button" onClick={() => setPreferredBidType(b.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-center text-xs font-bold transition-all ${preferredBidType === b.value ? "bg-primary/10 border-primary/40 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"}`}>
              <span className="material-symbols-outlined text-[20px]">{b.icon}</span>
              <span>{b.label}</span>
              <span className="text-[10px] font-medium leading-snug opacity-75">{b.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Typical Project Budget</label>
        <div className="grid grid-cols-2 gap-2">
          {BUDGET_RANGES.map(b => (
            <button key={b.value} type="button" onClick={() => setBudgetRange(b.value)}
              className={`text-left px-4 py-2.5 rounded-lg border transition-all text-sm font-bold ${budgetRange === b.value ? "bg-primary/10 border-primary/40 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Billing Address</p>
        <div className="space-y-3">
          <input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="Street address"
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="City"
              className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
            <input value={addressState} onChange={e => setAddressState(e.target.value)} placeholder="State"
              className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
            <input value={addressZip} onChange={e => setAddressZip(e.target.value)} placeholder="ZIP"
              className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors" />
            <select value={addressCountry} onChange={e => setAddressCountry(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none cursor-pointer">
              <option value="US">US</option>
              <option value="CA">CA</option>
              <option value="GB">GB</option>
              <option value="EU">EU</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2">
          {isPending ? <><span className="material-symbols-outlined animate-spin text-[15px]">refresh</span> Saving...</> : "Save Preferences"}
        </button>
        {saved && <p className="text-xs text-[#059669] font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Saved</p>}
      </div>
    </div>
  );
}
