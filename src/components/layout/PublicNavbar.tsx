"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/hire", label: "For Clients" },
  { href: "/build", label: "For Facilitators" },
  { href: "/pricing", label: "Pricing" },
];

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-surface/80 backdrop-blur-2xl border-b border-outline-variant/15 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-primary text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              all_inclusive
            </span>
          </div>
          <span className="font-black font-headline text-sm tracking-tight text-on-surface">
            Untether
          </span>
        </Link>

        {/* ── Desktop Links ── */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors px-4 py-2 rounded-lg"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Auth Buttons ── */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors px-4 py-2 rounded-lg"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-bold bg-primary text-on-primary px-5 py-2.5 rounded-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            Get Started
          </Link>
        </div>

        {/* ── Mobile Toggle ── */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 -mr-2 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-[22px]">
            {mobileOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* ── Mobile Sheet ── */}
      {mobileOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-2xl border-b border-outline-variant/15 animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors px-4 py-3 rounded-xl"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-outline-variant/15 mt-3 pt-3 flex items-center gap-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center text-xs font-bold text-on-surface-variant border border-outline-variant/30 px-4 py-3 rounded-xl hover:border-primary/40 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center text-xs font-bold bg-primary text-on-primary px-4 py-3 rounded-xl shadow-lg shadow-primary/20"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
