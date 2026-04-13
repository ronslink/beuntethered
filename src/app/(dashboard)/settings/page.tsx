import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/auth";
import BYOKSettingsClient from "@/components/settings/BYOKSettingsClient";
import AgentKeyClient from "@/components/settings/AgentKeyClient";
import StripeDashboardButton from "@/components/settings/StripeDashboardButton";

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) redirect("/api/auth/signin");

  const maskKey = (key?: string | null) => key ? `sk-...${key.slice(-4)}` : '';

  return (
    <main className="p-6 md:p-10 lg:p-14 min-h-[calc(100vh-80px)] flex flex-col relative">
      <div className="absolute top-[0%] right-[10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="mb-10 lg:mb-16 max-w-4xl relative z-10">
        <h1 className="text-3xl md:text-5xl font-black font-headline tracking-tighter text-on-surface">
          Platform <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Preferences</span>
        </h1>
        <p className="text-on-surface-variant font-medium mt-3 text-lg">Manage your account protocols, API keys, and notification payloads.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Setting Panels */}
        <section className="lg:col-span-12 xl:col-span-10 space-y-8">
           
           {/* Profile Section */}
           <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-xl font-bold text-on-surface font-headline mb-6 border-b border-outline-variant/20 pb-4">Personal Profile</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Account Email</label>
                    <input type="text" disabled value={user.email || ''} className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface font-medium cursor-not-allowed opacity-70" />
                 </div>
                 <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Professional Title</label>
                    <input type="text" placeholder="e.g. Senior Software Engineer" className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface font-medium focus:border-primary/50 outline-none transition-colors" />
                 </div>
              </div>
           </div>

            {/* BYOK Settings Inject */}
            <BYOKSettingsClient 
               initialPreferred={user.preferred_llm}
               hasOpenAI={maskKey(user.openai_key)}
               hasAnthropic={maskKey(user.anthropic_key)}
            />

           {/* Autonomous Agent Control */}
           <AgentKeyClient hasKeyBound={!!user.agent_key_hash} />

           {/* Financial Integration */}
           <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-xl font-bold text-on-surface font-headline mb-6 border-b border-outline-variant/20 pb-4">Financial Integration</h3>
              <p className="text-on-surface-variant text-sm mb-6 max-w-2xl">Manage your connected bank account, view payout history, and track payment status in your Stripe dashboard.</p>
              
              <StripeDashboardButton hasStripeAccount={!!user.stripe_account_id} />
           </div>

           {/* Notifications */}
           <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-xl font-bold text-on-surface font-headline mb-6 border-b border-outline-variant/20 pb-4">Email Notifications</h3>
              
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-on-surface">Payment Updates</p>
                        <p className="text-xs text-on-surface-variant mt-1">Receive secure payloads when funds are verified and locked.</p>
                    </div>
                    <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer border border-primary/20">
                        <div className="w-5 h-5 bg-on-primary rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                    </div>
                 </div>

                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-on-surface">New Marketplace Bids</p>
                        <p className="text-xs text-on-surface-variant mt-1">Instantly alert me when an Expert pitches against my open scope.</p>
                    </div>
                    <div className="w-12 h-6 bg-surface-container-high rounded-full relative cursor-pointer border border-outline-variant/30">
                        <div className="w-5 h-5 bg-on-surface-variant rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                    </div>
                 </div>
              </div>
           </div>

        </section>
      </div>
    </main>
  );
}
