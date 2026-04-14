import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/auth";
import BYOKSettingsClient from "@/components/settings/BYOKSettingsClient";
import AgentKeyClient from "@/components/settings/AgentKeyClient";
import StripeDashboardButton from "@/components/settings/StripeDashboardButton";
import { FacilitatorProfileSettings, ClientPreferencesSettings } from "@/components/settings/ProfileSettingsClient";

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true, email: true, name: true, role: true,
      preferred_llm: true, openai_key: true, anthropic_key: true,
      agent_key_hash: true, stripe_account_id: true,
      // Profile fields
      bio: true, skills: true, ai_agent_stack: true, portfolio_url: true,
      availability: true, years_experience: true, preferred_project_size: true,
      hourly_rate: true,
      // Client fields
      company_name: true, company_type: true,
      preferred_bid_type: true, typical_project_budget: true,
      address_line1: true, address_city: true, address_state: true,
      address_zip: true, address_country: true,
      // Legal
      tos_accepted_at: true,
    },
  });
  if (!user) redirect("/api/auth/signin");

  const maskKey = (key?: string | null) => (key ? `sk-···${key.slice(-4)}` : "");

  const sections = [
    { icon: "person", label: "Profile" },
    { icon: "key", label: "AI Keys" },
    { icon: "smart_toy", label: "Agents" },
    { icon: "payments", label: "Payments" },
    { icon: "notifications", label: "Notifications" },
  ];

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20">
      <div className="absolute top-0 right-[10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 mb-8 px-4 lg:px-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Account</p>
        <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
          Settings
        </h1>
        <p className="text-on-surface-variant font-medium mt-2 text-sm">
          Manage your profile, API keys, and integrations.
        </p>
      </header>

      <div className="relative z-10 px-4 lg:px-0 max-w-3xl space-y-5">

        {/* ── Profile ── */}
        <section className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Profile</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Email address
              </label>
              <input
                type="text" disabled value={user.email || ""}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface font-medium cursor-not-allowed opacity-60"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Display name
              </label>
              <input
                type="text" defaultValue={user.name || ""} placeholder="Your name"
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* ── Facilitator: Profile & Tooling ── */}
        {user.role === "FACILITATOR" && (
          <section className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">badge</span>
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Professional Profile</h2>
              <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">Visible to Clients</span>
            </div>
            <FacilitatorProfileSettings initial={{
              bio: user.bio,
              skills: user.skills,
              aiAgentStack: user.ai_agent_stack,
              portfolioUrl: user.portfolio_url,
              availability: user.availability,
              yearsExperience: user.years_experience,
              preferredProjectSize: user.preferred_project_size,
              hourlyRate: Number(user.hourly_rate),
            }} />
          </section>
        )}

        {/* ── Client: Preferences ── */}
        {user.role === "CLIENT" && (
          <section className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">tune</span>
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Project Preferences</h2>
            </div>
            <ClientPreferencesSettings initial={{
              companyName: user.company_name,
              companyType: user.company_type,
              preferredBidType: user.preferred_bid_type,
              typicalProjectBudget: user.typical_project_budget,
              addressLine1: user.address_line1,
              addressCity: user.address_city,
              addressState: user.address_state,
              addressZip: user.address_zip,
              addressCountry: user.address_country,
            }} />
          </section>
        )}

        {/* ── BYOK AI Keys ── */}
        <section className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">key</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">AI Model Keys</h2>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant/20">BYOK</span>
          </div>
          <div className="p-6">
            <BYOKSettingsClient
              initialPreferred={user.preferred_llm}
              hasOpenAI={maskKey(user.openai_key)}
              hasAnthropic={maskKey(user.anthropic_key)}
            />
          </div>
        </section>

        {/* ── Agent Key ── */}
        <section className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">smart_toy</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Autonomous Agent Access</h2>
          </div>
          <div className="p-6">
            <AgentKeyClient hasKeyBound={!!user.agent_key_hash} />
          </div>
        </section>

        {/* ── Financial Integration ── */}
        <section className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">payments</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Payments & Payouts</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-on-surface-variant font-medium mb-4 leading-relaxed">
              Connect your bank account to receive Escrow payouts directly via Stripe Express.
            </p>
            <StripeDashboardButton hasStripeAccount={!!user.stripe_account_id} />
          </div>
        </section>

        {/* ── Notifications ── */}
        <section className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">notifications</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Email Notifications</h2>
          </div>
          <div className="p-6 space-y-5">
            {[
              { label: "Payment Updates", desc: "When a milestone is funded or paid out.", active: true },
              { label: "New Proposals", desc: "When a developer bids on your project.", active: false },
              { label: "Milestone Reviews", desc: "When a deliverable is submitted for review.", active: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">{item.label}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{item.desc}</p>
                </div>
                <div className={`w-11 h-6 rounded-full relative cursor-pointer border transition-colors ${item.active ? "bg-primary border-primary/30" : "bg-surface-container-high border-outline-variant/30"}`}>
                  <div className={`w-4 h-4 rounded-full absolute top-0.5 shadow-sm transition-all ${item.active ? "bg-on-primary right-1" : "bg-on-surface-variant left-1"}`} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-on-surface-variant/60 font-medium pt-2 border-t border-outline-variant/10">
              Notification preferences are saved automatically.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
