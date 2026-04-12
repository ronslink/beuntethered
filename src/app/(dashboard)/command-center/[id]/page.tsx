import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChatWidget from "@/components/dashboard/command-center/ChatWidget";
import IntegrationsTab from "@/components/dashboard/IntegrationsTab";

export default async function ProjectCommandCenter({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab || "war-room";
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      milestones: {
        include: { time_entries: true },
        orderBy: { id: "asc" },
      },
      bids: {
        include: { developer: true },
      },
    },
  });

  if (!project) notFound();

  // Determine the viewer's role context for this project
  const isClient = user.role === "CLIENT" && project.client_id === user.id;
  const isFacilitator =
    user.role === "FACILITATOR" &&
    project.milestones.some((m) => m.facilitator_id === user.id);

  if (!isClient && !isFacilitator) {
    redirect("/dashboard");
  }

  // Active milestone: first non-completed milestone
  const activeMilestone =
    project.milestones.find((m) => m.status !== "APPROVED_AND_PAID") ||
    project.milestones[0];

  const completedMilestones = project.milestones.filter(
    (m) => m.status === "APPROVED_AND_PAID"
  ).length;
  const totalMilestones = project.milestones.length;
  const progressPercent =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  // For facilitators: aggregate pending hours
  const allEntries = project.milestones.flatMap((m) => m.time_entries);
  const pendingHours = isFacilitator
    ? allEntries
        .filter(
          (e) => e.status === "PENDING" && e.facilitator_id === user.id
        )
        .reduce((acc, e) => acc + Number(e.hours), 0)
    : 0;

  const isRetainer = project.billing_type === "HOURLY_RETAINER";
  const isHubLocked = isRetainer && !project.github_repo_url;
  const isCompleted = project.status === "COMPLETED";
  const allPaid =
    totalMilestones > 0 &&
    project.milestones.every((m) => m.status === "APPROVED_AND_PAID");

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);

  const statusLabels: Record<string, string> = {
    PENDING: "Waiting for Funding",
    FUNDED_IN_ESCROW: "Funded",
    SUBMITTED_FOR_REVIEW: "In Review",
    APPROVED_AND_PAID: "Completed",
    DISPUTED: "Disputed",
  };

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full">
      {/* Background */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Project Header */}
      <header className="relative mb-16">
        <div className="flex items-end justify-between flex-wrap gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-bold font-headline tracking-widest uppercase border ${
                  isCompleted
                    ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                    : "bg-primary/10 text-primary border-primary/20"
                }`}
              >
                {isCompleted ? "Completed" : "Active Project"}
              </span>
              <span className="text-on-surface-variant text-sm font-medium">
                ID: {project.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-extrabold font-headline tracking-tighter text-on-surface leading-tight">
              {project.title}
            </h2>
          </div>

          {/* Progress Ring */}
          <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-2xl p-6 flex items-center space-x-6">
            <div className="relative">
              <svg
                className="w-20 h-20 transform -rotate-90"
                viewBox="0 0 80 80"
              >
                <circle
                  className="text-outline-variant/20"
                  cx="40"
                  cy="40"
                  fill="transparent"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <circle
                  className="text-primary"
                  cx="40"
                  cy="40"
                  fill="transparent"
                  r="34"
                  stroke="currentColor"
                  strokeDasharray="213.6"
                  strokeDashoffset={213.6 - (213.6 * progressPercent) / 100}
                  strokeWidth="4"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold font-headline">
                  {progressPercent}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold font-headline uppercase tracking-widest text-on-surface-variant mb-1">
                Progress
              </p>
              <p className="text-2xl font-black text-on-surface">
                {isCompleted ? "Complete" : "Active"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-outline-variant/30 mb-8 overflow-x-auto custom-scrollbar px-4 lg:px-0 relative z-10 w-full max-w-6xl">
        <Link
          href={`/command-center/${project.id}?tab=war-room`}
          className={`px-8 py-4 font-bold font-headline uppercase tracking-widest text-sm whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "war-room"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50"
          }`}
        >
          Milestones
        </Link>
        <Link
          href={`/command-center/${project.id}?tab=messages`}
          className={`px-8 py-4 font-bold font-headline uppercase tracking-widest text-sm whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "messages"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50"
          }`}
        >
          Messages
        </Link>
        <Link
          href={`/command-center/${project.id}?tab=integrations`}
          className={`px-8 py-4 font-bold font-headline uppercase tracking-widest text-sm whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "integrations"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50"
          }`}
        >
          Integrations
        </Link>
      </div>

      {activeTab === "messages" ? (
        <ChatWidget projectId={project.id} currentUserId={user.id} />
      ) : activeTab === "integrations" ? (
        <div className="px-4 lg:px-0 relative z-10 w-full max-w-6xl">
          <IntegrationsTab project={{ ...project, has_github_token: !!project.github_access_token, github_access_token: undefined }} />
        </div>
      ) : (
        <div className="w-full relative z-10 max-w-6xl">
        <div className="flex items-center justify-between px-2 mb-6">
          <h3 className="text-xl font-bold font-headline flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              format_list_numbered
            </span>
            Project Milestones
          </h3>
          <span className="text-on-surface-variant text-sm">
            {completedMilestones} of {totalMilestones} completed
          </span>
        </div>

        {project.milestones.length === 0 ? (
          <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <span className="material-symbols-outlined text-outline-variant text-[80px] mb-6" style={{ fontVariationSettings: "'FILL' 0" }}>assignment_late</span>
            <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface mb-2">No Milestones Defined</h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-8">
              {isClient
                ? "This project doesn't have any milestones yet. Add milestones to track progress and manage payments securely."
                : "This project doesn't have any milestones defined yet. The client will add milestones to track your work."}
            </p>
            {isClient && (
              <Link
                href={`/command-center/${project.id}?tab=milestones`}
                className="px-8 py-3.5 rounded-xl bg-primary text-on-primary font-bold font-headline uppercase tracking-widest text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 inline-block"
              >
                Add First Milestone
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {project.milestones.map((milestone, idx) => {
            const isActive = milestone.id === activeMilestone?.id;
            const isCompleted = milestone.status === "APPROVED_AND_PAID";
            const isHistorical = idx < project.milestones.indexOf(activeMilestone || { id: "" } as any);

            return (
              <div
                key={milestone.id}
                className={`p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isCompleted
                    ? "bg-surface-container-low/40 border border-outline-variant/10 opacity-70"
                    : isActive
                    ? "bg-surface-container/80 border-l-4 border-primary shadow-xl"
                    : "bg-surface-container-low/20 border border-outline-variant/10 opacity-60"
                }`}
              >
                <div className="flex items-center space-x-6">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-tertiary/10 text-tertiary"
                        : isActive
                        ? "bg-primary/20 text-primary animate-pulse"
                        : "bg-outline-variant/20 text-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {isCompleted
                        ? "check_circle"
                        : isActive
                        ? "pending"
                        : "radio_button_unchecked"}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-on-surface">
                      {milestone.title}
                    </h4>
                    <p className="text-sm text-on-surface-variant">
                      {formatCurrency(Number(milestone.amount))} &middot;{" "}
                      {statusLabels[milestone.status] || milestone.status}
                      {milestone.estimated_duration_days &&
                        ` \u00b7 ${milestone.estimated_duration_days} days`}
                    </p>
                  </div>
                </div>

                {isActive && !isCompleted && (
                  <div className="flex items-center gap-3">
                    {isFacilitator && !isHubLocked && (
                      <Link
                        href={`/command-center/${project.id}?tab=time-tracker&milestone=${milestone.id}`}
                        className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                      >
                        Log Time
                      </Link>
                    )}
                    {isClient && (
                      <Link
                        href={`/command-center/${project.id}?tab=review&milestone=${milestone.id}`}
                        className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                      >
                        Review Work
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        {/* Project Completion Banner */}
        {isCompleted && (
          <div className="mt-10 bg-tertiary/10 border border-tertiary/30 rounded-3xl p-8 lg:p-12 text-center">
            <span
              className="material-symbols-outlined text-6xl text-tertiary mb-4"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            <h3 className="text-3xl font-black font-headline text-on-surface uppercase tracking-tight mb-2">
              Project Complete
            </h3>
            <p className="text-sm text-on-surface-variant max-w-xl mx-auto">
              This project is complete. The client has approved all milestones
              and funds have been released.
            </p>
          </div>
        )}

        {/* Facilitator: Hub Locked Warning */}
        {isFacilitator && isHubLocked && (
          <div className="mt-8 bg-error/10 border border-error/50 p-8 rounded-3xl flex flex-col items-center justify-center text-center">
            <span
              className="material-symbols-outlined text-5xl text-error mb-4"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_locked
            </span>
            <h3 className="text-2xl font-black font-headline text-error uppercase tracking-tight mb-2">
              GitHub Required
            </h3>
            <p className="text-sm text-error/90 max-w-lg mb-6 leading-relaxed">
              To log time on this project, you need to connect a GitHub
              repository first.
            </p>
            <Link
              href={`/command-center/${project.id}?tab=integrations`}
              className="bg-error text-on-error font-bold px-6 py-3 rounded-xl uppercase tracking-widest text-xs hover:-translate-y-0.5 transition-all"
            >
              Connect GitHub
            </Link>
          </div>
        )}
        </div>
      )}
    </main>
  );
}
