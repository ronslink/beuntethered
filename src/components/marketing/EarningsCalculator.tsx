"use client";

import { useState, useMemo } from "react";

export default function EarningsCalculator() {
  const [hourlyRate, setHourlyRate] = useState(100);
  const [hoursPerWeek, setHoursPerWeek] = useState(30);

  const calc = useMemo(() => {
    const weeklyGross = hourlyRate * hoursPerWeek;
    const yearlyGross = weeklyGross * 48; // 48 billable weeks

    // Upwork: 10% service fee (was 20%, currently tiered — we use the most common rate)
    const upworkFeeRate = 0.10;
    const upworkYearly = yearlyGross * (1 - upworkFeeRate);

    // Fiverr: 20% service fee
    const fiverrFeeRate = 0.20;
    const fiverrYearly = yearlyGross * (1 - fiverrFeeRate);

    // Untether: 0% facilitator fee
    const untetherYearly = yearlyGross;

    return {
      weeklyGross,
      yearlyGross,
      upwork: { yearly: upworkYearly, lost: yearlyGross - upworkYearly, rate: upworkFeeRate },
      fiverr: { yearly: fiverrYearly, lost: yearlyGross - fiverrYearly, rate: fiverrFeeRate },
      untether: { yearly: untetherYearly, lost: 0, rate: 0 },
      savedVsUpwork: untetherYearly - upworkYearly,
      savedVsFiverr: untetherYearly - fiverrYearly,
    };
  }, [hourlyRate, hoursPerWeek]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-8">
      {/* ── Sliders ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-3">
            Your Hourly Rate
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={25}
              max={300}
              step={5}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="flex-1 accent-primary h-1.5 cursor-pointer"
            />
            <div className="bg-surface border border-outline-variant/30 rounded-xl px-4 py-2 min-w-[90px] text-center">
              <span className="text-lg font-black text-on-surface font-mono">${hourlyRate}</span>
              <span className="text-[10px] text-on-surface-variant font-bold">/hr</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-3">
            Hours Per Week
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="flex-1 accent-primary h-1.5 cursor-pointer"
            />
            <div className="bg-surface border border-outline-variant/30 rounded-xl px-4 py-2 min-w-[90px] text-center">
              <span className="text-lg font-black text-on-surface font-mono">{hoursPerWeek}</span>
              <span className="text-[10px] text-on-surface-variant font-bold">hrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Comparison Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fiverr */}
        <div className="bg-surface/40 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-outline-variant/20" />
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Fiverr</p>
          <p className="text-xs text-on-surface-variant mb-4">20% platform fee</p>
          <p className="text-2xl font-black text-on-surface font-mono tracking-tighter">{fmt(calc.fiverr.yearly)}</p>
          <p className="text-[10px] text-on-surface-variant mt-1">per year (48 weeks)</p>
          <div className="mt-4 pt-4 border-t border-outline-variant/15">
            <p className="text-xs text-error font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">trending_down</span>
              {fmt(calc.fiverr.lost)} lost to fees
            </p>
          </div>
        </div>

        {/* Upwork */}
        <div className="bg-surface/40 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-outline-variant/20" />
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Upwork</p>
          <p className="text-xs text-on-surface-variant mb-4">10% service fee</p>
          <p className="text-2xl font-black text-on-surface font-mono tracking-tighter">{fmt(calc.upwork.yearly)}</p>
          <p className="text-[10px] text-on-surface-variant mt-1">per year (48 weeks)</p>
          <div className="mt-4 pt-4 border-t border-outline-variant/15">
            <p className="text-xs text-error font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">trending_down</span>
              {fmt(calc.upwork.lost)} lost to fees
            </p>
          </div>
        </div>

        {/* Untether */}
        <div className="bg-surface/40 backdrop-blur-xl border border-primary/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_40px_rgba(var(--color-primary),0.06)]">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-secondary" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full pointer-events-none" />
          <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Untether</p>
          <p className="text-xs text-primary/70 mb-4">0% facilitator fee</p>
          <p className="text-2xl font-black text-primary font-mono tracking-tighter">{fmt(calc.untether.yearly)}</p>
          <p className="text-[10px] text-on-surface-variant mt-1">per year (48 weeks)</p>
          <div className="mt-4 pt-4 border-t border-primary/15">
            <p className="text-xs font-bold flex items-center gap-1.5 text-[#059669]">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              You keep 100%
            </p>
          </div>
        </div>
      </div>

      {/* ── Savings Callout ── */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>savings</span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">Annual Savings on Untether</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">Compared to other platforms</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-center">
          <div>
            <p className="text-xl font-black text-on-surface font-mono tracking-tighter">{fmt(calc.savedVsUpwork)}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">vs Upwork</p>
          </div>
          <div className="w-px h-8 bg-outline-variant/20" />
          <div>
            <p className="text-xl font-black text-on-surface font-mono tracking-tighter">{fmt(calc.savedVsFiverr)}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">vs Fiverr</p>
          </div>
        </div>
      </div>
    </div>
  );
}
