import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function InsightsPage() {
  const session = await requireSession();
  if (!session?.user) redirect("/api/auth/signin");

  return (
    <main className="p-6 md:p-10 lg:p-14 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative">
      <div className="absolute top-[0%] left-[20%] w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-12 max-w-2xl text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant/50 mb-6 block">insights</span>
        <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tighter text-on-surface mb-4">
          Market <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Insights</span>
        </h2>
        <p className="text-on-surface-variant text-lg mb-8 leading-relaxed">
          Aggregating your Escrow payout history, component velocity, and open market bidding analytics. 
          Advanced visualization dashboards are deploying soon.
        </p>
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-surface-container-low border border-outline-variant/30 rounded-full">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
           <span className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Model Training Active</span>
        </div>
      </div>
    </main>
  );
}
