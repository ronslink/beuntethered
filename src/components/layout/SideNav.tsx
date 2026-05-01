"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export function SideNav({ role, isAdmin = false }: { role?: string; isAdmin?: boolean }) {
  const pathname = usePathname();

  const isClient = role === "CLIENT";
  const isFacilitator = role === "FACILITATOR";

  const link = (path: string) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
      pathname.startsWith(path) && path !== "/dashboard"
        ? "text-primary font-bold bg-primary/10"
        : pathname === path || (path === "/dashboard" && (pathname === "/" || pathname === "/dashboard"))
        ? "text-primary font-bold bg-primary/10"
        : "text-on-surface-variant hover:text-primary hover:bg-surface-container/50"
    }`;

  const fill = (path: string) =>
    pathname === path || pathname.startsWith(path)
      ? "'FILL' 1"
      : "'FILL' 0";

  return (
    <aside className="hidden md:flex flex-col py-6 px-4 h-screen w-64 fixed left-0 top-0 bg-surface z-40 border-r border-outline-variant/30 shadow-sm">
      <div className="pt-16 flex flex-col h-full">

        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
          </div>
          <div>
            <h3 className="text-base font-black text-on-surface font-headline leading-tight">Untether</h3>
            <p className="uppercase tracking-widest text-[9px] text-on-surface-variant font-bold">
              {isClient ? "Client Portal" : "Facilitator Hub"}
            </p>
          </div>
        </div>

        {/* Primary Nav */}
        <nav className="space-y-0.5 flex-1">
          <Link href="/dashboard" className={link("/dashboard")}>
            <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/dashboard") }}>grid_view</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Overview</span>
          </Link>

          {/* CLIENT sees their projects list; FACILITATOR sees command center */}
          {isClient ? (
            <Link href="/projects" className={link("/projects")}>
              <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/projects") }}>folder_open</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">My Projects</span>
            </Link>
          ) : (
            <Link href="/command-center" className={link("/command-center")}>
              <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/command-center") }}>rocket_launch</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">Active Work</span>
            </Link>
          )}

          {/* Browse Talent — CLIENT only */}
          {isClient && (
            <Link href="/talent" className={link("/talent")}>
              <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/talent") }}>person_search</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">Browse Talent</span>
            </Link>
          )}

          {/* Marketplace — FACILITATOR only */}
          {isFacilitator && (
            <Link href="/marketplace" className={link("/marketplace")}>
              <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/marketplace") }}>storefront</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">Marketplace</span>
            </Link>
          )}

          {/* AI Advisor — FACILITATOR only */}
          {isFacilitator && (
            <Link href="/advisor" className={link("/advisor")}>
              <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/advisor") }}>psychology</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">Proposal Advisor</span>
            </Link>
          )}

          {/* Bring Your Own Client — FACILITATOR only */}
          {isFacilitator && (
            <Link href="/byoc/new" className={link("/byoc")}>
              <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/byoc") }}>person_add</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">Invite Client</span>
            </Link>
          )}

          <Link href="/wallet" className={link("/wallet")}>
            <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/wallet") }}>account_balance_wallet</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">
              {isClient ? "Payments" : "Wallet"}
            </span>
          </Link>

          <Link href="/insights" className={link("/insights")}>
            <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/insights") }}>insights</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Insights</span>
          </Link>

          <Link href="/settings" className={link("/settings")}>
            <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/settings") }}>account_circle</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Account</span>
          </Link>

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-outline-variant/10 space-y-0.5">
              <p className="px-4 pb-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                Platform Admin
              </p>
              <Link href="/admin/verifications" className={link("/admin/verifications")}>
                <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/admin/verifications") }}>verified_user</span>
                <span className="uppercase tracking-widest text-[10px] font-bold">Verifications</span>
              </Link>
              <Link href="/admin/disputes" className={link("/admin/disputes")}>
                <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/admin/disputes") }}>gavel</span>
                <span className="uppercase tracking-widest text-[10px] font-bold">Disputes</span>
              </Link>
              <Link href="/admin/risk" className={link("/admin/risk")}>
                <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/admin/risk") }}>policy</span>
                <span className="uppercase tracking-widest text-[10px] font-bold">Risk Review</span>
              </Link>
              <Link href="/admin/readiness" className={link("/admin/readiness")}>
                <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: fill("/admin/readiness") }}>health_and_safety</span>
                <span className="uppercase tracking-widest text-[10px] font-bold">Readiness</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Role CTA */}
        <div className="mt-6 mb-4">
          {isClient ? (
            <Link
              href="/projects/new"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-on-primary font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              Post Project
            </Link>
          ) : (
            <Link
              href="/marketplace"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-on-primary font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">storefront</span>
              Find Opportunities
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="space-y-0.5 border-t border-outline-variant/10 pt-4">
          <a className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container/50 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px] shrink-0">help</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Support</span>
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/5 transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
            <span className="uppercase tracking-widest text-[10px] font-bold">Sign Out</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
