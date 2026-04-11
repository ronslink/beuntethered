import { prisma } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function BYOCMagicLinkClaim({ params }: { params: { token: string } }) {
  const user = await getCurrentUser();

  const project = await prisma.project.findUnique({
    where: { invite_token: params.token },
    include: {
      creator: true,
      milestones: { orderBy: { amount: 'desc' } }
    }
  });

  if (!project || project.status !== "DRAFT" || !project.is_byoc) {
    notFound(); // Protects against invalid, expired, or actively claimed links 
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const totalValuation = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);

  // If they are already heavily onboarded and mapping correctly natively as a Client,
  // we bypass external friction logic
  const callbackUrl = `/invite/${params.token}/claim`;
  const signInUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="min-h-screen bg-background relative flex flex-col items-center pt-20 px-6 pb-20">
      <div className="absolute top-[0%] left-[20%] w-[600px] h-[600px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="max-w-4xl w-full relative z-10">
         <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/30 shadow-[0_0_20px_rgba(var(--color-secondary),0.15)] mb-6">
                <span className="material-symbols-outlined text-4xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter text-on-surface mb-4">
              Private Delivery Proposal
            </h1>
            <p className="text-on-surface-variant text-lg">
              <span className="font-bold text-on-surface">{project.creator.name}</span> has securely deployed a custom architectural scope for your review. Establish an institutional connection to lock constraints natively.
            </p>
         </div>

         <div className="bg-surface/50 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_rgb(0,0,0,0.05)]">
            <h3 className="text-2xl font-black text-on-surface mb-8 font-headline border-b border-outline-variant/20 pb-4 tracking-tight uppercase">
              {project.title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
               <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Executive Pipeline Summary</label>
                  <p className="text-sm leading-relaxed text-on-surface opacity-90">{project.ai_generated_sow}</p>
               </div>
               <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4 block">Escrow Delivery Graph</label>
                  <div className="space-y-4">
                     {project.milestones.map((m, idx) => (
                        <div key={m.id} className="flex flex-col sm:flex-row justify-between bg-surface-container-low/50 border border-outline-variant/20 rounded-xl p-4">
                           <div className="flex gap-4 items-start">
                             <div className="shrink-0 w-6 h-6 rounded bg-secondary/10 text-secondary font-bold text-xs flex items-center justify-center border border-secondary/20">{idx + 1}</div>
                             <div>
                                <p className="font-bold text-sm text-on-surface">{m.title}</p>
                             </div>
                           </div>
                           <p className="font-black text-on-surface md:mt-0 mt-2 shrink-0">{formatCurrency(Number(m.amount))}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="border-t border-outline-variant/20 pt-8 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Validated Total Valuation</p>
                  <p className="text-4xl font-black text-secondary tracking-tighter">{formatCurrency(totalValuation)}</p>
               </div>
               <Link href={signInUrl} className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1">
                  Connect & Fund Escrow
               </Link>
            </div>
         </div>
      </div>
    </main>
  );
}
