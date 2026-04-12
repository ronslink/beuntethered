"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FacilitatorInsights({
  trustScore,
  totalSprints,
  avgAuditScore,
  revenueData
}: {
  trustScore: number,
  totalSprints: number,
  avgAuditScore: number,
  revenueData: { name: string, revenue: number }[]
}) {

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const totalRevenue = revenueData.reduce((acc, r) => acc + r.revenue, 0);

  return (
    <main className="p-6 md:p-10 min-h-screen relative overflow-hidden bg-background">
       <div className="absolute bottom-0 left-[10%] w-[600px] h-[600px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

       <div className="max-w-7xl mx-auto relative z-10 space-y-12">
          
          <header className="border-b border-outline-variant/30 pb-8 flex justify-between items-end gap-6 flex-wrap">
             <div>
                <span className="px-4 py-1.5 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-black font-headline tracking-widest uppercase border border-tertiary/30 mb-4 inline-block shadow-[0_0_15px_rgba(var(--color-tertiary),0.2)]">Global Vendor Analytics</span>
                <h1 className="text-4xl lg:text-6xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.9]">
                   Revenue <span className="text-transparent bg-clip-text bg-gradient-to-r from-tertiary to-primary">Velocity</span>
                </h1>
                <p className="text-on-surface-variant font-medium mt-4 text-sm max-w-lg">Advanced structural telemetry tracking exactly how your Expert architectures are monetizing securely globally.</p>
             </div>
             
             <div className="bg-surface-container-low border border-outline-variant/30 px-8 py-5 rounded-3xl shrink-0 hover:border-tertiary/40 transition-colors cursor-crosshair text-right">
                <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">6-Month Earnings Cleared</p>
                <p className="text-4xl font-black font-headline text-on-surface tracking-tighter opacity-90 text-tertiary">{formatCurrency(totalRevenue)}</p>
             </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
             
             {/* Revenue Area Chart Hero */}
             <div className="col-span-1 md:col-span-12 bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none"></div>
                <h3 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight mb-8">Revenue Distribution</h3>
                <div className="w-full h-[400px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                         <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4}/>
                               <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                         <XAxis 
                            dataKey="name" 
                            stroke="rgba(255,255,255,0.2)" 
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold' }} 
                            axisLine={false} 
                            tickLine={false} 
                            dy={10}
                         />
                         <YAxis 
                            stroke="rgba(255,255,255,0.2)" 
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
                            axisLine={false} 
                            tickLine={false}
                            tickFormatter={(val) => `$${val}`}
                         />
                         <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                            formatter={(value: any) => formatCurrency(value)}
                         />
                         <Area type="monotone" dataKey="revenue" stroke="#c084fc" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Telemetry Matrix Grid */}
             <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Trust Score Node */}
                <div className="bg-surface/40 backdrop-blur-3xl border border-primary/20 rounded-3xl p-8 relative overflow-hidden group hover:border-primary/50 transition-all cursor-crosshair flex flex-col justify-between">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
                   <div className="flex items-center gap-3 mb-6 relative z-10">
                      <span className="material-symbols-outlined text-primary text-3xl">local_police</span>
                      <h3 className="font-bold font-headline uppercase tracking-widest text-on-surface text-sm">Global Trust Score</h3>
                   </div>
                   <div>
                      <div className="flex items-end gap-2 relative z-10">
                         <span className="text-6xl font-black font-headline text-on-surface tracking-tighter leading-none">{trustScore.toFixed(1)}</span>
                         <span className="text-primary font-bold mb-1">/100</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-1.5 mt-8 rounded-full overflow-hidden">
                         <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(trustScore, 100)}%` }}></div>
                      </div>
                   </div>
                </div>

                {/* Total Sprints Completed */}
                <div className="bg-surface/40 backdrop-blur-3xl border border-tertiary/20 rounded-3xl p-8 relative overflow-hidden group hover:border-tertiary/50 transition-all cursor-crosshair flex flex-col justify-between">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl group-hover:bg-tertiary/20 transition-all"></div>
                   <div className="flex items-center gap-3 mb-6 relative z-10">
                      <span className="material-symbols-outlined text-tertiary text-3xl">dynamic_feed</span>
                      <h3 className="font-bold font-headline uppercase tracking-widest text-on-surface text-sm">Sprints Completed</h3>
                   </div>
                   <div className="flex items-end gap-2 relative z-10">
                      <span className="text-6xl font-black font-headline text-on-surface tracking-tighter leading-none">{totalSprints}</span>
                      <span className="text-tertiary font-bold tracking-widest uppercase text-[10px] mb-1.5">Executed Safely</span>
                   </div>
                </div>

                {/* Average AI Audit */}
                <div className="bg-surface/40 backdrop-blur-3xl border border-secondary/20 rounded-3xl p-8 relative overflow-hidden group hover:border-secondary/50 transition-all cursor-crosshair flex flex-col justify-between">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-all"></div>
                   <div className="flex items-center gap-3 mb-6 relative z-10">
                      <span className="material-symbols-outlined text-secondary text-3xl">psychology</span>
                      <h3 className="font-bold font-headline uppercase tracking-widest text-on-surface text-sm">AI Alignment Math</h3>
                   </div>
                   {avgAuditScore === 0 ? (
                       <p className="text-3xl font-black text-on-surface tracking-tighter">Pending Signals</p>
                   ) : (
                       <div className="flex items-end gap-2 relative z-10">
                          <span className="text-6xl font-black font-headline text-on-surface tracking-tighter leading-none">{avgAuditScore.toFixed(0)}</span>
                          <span className="text-secondary font-bold mb-1">Algorithmic</span>
                       </div>
                   )}
                   <p className="text-[10px] font-bold tracking-widest uppercase text-secondary/80 mt-4 px-3 py-1 bg-secondary/10 rounded-full w-fit border border-secondary/20">Vector Verified Result</p>
                </div>

             </div>
          </section>

       </div>
    </main>
  );
}
