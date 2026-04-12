import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

// ==========================================
// FACILITATOR Dashboard
// ==========================================
async function FacilitatorDashboard({ userId, userName }: { userId: string; userName: string }) {
  const projects = await prisma.project.findMany({
    where: { milestones: { some: { facilitator_id: userId } } },
    include: {
      client: true,
      milestones: { orderBy: { id: "asc" } }
    },
    orderBy: { id: "desc" }
  });

  const activeProjectsCount = projects.filter(p => p.status === "ACTIVE").length;
  const allMilestones = projects.flatMap(p => p.milestones.map(m => ({ ...m, project: p })));
  const awaitingFundingCount = allMilestones.filter(m => m.status === "PENDING").length;
  const actionItems = allMilestones.filter(m => m.status === "PENDING" || m.status === "DISPUTED");

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full">
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Welcome Banner */}
      <header className="relative mb-12">
        <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-8 lg:p-12 shadow-xl shadow-surface-variant/10 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div>
               <p className="text-xs font-bold font-headline uppercase tracking-widest text-primary mb-2">Platform Overview</p>
               <h1 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
                 Welcome back, {userName}
               </h1>
               <p className="text-on-surface-variant mt-4 max-w-lg leading-relaxed font-medium">
                 You currently handle <strong className="text-on-surface">{activeProjectsCount} active projects</strong> globally. The system detects <strong className="text-secondary">{awaitingFundingCount} milestones</strong> actively awaiting client action.
               </p>
             </div>
             <div className="flex md:flex-col gap-3">
               <Link href="/wallet" className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold font-headline text-sm tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all text-center">
                 View Wallet
               </Link>
               <Link href="/marketplace" className="bg-surface-container text-on-surface px-6 py-3 rounded-xl font-bold font-headline text-sm tracking-widest uppercase hover:bg-surface-container-high border border-outline-variant/30 transition-all text-center drop-shadow-sm">
                 Browse Marketplace
               </Link>
             </div>
           </div>
        </div>
      </header>

      {projects.length === 0 ? (
        /* Empty State for Facilitators with no contracts */
        <div className="bg-surface-container-low/40 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8">
          <span className="material-symbols-outlined text-outline-variant text-[80px] mb-6" style={{ fontVariationSettings: "'FILL' 0" }}>handshake</span>
          <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Active Contracts</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-8">
            You haven&apos;t been assigned to any projects yet. Browse the marketplace to find open projects and submit proposals to get started.
          </p>
          <Link href="/marketplace" className="px-8 py-3.5 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95">
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Active Projects Grid */}
          <section className="xl:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">rocket_launch</span>
                Active Operations
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map(project => {
                 const progress = project.milestones.length === 0 ? 0 : 
                    Math.round((project.milestones.filter(m => m.status === "APPROVED_AND_PAID").length / project.milestones.length) * 100);

                 return (
                   <Link href={`/command-center?id=${project.id}`} key={project.id} className="block group">
                     <div className="bg-surface/40 backdrop-blur-2xl border border-outline-variant/20 rounded-3xl p-6 h-full flex flex-col hover:border-primary/40 hover:bg-surface-container-low/60 transition-all duration-300">
                       <div className="flex justify-between items-start mb-6">
                         <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shadow-inner border border-outline-variant/10 group-hover:scale-105 transition-transform">
                           <span className="material-symbols-outlined text-on-surface-variant">terminal</span>
                         </div>
                         {project.is_byoc ? (
                           <span className="px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-bold font-headline tracking-widest uppercase border border-tertiary/20 shadow-[0_0_10px_var(--color-tertiary)] opacity-80 backdrop-blur-sm">
                             0% BYOC Bypass
                           </span>
                         ) : (
                           <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-headline tracking-widest uppercase border border-primary/20 opacity-80 backdrop-blur-sm">
                             Untether Network
                           </span>
                         )}
                       </div>

                       <h4 className="text-xl font-bold text-on-surface leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">{project.title}</h4>
                       <p className="text-xs text-on-surface-variant mb-6 flex items-center gap-2 font-medium">
                         <span className="material-symbols-outlined text-sm">person</span>
                         {project.client?.name || 'Unknown Client'}
                       </p>

                       <div className="mt-auto">
                          <div className="flex justify-between text-xs font-bold font-headline text-on-surface-variant mb-2">
                             <span>Project Velocity</span>
                             <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                             <div className="bg-gradient-to-r from-primary to-primary-container h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                          </div>
                       </div>
                     </div>
                   </Link>
                 );
              })}
            </div>
          </section>

          {/* Active Alerts */}
          <aside className="xl:col-span-4 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">warning</span>
                Active Alerts
              </h3>
            </div>

            <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/20 rounded-3xl p-6 space-y-4 shadow-lg shadow-surface-container/10">
              {actionItems.length === 0 ? (
                 <div className="text-center py-8">
                   <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">task_alt</span>
                   <p className="text-sm font-bold text-on-surface">System Clear.</p>
                   <p className="text-xs text-on-surface-variant mt-1">No pending client holds or milestone disputes present.</p>
                 </div>
              ) : (
                 actionItems.map(item => (
                   <div key={item.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container-high transition-colors group cursor-pointer relative overflow-hidden">
                      {item.status === 'DISPUTED' && (
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary shadow-[0_0_10px_var(--color-secondary)]"></div>
                      )}
                      <div className="flex items-start justify-between gap-4">
                         <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               {item.status === 'DISPUTED' && (
                                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_5px_var(--color-secondary)]"></span>
                               )}
                               {item.status === 'PENDING' && (
                                  <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
                               )}
                               <p className="text-xs font-bold font-headline text-on-surface-variant uppercase tracking-widest">{item.status.replace(/_/g, ' ')}</p>
                            </div>
                            <p className="text-sm font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">{item.title}</p>
                            <p className="text-[10px] text-on-surface-variant font-medium line-clamp-1">{item.project.title}</p>
                         </div>
                         <div className={`p-2 rounded-xl shrink-0 ${item.status === 'DISPUTED' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                            <span className="material-symbols-outlined text-sm">
                               {item.status === 'DISPUTED' ? 'gavel' : 'hourglass_empty'}
                            </span>
                         </div>
                      </div>
                   </div>
                 ))
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

// ==========================================
// CLIENT Dashboard
// ==========================================
async function ClientDashboard({ userId, userName }: { userId: string; userName: string }) {
  const projects = await prisma.project.findMany({
    where: { client_id: userId },
    include: {
      client: true,
      milestones: { orderBy: { id: "asc" } }
    },
    orderBy: { id: "desc" }
  });

  const activeProjectsCount = projects.filter(p => p.status === "ACTIVE").length;
  const allMilestones = projects.flatMap(p => p.milestones.map(m => ({ ...m, project: p })));
  const pendingApprovalCount = allMilestones.filter(m => m.status === "SUBMITTED_FOR_REVIEW").length;

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full">
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Welcome Banner */}
      <header className="relative mb-12">
        <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-8 lg:p-12 shadow-xl shadow-surface-variant/10 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div>
               <p className="text-xs font-bold font-headline uppercase tracking-widest text-primary mb-2">Your Projects</p>
               <h1 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
                 Welcome back, {userName}
               </h1>
               <p className="text-on-surface-variant mt-4 max-w-lg leading-relaxed font-medium">
                 You have <strong className="text-on-surface">{activeProjectsCount} active projects</strong> with <strong className="text-secondary">{pendingApprovalCount} milestones</strong> awaiting your review.
               </p>
             </div>
             <div className="flex md:flex-col gap-3">
               <Link href="/projects/new" className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold font-headline text-sm tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all text-center">
                 Post a Project
               </Link>
               <Link href="/marketplace" className="bg-surface-container text-on-surface px-6 py-3 rounded-xl font-bold font-headline text-sm tracking-widest uppercase hover:bg-surface-container-high border border-outline-variant/30 transition-all text-center drop-shadow-sm">
                 Browse Talent
               </Link>
             </div>
           </div>
        </div>
      </header>

      {projects.length === 0 ? (
        /* Empty State for Clients with no projects */
        <div className="bg-surface-container-low/40 backdrop-blur-3xl border border-outline-variant/30 rounded-3xl p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8">
          <span className="material-symbols-outlined text-outline-variant text-[80px] mb-6" style={{ fontVariationSettings: "'FILL' 0" }}>add_home_work</span>
          <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Projects Yet</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-8">
            You haven&apos;t posted any projects yet. Get started by posting your first project and finding talented freelancers to work with.
          </p>
          <Link href="/projects/new" className="px-8 py-3.5 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95">
            Post Your First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Active Projects Grid */}
          <section className="xl:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">rocket_launch</span>
                Your Projects
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map(project => {
                 const progress = project.milestones.length === 0 ? 0 : 
                    Math.round((project.milestones.filter(m => m.status === "APPROVED_AND_PAID").length / project.milestones.length) * 100);

                 return (
                   <Link href={`/projects/${project.id}`} key={project.id} className="block group">
                     <div className="bg-surface/40 backdrop-blur-2xl border border-outline-variant/20 rounded-3xl p-6 h-full flex flex-col hover:border-primary/40 hover:bg-surface-container-low/60 transition-all duration-300">
                       <div className="flex justify-between items-start mb-6">
                         <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shadow-inner border border-outline-variant/10 group-hover:scale-105 transition-transform">
                           <span className="material-symbols-outlined text-on-surface-variant">description</span>
                         </div>
                         {project.is_byoc ? (
                           <span className="px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-bold font-headline tracking-widest uppercase border border-tertiary/20 shadow-[0_0_10px_var(--color-tertiary)] opacity-80 backdrop-blur-sm">
                             0% BYOC Bypass
                           </span>
                         ) : (
                           <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-headline tracking-widest uppercase border border-primary/20 opacity-80 backdrop-blur-sm">
                             Untether Network
                           </span>
                         )}
                       </div>

                       <h4 className="text-xl font-bold text-on-surface leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">{project.title}</h4>
                       <p className="text-xs text-on-surface-variant mb-6 flex items-center gap-2 font-medium">
                         <span className="material-symbols-outlined text-sm">calendar_today</span>
                         {project.status.replace(/_/g, ' ')}
                       </p>

                       <div className="mt-auto">
                          <div className="flex justify-between text-xs font-bold font-headline text-on-surface-variant mb-2">
                             <span>Progress</span>
                             <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                             <div className="bg-gradient-to-r from-primary to-primary-container h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                          </div>
                       </div>
                     </div>
                   </Link>
                 );
              })}
            </div>
          </section>

          {/* Quick Stats / Alerts */}
          <aside className="xl:col-span-4 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">pending_actions</span>
                Pending Your Action
              </h3>
            </div>

            <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/20 rounded-3xl p-6 space-y-4 shadow-lg shadow-surface-container/10">
              {pendingApprovalCount === 0 ? (
                 <div className="text-center py-8">
                   <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">task_alt</span>
                   <p className="text-sm font-bold text-on-surface">All caught up!</p>
                   <p className="text-xs text-on-surface-variant mt-1">No milestones pending your review.</p>
                 </div>
              ) : (
                 allMilestones
                   .filter(m => m.status === "SUBMITTED_FOR_REVIEW")
                   .map(item => (
                     <div key={item.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container-high transition-colors group cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                           <div className="space-y-1">
                              <p className="text-xs font-bold font-headline text-on-surface-variant uppercase tracking-widest">Awaiting Review</p>
                              <p className="text-sm font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">{item.title}</p>
                              <p className="text-[10px] text-on-surface-variant font-medium">{item.project.title}</p>
                           </div>
                           <div className="p-2 rounded-xl shrink-0 bg-primary/10 text-primary">
                              <span className="material-symbols-outlined text-sm">rate_review</span>
                           </div>
                        </div>
                     </div>
                   ))
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

// ==========================================
// Main Export
// ==========================================
export default async function ExpertDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/api/auth/signin");
  }

  const firstName = user.name?.split(' ')[0] || 'there';

  if (user.role === "FACILITATOR") {
    return <FacilitatorDashboard userId={user.id} userName={firstName} />;
  }

  // Default: CLIENT or other roles
  return <ClientDashboard userId={user.id} userName={firstName} />;
}
