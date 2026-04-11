"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function ClientInsights({
  totalSpend,
  activeExposure,
  avgCodeQuality,
  totalSprintClears
}: {
  totalSpend: number,
  activeExposure: number,
  avgCodeQuality: number,
  totalSprintClears: number
}) {

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const completedSpend = totalSpend - activeExposure;
  const pieData = [
     { name: 'Active Escrow Exposure', value: activeExposure },
     { name: 'Executed Assets', value: completedSpend > 0 ? completedSpend : 0.1 } // Fallback for pure charting safely preventing errors
  ];

  const COLORS = ['#3adffa', '#1e293b']; // Primary neon and Surface variant

  return (
    <main className="p-6 md:p-10 min-h-screen relative overflow-hidden bg-background">
       <div className="absolute top-0 right-[10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

       <div className="max-w-7xl mx-auto relative z-10 space-y-12">
          
          <header className="border-b border-outline-variant/30 pb-8 flex justify-between items-end gap-6 flex-wrap">
             <div>
                <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black font-headline tracking-widest uppercase border border-primary/30 mb-4 inline-block shadow-[0_0_15px_rgba(var(--color-primary),0.2)]">Executive Dashboard</span>
                <h1 className="text-4xl lg:text-6xl font-black font-headline tracking-tighter text-on-surface uppercase leading-[0.9]">
                   Capital <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Efficiency</span>
                </h1>
                <p className="text-on-surface-variant font-medium mt-4 text-sm max-w-lg">Telemetry accurately evaluating ROI mapping Escrow deployments visually globally.</p>
             </div>
             
             <div className="bg-surface-container-low border border-outline-variant/30 px-8 py-5 rounded-3xl shrink-0 hover:border-primary/40 transition-colors cursor-crosshair">
                <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Total Lifetime Valuation</p>
                <p className="text-4xl font-black font-headline text-on-surface tracking-tighter opacity-90">{formatCurrency(totalSpend)}</p>
             </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
             
             {/* Capital Efficiency Pie Layout */}
             <div className="col-span-1 md:col-span-8 bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none"></div>
                <div className="flex flex-col xl:flex-row items-center gap-12">
                   
                   <div className="w-full xl:w-1/2 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie
                               data={pieData}
                               innerRadius={90}
                               outerRadius={120}
                               stroke="none"
                               paddingAngle={5}
                               dataKey="value"
                            >
                               {pieData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                            </Pie>
                            <Tooltip 
                               contentStyle={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                               itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                               formatter={(value: any) => formatCurrency(value)}
                            />
                         </PieChart>
                      </ResponsiveContainer>
                   </div>

                   <div className="w-full xl:w-1/2 space-y-8">
                      <h3 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight">Active Deployment Exposure</h3>
                      
                      <div>
                         <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-2 flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full bg-primary border bg-glow shadow-[0_0_10px_rgba(var(--color-primary),0.5)]"></span>
                           Capital Operating In Escrow
                         </p>
                         <p className="text-5xl font-black text-on-surface tracking-tighter">{formatCurrency(activeExposure)}</p>
                      </div>

                      <div className="border-t border-outline-variant/20 pt-6">
                         <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-2 flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full bg-surface-variant"></span>
                           Securely Closed & Capitalized Arrays
                         </p>
                         <p className="text-3xl font-black text-on-surface-variant tracking-tighter opacity-80">{formatCurrency(completedSpend)}</p>
                      </div>
                   </div>

                </div>
             </div>

             <div className="col-span-1 md:col-span-4 flex flex-col gap-8">
                
                {/* Code Quality Metric */}
                <div className="bg-surface/50 backdrop-blur-2xl border border-secondary/20 rounded-3xl p-8 flex-1 flex flex-col justify-center relative overflow-hidden group hover:border-secondary/40 transition-colors">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-all"></div>
                   
                   <span className="material-symbols-outlined text-secondary text-4xl mb-6 relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                   
                   <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-4 relative z-10">Algorithmic Base Return</p>
                   {avgCodeQuality === 0 ? (
                      <p className="text-3xl font-black text-on-surface tracking-tighter mb-4">Awaiting Signal</p>
                   ) : (
                      <div className="flex items-end gap-2 mb-4 relative z-10">
                         <span className="text-7xl font-black font-headline text-on-surface tracking-tighter leading-none">{avgCodeQuality.toFixed(0)}</span>
                         <span className="text-secondary font-bold mb-2">/100</span>
                      </div>
                   )}
                   <p className="text-xs font-medium text-on-surface-variant leading-relaxed opacity-90 relative z-10">The verifiable structural average algorithmic technical quality mapped securely across your acquired components.</p>
                </div>

                {/* Velocity Box */}
                <div className="bg-primary hover:bg-primary-container transition-colors rounded-3xl p-8 text-on-primary hover:text-on-primary-container shadow-xl shadow-primary/10">
                   <p className="text-[10px] uppercase font-bold tracking-widest mb-6 opacity-80">Aggregate Delivery Velocity</p>
                   <div className="flex items-end gap-3">
                      <span className="text-6xl font-black font-headline tracking-tighter leading-none">{totalSprintClears}</span>
                      <span className="text-xs uppercase font-bold tracking-widest mb-1.5 opacity-90">Sprints Executed</span>
                   </div>
                </div>

             </div>
          </section>

       </div>
    </main>
  );
}
