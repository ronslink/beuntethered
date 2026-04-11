import { ReactNode } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { SideNav } from "@/components/layout/SideNav";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopNav />
      <SideNav role={user.role} />
      
      {/* Content wrapper with sidebar offsets */}
      <div className="md:ml-64 pt-20">
        {children}
      </div>
      
      {/* Floating Mobile Dock (Hidden on Web tablet/desktop) */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-container-high/90 backdrop-blur-2xl px-6 py-4 rounded-full border border-outline-variant/30 shadow-2xl flex items-center gap-8 z-50">
        <span className="material-symbols-outlined text-on-surface-variant">grid_view</span>
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
        <span className="material-symbols-outlined text-on-surface-variant">account_balance_wallet</span>
        <span className="material-symbols-outlined text-on-surface-variant">psychology</span>
      </div>
    </div>
  );
}
