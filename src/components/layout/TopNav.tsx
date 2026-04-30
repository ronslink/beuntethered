"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

interface TopNavProps {
  userName?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
}

export function TopNav({ userName, userImage, isAdmin = false }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/95 backdrop-blur-xl flex justify-between items-center px-8 h-16 border-b border-outline-variant/30 shadow-sm">
      <div className="flex items-center gap-8">
        <span className="text-xl font-black tracking-tight text-on-surface font-headline">Untether</span>
        <div className="hidden md:flex gap-6 items-center">
          <Link className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors" href="/dashboard">Dashboard</Link>
          <Link className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors" href="/command-center">Projects</Link>
          <Link className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors" href="/wallet">Payments</Link>
          <Link className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors" href="/insights">Insights</Link>
          {isAdmin ? (
            <Link className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors" href="/admin/verifications">Admin</Link>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-on-surface-variant hover:bg-surface-container transition-all duration-300 rounded-full active:scale-90 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">
            {mounted && theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        <Link
          href="/settings"
          className="group relative flex items-center gap-2.5 rounded-full hover:bg-surface-container/50 transition-all pr-1"
          title="Settings"
        >
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={userName || "Profile"}
              className="w-10 h-10 rounded-full border-2 border-outline-variant/20 object-cover shadow-sm bg-surface-container group-hover:border-primary/40 transition-colors"
              src={userImage}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={userName || "Profile"}
              className="w-10 h-10 rounded-full border-2 border-outline-variant/20 object-cover shadow-sm bg-surface-container group-hover:border-primary/40 transition-colors"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi_EiNpvum_N0H0ksYk8-3L1gh2Jojon9_bRHXE9CRUHEdT4Fjf9cs_6ToLtUg6rQbq7yfMH2fYlSM5ccOPNyJaWDW2lu-PKrISaxmC_-kO-we6tsTt-_Ru2BJrINkjQ5w9VqEGx5HBWsGTa26whRLLu2z46MZESGHPwvVCx0BP-dH0tKYMz-Bx_JdGUvuqqTPlFT6vKb72VdFwxyxptZo-M_2ePq8oXD7swxFsL6bTUMnV8-3t8L9zQKPEJahP0v6SMwuamVapojP"
            />
          )}
        </Link>
      </div>
    </nav>
  );
}
