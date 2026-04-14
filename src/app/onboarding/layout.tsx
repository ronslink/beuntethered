import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] bg-primary/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/6 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[600px] h-[300px] bg-tertiary/4 blur-[100px] rounded-full pointer-events-none" />

      {/* Wordmark */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-primary">Untether</p>
      </div>

      {children}
    </div>
  );
}
