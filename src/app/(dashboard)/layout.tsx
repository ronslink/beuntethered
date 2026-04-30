import { ReactNode } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { SideNav } from "@/components/layout/SideNav";
import { MobileDock } from "@/components/layout/MobileDock";
import { getCurrentUser } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");
  if (user.onboarding_complete === false) redirect("/onboarding");
  const isAdmin = isPlatformAdminEmail(user.email);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopNav userName={user.name} userImage={user.image} isAdmin={isAdmin} />
      <SideNav role={user.role} isAdmin={isAdmin} />
      
      {/* Content wrapper with sidebar offsets */}
      <div className="md:ml-64 pt-20">
        {children}
      </div>
      
      {/* Floating Mobile Dock (Hidden on Web tablet/desktop) */}
      <MobileDock role={user.role} />
    </div>
  );
}
