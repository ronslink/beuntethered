import type { ReactNode } from "react";
import Link from "next/link";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Minimal nav */}
      <nav className="sticky top-0 z-50 bg-surface/60 backdrop-blur-2xl border-b border-outline-variant/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
            </div>
            <span className="font-black font-headline text-xs tracking-tight text-on-surface">Untether</span>
          </Link>
          <Link href="/" className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Back to Home
          </Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {children}
      </main>
    </div>
  );
}
