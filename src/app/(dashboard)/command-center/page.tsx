import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import FacilitatorTimeTracker from "@/components/tracker/FacilitatorTimeTracker";
import ClientTimeTracker from "@/components/tracker/ClientTimeTracker";
import IntegrationsTab from "@/components/dashboard/IntegrationsTab";
import ProjectCompletionModal from "@/components/dashboard/ProjectCompletionModal";

export default async function ProjectCommandCenter({ searchParams }: { searchParams: { id?: string, tab?: string } }) {
  const user = await getCurrentUser();
  if (!user || !searchParams.id) redirect("/dashboard");

  const project = await prisma.project.findUnique({
    where: { id: searchParams.id },
    include: {
      milestones: {
        include: { time_entries: true }
      }
    }
  });

  if (!project) redirect("/dashboard");
  
  const allEntries = project.milestones.flatMap(m => m.time_entries);
  const pendingHours = allEntries.filter(e => e.status === "PENDING" && e.facilitator_id === user.id).reduce((acc, e) => acc + Number(e.hours), 0);
  const activeMilestone = project.milestones.find(m => m.status !== "APPROVED_AND_PAID") || project.milestones[0];

  const activeTab = searchParams.tab || 'war-room';
  const isRetainer = project.billing_type === "HOURLY_RETAINER";
  const isHubLocked = isRetainer && !project.github_repo_url;
  const isCompleted = project.status === "COMPLETED";
  const allPaid = project.milestones.length > 0 && project.milestones.every(m => m.status === "APPROVED_AND_PAID");

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full">
      {/* Background Ambient Light */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Project Header */}
      <header className="relative mb-16">
        <div className="flex items-end justify-between flex-wrap gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold font-headline tracking-widest uppercase border border-primary/20 shadow-[0_0_15px_rgba(58,223,250,0.4)]">
                Active Project
              </span>
              <span className="text-on-surface-variant text-sm font-medium">ID: UNT-7702</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-extrabold font-headline tracking-tighter text-on-surface leading-tight">
              Neural Interface <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Optimization Phase</span>
            </h2>
          </div>

          {/* Status Badge */}
          <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-2xl p-6 flex items-center space-x-6">
            <div className="relative">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle className="text-outline-variant/20" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeWidth="4"></circle>
                <circle className="text-primary" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeDasharray="213.6" strokeDashoffset="64" strokeWidth="4"></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold font-headline">72%</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold font-headline uppercase tracking-widest text-on-surface-variant mb-1">Current Velocity</p>
              <p className="text-2xl font-black text-on-surface">Accelerated</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-outline-variant/30 mb-8 overflow-x-auto custom-scrollbar px-4 lg:px-0 relative z-10 w-full max-w-6xl">
         <Link href={`/command-center?id=${project.id}&tab=war-room`} className={`px-8 py-4 font-bold font-headline uppercase tracking-widest text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'war-room' ? 'border-primary text-primary bg-primary/5 shadow-[inset_0_-2px_10px_rgba(var(--color-primary),0.1)]' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'}`}>
            Execution War Room
         </Link>
         <Link href={`/command-center?id=${project.id}&tab=integrations`} className={`px-8 py-4 font-bold font-headline uppercase tracking-widest text-sm whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'integrations' ? 'border-primary text-primary bg-primary/5 shadow-[inset_0_-2px_10px_rgba(var(--color-primary),0.1)]' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'}`}>
            <span className="material-symbols-outlined text-[16px]">integration_instructions</span>
            Project Integrations
         </Link>
      </div>

      {activeTab === 'integrations' ? (
         <div className="px-4 lg:px-0 relative z-10 w-full max-w-6xl">
            <IntegrationsTab project={project} />
         </div>
      ) : (
         <div className="w-full relative">
            {/* Command Center Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 px-4 lg:px-0 relative z-10 w-full max-w-6xl">
        
        {/* Milestone Tracking (Left Column) */}
        <section className="col-span-1 md:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">format_list_numbered</span>
              Active Milestones
            </h3>
            <button className="text-primary text-sm font-bold font-headline hover:underline transition-all">View Roadmap</button>
          </div>
          
          <div className="space-y-4">
            {/* Milestone Row */}
            <div className="bg-surface-container-low/40 backdrop-blur-2xl border border-outline-variant/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-surface-container-high/60 transition-all duration-300">
              <div className="flex items-center space-x-6">
                <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0 transition-transform group-hover:scale-105">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-on-surface">Initial Architecture Audit</h4>
                  <p className="text-sm text-on-surface-variant">Completed on Oct 12, 2023</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full bg-surface-variant text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Historical</span>
              </div>
            </div>

            {/* Active Milestone Row */}
            <div className="bg-surface-container/80 backdrop-blur-2xl p-6 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-l-4 border-primary shadow-xl">
              <div className="flex items-center space-x-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary animate-pulse shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>pending</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-on-surface">Core Latency Benchmarking</h4>
                  <p className="text-sm text-on-surface-variant mt-1">Requires final performance dataset</p>
                </div>
              </div>
              <button className="bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-6 py-3 rounded-full font-bold font-headline text-sm shadow-[0_0_20px_rgba(58,223,250,0.4)] active:scale-95 transition-all w-full xl:w-auto whitespace-nowrap">
                Mark Milestone Complete
              </button>
            </div>

            {/* Upcoming Milestone Row */}
            <div className="bg-surface-container-low/20 backdrop-blur-2xl border border-outline-variant/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-60 hover:opacity-100 transition-all">
              <div className="flex items-center space-x-6">
                <div className="w-12 h-12 rounded-full bg-outline-variant/20 flex items-center justify-center text-outline-variant shrink-0">
                  <span className="material-symbols-outlined">radio_button_unchecked</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-on-surface">UAT & Final Handover</h4>
                  <p className="text-sm text-on-surface-variant">Estimated: Nov 04</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full bg-surface-variant text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Upcoming</span>
              </div>
            </div>
          </div>

          <div className="pt-10">
            {isCompleted ? (
               <div className="bg-surface/60 backdrop-blur-3xl border border-tertiary/40 rounded-3xl p-8 lg:p-12 text-center shadow-xl shadow-tertiary/5 relative overflow-hidden">
                  <div className="absolute top-0 right-[-10%] w-64 h-64 bg-tertiary/10 blur-[80px] rounded-full pointer-events-none"></div>
                  <span className="material-symbols-outlined text-6xl text-tertiary mb-6 drop-shadow-[0_0_20px_rgba(var(--color-tertiary),0.4)]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <h3 className="text-3xl font-black font-headline text-on-surface uppercase tracking-tight mb-2">Escrow Mathematically Resolved</h3>
                  <p className="text-sm font-medium text-on-surface-variant max-w-xl mx-auto">This Project execution container has been definitively closed and marked Read-Only. AI Auditor telemetry bounds and Client Reviews have successfully merged into the Facilitator's Global Trust Score.</p>
               </div>
            ) : user.role === "FACILITATOR" ? (
               isHubLocked ? (
                  <div className="bg-error/10 border border-error/50 p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-lg shadow-error/5 animate-in fade-in slide-in-from-bottom-4">
                     <span className="material-symbols-outlined text-5xl text-error mb-4 drop-shadow-[0_0_15px_rgba(var(--color-error),0.4)]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_locked</span>
                     <h3 className="text-2xl font-black font-headline text-error tracking-tight uppercase mb-2">Native Execution Locked</h3>
                     <p className="text-sm text-error/90 max-w-lg mb-8 leading-relaxed font-medium">To strictly enforce our 20-Hour Sprint limits organically, you must securely map a direct Github Repository URL in the Integrations loop before processing Time Logs.</p>
                     <Link href={`/command-center?id=${project.id}&tab=integrations`} className="bg-gradient-to-br from-error to-error/80 text-on-error hover:bg-error-container font-black uppercase tracking-widest text-xs px-8 py-4 rounded-xl shadow-[0_8px_20px_rgba(var(--color-error),0.3)] transition-all hover:shadow-error/50 hover:-translate-y-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">link</span> Route to Integrations Hub
                     </Link>
                  </div>
               ) : (
                  <FacilitatorTimeTracker 
                     milestoneId={activeMilestone?.id || ""}
                     pendingHours={pendingHours}
                     limitHours={project.unreviewed_hours_limit}
                  />
               )
            ) : (
               <ClientTimeTracker 
                  entries={allEntries}
               />
            )}

            {user.role === "CLIENT" && allEntries.length > 0 && allEntries.every(e => e.status !== "PENDING") && !isCompleted && (
                <div className="mt-8 bg-surface-container-low border border-primary/30 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between shadow-lg shadow-primary/5 gap-4">
                   <div>
                      <h4 className="text-lg font-bold text-on-surface">Sprint Array Mastered</h4>
                      <p className="text-xs text-on-surface-variant max-w-sm mt-1">Previous 20-hour block approved and disbursed securely. Top up Escrow mathematically to unlock Expert execution boundaries globally.</p>
                   </div>
                   <button className="whitespace-nowrap shrink-0 bg-primary text-on-primary font-bold px-6 py-3 rounded-xl uppercase tracking-widest text-[10px] hover:-translate-y-0.5 transition-all shadow-[0_8px_20px_rgba(var(--color-primary),0.3)]">Fund Next Sprint</button>
                </div>
            )}

            {/* Escrow Closing Block */}
            {user.role === "CLIENT" && allPaid && !isCompleted && (
                <ProjectCompletionModal projectId={project.id} facilitatorId={project.milestones[0]?.facilitator_id || ''} />
            )}
          </div>
        </section>

        {/* Side Rail (Right Column) */}
        <aside className="col-span-1 md:col-span-4 space-y-8">
          {/* Deliverable Area */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-headline flex items-center gap-2 px-2">
              <span className="material-symbols-outlined text-secondary">cloud_upload</span>
              Deliverables
            </h3>
            <div className="bg-surface/40 backdrop-blur-xl border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/50 transition-colors group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">upload_file</span>
              </div>
              <div>
                <p className="text-on-surface font-bold">Drag & Drop Assets</p>
                <p className="text-xs text-on-surface-variant mt-1">Accepts RAW, JSON, or MD (Max 500MB)</p>
              </div>
            </div>
          </div>

          {/* Collaborator List */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-headline flex items-center gap-2 px-2">
              <span className="material-symbols-outlined text-tertiary">group</span>
              Experts & Stakeholders
            </h3>
            <div className="bg-surface/60 backdrop-blur-xl border border-outline-variant/10 rounded-2xl p-4 space-y-4">
              
              <div className="flex items-center justify-between group cursor-pointer p-2 rounded-xl hover:bg-surface-container transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                    <img alt="Expert Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7ZMbgp9Rd9tAepClPJZaHa9Bcj-t6OdoAX8b6Q4g2Pq204YZaxJbExukby_moI3eysm86k9slaPJjtlI4GK1PPLq9r7XrrRMBWyeItgaUvyZ5GtVVpGU49jl9pt8M7iUOFAyU_3SRlVHh4fCgY0ROZIlSc8B9dHRajq-zGleLCU3fyvr592MtWEJsIFaeo8Eu5dnGGw03EVjU3sB3PYzCEd1HBjvPFHgKffVPpmH7WX-rwsjI_kW-ZD7JTpF121E08vPEr0IluMcH" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Erik Vens</p>
                    <p className="text-[10px] text-primary font-headline uppercase tracking-widest">Lead Strategist</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_var(--color-tertiary)]"></span>
              </div>

              <div className="flex items-center justify-between group cursor-pointer p-2 rounded-xl hover:bg-surface-container transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-outline-variant/20 shrink-0">
                    <img alt="Stakeholder Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaJnOV5hlppOJu8ED4o3X5SsozaI9hyOfissCIO1YHGvlZ2Wjgbn4B-Q_O-q9FtJYeWZnt32pPPIIgV0Sqheo-5s75f7JnCdZCQxGF9hf4IA_3mPAQdSYLGim3vGgFlYUc2GQWqxw60ih9jOV9l9Np1cE2zz3G0dYfYOTx7Univ3GHyVBR3QYNPxgzKeUSNCbPIbg5uquDHK2E2Bm4kqRXVOk2FsHYrQIOJAqUqAbG9w-WPWSDGEk5ULj2yY_fLphEgsBV4ktFPA-z" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Sarah Chen</p>
                    <p className="text-[10px] text-on-surface-variant font-headline uppercase tracking-widest">Product Owner</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
              </div>

              <div className="flex items-center justify-between group cursor-pointer p-2 rounded-xl hover:bg-surface-container transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary/20 shrink-0">
                    <img alt="AI Agent" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhIT7Hd6_OcSph1gQIEKK01sBSsbsG7EOUKWcelk0nNxyxyXjnMwDjYbHtpZtGr7dqOe2DcnXC2aHDkQFbrge8ISrK9hRMLZI3mQPKNufCM7eWrveO_8fM8KJMwxJeexMXbwKiVt5ExbRaAfv_rdTBLiaJyLUMlMc_VNkdlWp3DxcgfeYr2QH2705iEXxZltf9kMvxHaLZImhNQbyTcfDSwy0TsNAcRG_Jd8MHTXnaIth7LCshUcnkKfr28maa0I2O5cnzu_-9LkzF" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface group-hover:text-secondary transition-colors">Untether AI</p>
                    <p className="text-[10px] text-secondary font-headline uppercase tracking-widest">Quality Assurance</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_var(--color-secondary)]"></span>
              </div>
              
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 p-5 rounded-2xl">
              <p className="text-[10px] font-headline uppercase tracking-widest text-on-surface-variant">Time Tracked</p>
              <p className="text-2xl font-black mt-1 text-on-surface">142h</p>
            </div>
            <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 p-5 rounded-2xl">
              <p className="text-[10px] font-headline uppercase tracking-widest text-on-surface-variant">Open Tasks</p>
              <p className="text-2xl font-black mt-1 text-primary drop-shadow-[0_0_10px_rgba(58,223,250,0.5)]">08</p>
            </div>
          </div>
        </aside>

            </div>
         </div>
      )}
      
      {/* Floating Action Component (Bottom) */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50 hidden lg:block">
        <div className="bg-surface-container-high/90 backdrop-blur-xl rounded-full p-2 flex items-center justify-between shadow-2xl border border-outline-variant/20">
          <div className="flex items-center gap-4 pl-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-variant"></div>
              <div className="w-8 h-8 rounded-full border-2 border-surface bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">+4</div>
            </div>
            <p className="text-xs font-medium text-on-surface-variant">Experts are currently viewing this project</p>
          </div>
          <div className="flex gap-2">
            <button className="p-3 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined">chat_bubble</span>
            </button>
            <button className="bg-surface-bright text-on-surface px-6 py-2.5 rounded-full text-xs font-bold font-headline uppercase tracking-widest hover:bg-surface-container-lowest transition-colors shadow-lg">
              Project Settings
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
