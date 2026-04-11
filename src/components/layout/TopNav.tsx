"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-8 h-20 border-b border-outline-variant/30 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-8">
        <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-headline">Untether</span>
        <div className="hidden md:flex gap-6 items-center">
          <Link className="font-semibold tracking-tight text-on-surface-variant hover:text-primary transition-colors" href="/dashboard">Dashboard</Link>
          <Link className="font-semibold tracking-tight text-primary border-b-2 border-primary pb-1" href="/command-center">Projects</Link>
          <Link className="font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors" href="/wallet">Earnings</Link>
          <Link className="font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors" href="/insights">Insights</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-all duration-300 rounded-full active:scale-90 flex items-center justify-center">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-on-surface-variant hover:bg-surface-container transition-all duration-300 rounded-full active:scale-90 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">
            {mounted && theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        <img alt="Expert Profile Avatar" className="w-10 h-10 rounded-full border border-outline/30 object-cover shadow-sm bg-surface-container" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi_EiNpvum_N0H0ksYk8-3L1gh2Jojon9_bRHXE9CRUHEdT4Fjf9cs_6ToLtUg6rQbq7yfMH2fYlSM5ccOPNyJaWDW2lu-PKrISaxmC_-kO-we6tsTt-_Ru2BJrINkjQ5w9VqEGx5HBWsGTa26whRLLu2z46MZESGHPwvVCx0BP-dH0tKYMz-Bx_JdGUvuqqTPlFT6vKb72VdFwxyxptZo-M_2ePq8oXD7swxFsL6bTUMnV8-3t8L9zQKPEJahP0v6SMwuamVapojP"/>
      </div>
    </nav>
  );
}
