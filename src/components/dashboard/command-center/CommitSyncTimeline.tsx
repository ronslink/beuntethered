"use client";

import { useState, useEffect } from "react";

interface TimelineEvent {
  id: string;
  type: "commit" | "deployment" | "test" | "error" | "milestone" | "review";
  timestamp: string;
  description: string;
  status: "success" | "pending" | "failed";
  author: string;
  commitHash?: string;
}

interface CommitSyncTimelineProps {
  events?: TimelineEvent[];
}

const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: "1",
    type: "commit",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    description: "Pushed feature: ZK escrow payload integration",
    status: "success",
    author: "Alex Chen",
    commitHash: "a3f2c19",
  },
  {
    id: "2",
    type: "deployment",
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    description: "Deployed to staging environment",
    status: "success",
    author: "Sarah Kim",
    commitHash: "b7d4e82",
  },
  {
    id: "3",
    type: "test",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    description: "All 47 tests passing for escrow module",
    status: "success",
    author: "Marcus Johnson",
  },
  {
    id: "4",
    type: "review",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    description: "PR #142 approved: Multi-sig wallet support",
    status: "success",
    author: "Jordan Lee",
    commitHash: "c9a1f34",
  },
  {
    id: "5",
    type: "error",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    description: "Fixed: Transaction revert on edge case",
    status: "success",
    author: "Alex Chen",
    commitHash: "d2b8e57",
  },
  {
    id: "6",
    type: "milestone",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    description: "Phase 1 complete: Core escrow logic deployed",
    status: "success",
    author: "Team",
  },
];

const EVENT_TYPE_CONFIG: Record<
  TimelineEvent["type"],
  { icon: string; colorClass: string; label: string }
> = {
  commit: {
    icon: "commit",
    colorClass: "bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--color-primary),0.4)]",
    label: "Commit",
  },
  deployment: {
    icon: "rocket_launch",
    colorClass: "bg-tertiary/20 text-tertiary shadow-[0_0_20px_rgba(var(--color-tertiary),0.4)]",
    label: "Deploy",
  },
  test: {
    icon: "bug_report",
    colorClass: "bg-green-500/20 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]",
    label: "Test",
  },
  error: {
    icon: "error",
    colorClass: "bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
    label: "Error",
  },
  milestone: {
    icon: "flag",
    colorClass: "bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    label: "Milestone",
  },
  review: {
    icon: "rate_review",
    colorClass: "bg-purple-500/20 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]",
    label: "Review",
  },
};

const STATUS_CONFIG: Record<
  TimelineEvent["status"],
  { badgeClass: string; dotClass: string }
> = {
  success: {
    badgeClass: "bg-green-500/20 text-green-400 border-green-500/30",
    dotClass: "bg-green-400",
  },
  pending: {
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  failed: {
    badgeClass: "bg-red-500/20 text-red-400 border-red-500/30",
    dotClass: "bg-red-400",
  },
};

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMins > 0) {
    return `${diffMins}m ago`;
  }
  return "Just now";
}

export default function CommitSyncTimeline({
  events: propEvents,
}: CommitSyncTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(
    propEvents ?? MOCK_EVENTS
  );
  const [visibleCount, setVisibleCount] = useState(4);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const visibleEvents = sortedEvents.slice(0, visibleCount);
  const hasMore = visibleCount < sortedEvents.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 4);
  };

  return (
    <div className="bg-surface-container-high border border-outline-variant/30 rounded-3xl p-6 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-tertiary/5 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">
              sync
            </span>
          </div>
          <div>
            <h3 className="text-lg font-black font-headline uppercase tracking-tight text-on-surface">
              Commit Sync
            </h3>
            <p className="text-xs text-on-surface-variant font-medium">
              Proof of Work Timeline
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/20">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-green-400">
            Live
          </span>
        </div>
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container border border-outline-variant/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-outline-variant">
              schedule
            </span>
          </div>
          <p className="text-on-surface-variant font-medium">No commits yet</p>
          <p className="text-xs text-outline-variant mt-1">
            Events will appear as they happen
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-outline-variant/30 to-outline-variant/20 rounded-full" />

          {/* Events list */}
          <div className="space-y-4">
            {visibleEvents.map((event, index) => {
              const typeConfig = EVENT_TYPE_CONFIG[event.type];
              const statusConfig = STATUS_CONFIG[event.status];

              return (
                <div
                  key={event.id}
                  className={`
                    relative flex gap-4
                    ${mounted ? "animate-slide-in" : "opacity-0"}
                  `}
                  style={
                    mounted
                      ? ({
                          "--animation-delay": `${index * 150}ms`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  {/* Node dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${typeConfig.colorClass} flex items-center justify-center border border-current/20`}
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {typeConfig.icon}
                      </span>
                    </div>
                  </div>

                  {/* Content card */}
                  <div
                    className={`
                      flex-1 bg-surface-container-low border border-outline-variant/20 
                      rounded-2xl p-4 hover:border-outline-variant/40 transition-all duration-200
                      hover:shadow-lg hover:shadow-black/5
                    `}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-outline-variant">
                          {typeConfig.label}
                        </span>
                        {event.commitHash && (
                          <code className="text-[10px] font-mono bg-surface-container px-1.5 py-0.5 rounded text-primary">
                            #{event.commitHash}
                          </code>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
                      >
                        {event.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm font-medium text-on-surface mb-2 leading-snug">
                      {event.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant font-medium">
                        {event.author}
                      </span>
                      <span className="text-xs text-outline-variant font-medium">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:border-outline-variant/50 transition-all duration-200"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.4s ease-out forwards;
          animation-delay: var(--animation-delay, 0ms);
        }
      `}</style>
    </div>
  );
}
