import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/auth";
import ManualVerificationReviewPanel from "@/components/dashboard/admin/ManualVerificationReviewPanel";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { buildVerificationOperationsSummary } from "@/lib/verification-operations";

export default async function AdminVerificationsPage() {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const verifications = await prisma.verification.findMany({
    where: {
      type: { in: ["PORTFOLIO", "BUSINESS"] },
      status: { in: ["PENDING", "REJECTED"] },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
          portfolio_url: true,
          company_name: true,
          company_type: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { updated_at: "desc" },
    ],
    take: 50,
  });
  const [verificationCounts, facilitatorCount, awardEligibleFacilitators] = await Promise.all([
    prisma.verification.groupBy({
      by: ["type", "status"],
      _count: { _all: true },
    }),
    prisma.user.count({ where: { role: "FACILITATOR" } }),
    prisma.user.count({
      where: {
        role: "FACILITATOR",
        AND: [
          { verifications: { some: { type: "STRIPE", status: "VERIFIED" } } },
          { verifications: { some: { type: "IDENTITY", status: "VERIFIED" } } },
        ],
      },
    }),
  ]);
  const operations = buildVerificationOperationsSummary({
    verificationCounts: verificationCounts.map((row) => ({
      type: row.type,
      status: row.status,
      count: row._count._all,
    })),
    facilitatorCount,
    awardEligibleFacilitators,
  });

  return (
    <main className="min-h-full bg-background px-4 py-6 pb-20 lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
            <span className="material-symbols-outlined text-[15px] text-primary">admin_panel_settings</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Admin only</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface lg:text-4xl">
            Verification Review
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-on-surface-variant">
            Review portfolio and business evidence. Stripe payout and identity checks remain provider-owned and are updated through Stripe webhooks.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3 mb-6">
          <Metric label="Review queue" value={String(operations.manualQueue)} />
          <Metric label="Portfolio" value={String(operations.portfolioQueue)} />
          <Metric label="Business" value={String(operations.businessQueue)} />
        </section>

        <section className="mb-6 rounded-xl border border-outline-variant/20 bg-surface p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">
                Provider Verification Rails
              </h2>
              <p className="mt-1 text-xs font-medium text-on-surface-variant">
                Stripe payout and identity checks are provider-owned. This panel shows whether the rails are feeding award readiness.
              </p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              {operations.awardEligibleFacilitators}/{operations.facilitatorCount} award eligible
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <RailCard
              title="Stripe payout"
              verified={operations.stripe.VERIFIED}
              pending={operations.stripe.PENDING}
              rejected={operations.stripe.REJECTED}
            />
            <RailCard
              title="Identity"
              verified={operations.identity.VERIFIED}
              pending={operations.identity.PENDING}
              rejected={operations.identity.REJECTED}
            />
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Provider attention</p>
              <p className="mt-2 text-2xl font-black text-on-surface">{operations.providerPending + operations.providerRejected}</p>
              <p className="mt-1 text-xs font-medium text-on-surface-variant">
                {operations.providerPending} pending and {operations.providerRejected} rejected provider checks.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {verifications.length > 0 ? (
            verifications.map((verification) => (
              <ManualVerificationReviewPanel
                key={verification.id}
                item={{
                  id: verification.id,
                  type: verification.type,
                  status: verification.status,
                  evidence: verification.evidence,
                  updatedAt: verification.updated_at.toISOString(),
                  user: {
                    name: verification.user.name,
                    email: verification.user.email,
                    role: verification.user.role,
                    portfolioUrl: verification.user.portfolio_url,
                    companyName: verification.user.company_name,
                    companyType: verification.user.company_type,
                  },
                }}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface p-12 text-center shadow-sm">
              <span className="material-symbols-outlined mb-3 block text-[48px] text-outline-variant">verified</span>
              <h2 className="text-xl font-black text-on-surface">No manual verification reviews pending</h2>
              <p className="mt-2 text-sm font-medium text-on-surface-variant">
                Portfolio and business evidence queues are clear.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface p-4 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 text-2xl font-black text-on-surface">{value}</p>
    </div>
  );
}

function RailCard({
  title,
  verified,
  pending,
  rejected,
}: {
  title: string;
  verified: number;
  pending: number;
  rejected: number;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{title}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <StatusMetric label="Verified" value={verified} tone="success" />
        <StatusMetric label="Pending" value={pending} tone="warning" />
        <StatusMetric label="Rejected" value={rejected} tone="error" />
      </div>
    </div>
  );
}

function StatusMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "error";
}) {
  const toneClass =
    tone === "success"
      ? "text-[#047857]"
      : tone === "warning"
        ? "text-[#b45309]"
        : "text-error";

  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <p className={`text-lg font-black ${toneClass}`}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  );
}
