"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({ role }: { role?: string }) {
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    return `flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${pathname === path || (pathname === '/' && path === '/dashboard') ? 'text-primary font-bold bg-primary/10' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container/50'}`;
  };

  return (
    <aside className="hidden md:flex flex-col py-8 px-6 space-y-8 h-screen w-64 fixed left-0 top-0 bg-surface/50 backdrop-blur-3xl z-40 border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
      <div className="pt-20">
        <div className="flex items-center gap-5 mb-10 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden relative">
            <span className="material-symbols-outlined text-primary text-sm absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-on-surface font-headline leading-tight">Untether</h3>
            <p className="uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">Elite Expert HUD</p>
          </div>
        </div>
        
        <nav className="space-y-1">
          <Link href="/dashboard" className={getLinkClass("/dashboard")}>
            <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: pathname === '/dashboard' || pathname === '/' ? "'FILL' 1" : "'FILL' 0" }}>grid_view</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Overview</span>
          </Link>
          <Link href="/command-center" className={getLinkClass("/command-center")}>
            <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: pathname === '/command-center' ? "'FILL' 1" : "'FILL' 0" }}>rocket_launch</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Live Projects</span>
          </Link>
          <Link href="/wallet" className={getLinkClass("/wallet")}>
            <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: pathname === '/wallet' ? "'FILL' 1" : "'FILL' 0" }}>account_balance_wallet</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Wallet</span>
          </Link>
          <Link href="/insights" className={getLinkClass("/insights")}>
            <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: pathname === '/insights' ? "'FILL' 1" : "'FILL' 0" }}>insights</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Insights</span>
          </Link>
          <Link href="/advisor" className={getLinkClass("/advisor")}>
            <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: pathname === '/advisor' ? "'FILL' 1" : "'FILL' 0" }}>psychology</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">AI Advisor</span>
          </Link>
          
          {role === 'FACILITATOR' && (
            <Link href="/marketplace" className={getLinkClass("/marketplace")}>
              <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: pathname === '/marketplace' ? "'FILL' 1" : "'FILL' 0" }}>storefront</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">Marketplace</span>
            </Link>
          )}
          <Link href="/settings" className={getLinkClass("/settings")}>
            <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: pathname === '/settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Settings</span>
          </Link>
        </nav>
        
        <div className="mt-10">
          {role === 'CLIENT' ? (
            <Link href="/projects/new" className="block w-full text-center py-3 px-4 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 opacity-90 hover:opacity-100 hover:-translate-y-0.5 active:scale-95 transition-all">
              Post Project
            </Link>
          ) : (
            <Link href="/advisor" className="block w-full text-center py-3 px-4 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 opacity-90 hover:opacity-100 hover:-translate-y-0.5 active:scale-95 transition-all">
              New Project
            </Link>
          )}
        </div>
      </div>
      
      <div className="mt-auto space-y-1">
        <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
          <span className="material-symbols-outlined shrink-0">help</span>
          <span className="uppercase tracking-widest text-[10px] font-bold">Support</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-secondary transition-colors cursor-pointer">
          <span className="material-symbols-outlined shrink-0">logout</span>
          <span className="uppercase tracking-widest text-[10px] font-bold">Sign Out</span>
        </a>
      </div>
    </aside>
  );
}
