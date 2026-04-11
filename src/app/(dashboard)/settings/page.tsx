import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  return (
    <main className="p-6 md:p-10 lg:p-14 min-h-[calc(100vh-80px)] flex flex-col relative">
      <div className="absolute top-[0%] right-[10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="mb-10 lg:mb-16 max-w-4xl relative z-10">
        <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tighter text-on-surface">
          Platform <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Preferences</span>
        </h2>
        <p className="text-on-surface-variant font-medium mt-3 text-lg">Manage your account protocols, API keys, and notification payloads.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Nav (Static for MVP) */}
        <nav className="lg:col-span-3 space-y-2">
          <button className="w-full text-left px-5 py-4 rounded-xl bg-surface-container-low border border-primary/20 text-primary font-bold shadow-inner">
             Profile Configuration
          </button>
          <button className="w-full text-left px-5 py-4 rounded-xl text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">
             Billing & Payouts
          </button>
          <button className="w-full text-left px-5 py-4 rounded-xl text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">
             Security Logs
          </button>
        </nav>

        {/* Setting Panels */}
        <section className="lg:col-span-9 space-y-8">
           
           <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-xl font-bold text-on-surface font-headline mb-6 border-b border-outline-variant/20 pb-4">Identity Verification</h3>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Account Email</label>
                    <input type="text" disabled value={user.email || ''} className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface font-medium cursor-not-allowed opacity-70" />
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Assigned Role</label>
                    <div className="flex items-center gap-3">
                       <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase ${session.user.role === 'DEVELOPER' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
                          {session.user.role || 'GUEST'}
                       </span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] opacity-50 relative overflow-hidden">
              <div className="absolute inset-0 bg-surface/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                 <span className="bg-surface-container-low border border-outline-variant/30 px-6 py-2 rounded-full text-sm font-bold tracking-widest text-on-surface-variant uppercase shadow-lg">Component Locked</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface font-headline mb-6 border-b border-outline-variant/20 pb-4">Stripe Webhooks</h3>
              <div className="h-24 border-2 border-dashed border-outline-variant/30 rounded-xl flex items-center justify-center">
                 <span className="text-on-surface-variant/50 material-symbols-outlined text-4xl">api</span>
              </div>
           </div>

        </section>
      </div>

    </main>
  );
}
