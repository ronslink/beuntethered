import type { ReactNode } from "react";
import PublicNavbar from "@/components/layout/PublicNavbar";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <PublicNavbar />
      {children}
    </div>
  );
}
