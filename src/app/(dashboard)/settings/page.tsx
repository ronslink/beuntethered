import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/auth";
import BYOKSettingsClient from "@/components/settings/BYOKSettingsClient";
import AgentKeyClient from "@/components/settings/AgentKeyClient";
import StripeDashboardButton from "@/components/settings/StripeDashboardButton";
import FacilitatorVerificationActions from "@/components/settings/FacilitatorVerificationActions";
import { FacilitatorProfileSettings, ClientPreferencesSettings } from "@/components/settings/ProfileSettingsClient";
import DisplayNameInput from "@/components/settings/DisplayNameInput";
import NotificationSettings from "@/components/settings/NotificationSettings";
import OrganizationSettingsClient from "@/components/settings/OrganizationSettingsClient";
import { isServerGemmaConfigured } from "@/lib/ai-provider-config";
import {
  FACILITATOR_PLATFORM_FEE_RATE,
  MARKETPLACE_CLIENT_FEE_RATE,
  formatFeeRate,
} from "@/lib/platform-fees";

type VerificationStatusValue = "PENDING" | "VERIFIED" | "REJECTED";

function StatusPill({ ok, label, tone = "neutral" }: { ok: boolean; label: string; tone?: "neutral" | "warning" | "error" }) {
  const classes = ok
    ? "bg-tertiary/10 text-tertiary border-tertiary/30"
    : tone === "error"
      ? "bg-error/10 text-error border-error/30"
      : tone === "warning"
        ? "bg-secondary/10 text-secondary border-secondary/30"
        : "bg-surface-container-high text-on-surface-variant border-outline-variant/30";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${classes}`}>
      {label}
    </span>
  );
}

function verificationTone(status: VerificationStatusValue) {
  if (status === "VERIFIED") return "neutral";
  if (status === "REJECTED") return "error";
  return "warning";
}

function verificationPillLabel(status: VerificationStatusValue) {
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Needs review";
  return "Pending";
}

function verificationDetail(label: string, status: VerificationStatusValue) {
  if (status === "VERIFIED") return `${label} is recorded and ready.`;
  if (status === "REJECTED") return `${label} needs updated evidence before marketplace eligibility.`;
  return `${label} is waiting for provider confirmation or profile evidence.`;
}

function formatHistoryDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function ReadinessCard({
  icon,
  label,
  value,
  ok,
}: {
  icon: string;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`material-symbols-outlined rounded-xl border p-2 text-[20px] ${ok ? "border-tertiary/20 bg-tertiary/10 text-tertiary" : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant"}`}>
          {icon}
        </span>
        <StatusPill ok={ok} label={ok ? "Ready" : "Action"} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-black text-on-surface">{value}</p>
    </div>
  );
}

function SectionJumpNav({ isFacilitator }: { isFacilitator: boolean }) {
  const items = [
    { href: "#profile", label: "Profile", icon: "person" },
    { href: "#verification", label: "Verification", icon: "verified_user" },
    { href: "#payments-payouts", label: isFacilitator ? "Payouts" : "Payments", icon: "payments" },
    { href: "#ai-model-keys", label: "AI & Automation", icon: "key" },
    { href: "#notifications", label: "Notifications", icon: "notifications" },
  ];

  return (
    <nav className="rounded-2xl border border-outline-variant/20 bg-surface p-2 shadow-sm" aria-label="Account profile sections">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-xs font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function VerificationGate({
  icon,
  label,
  status,
  detail,
  href,
}: {
  icon: string;
  label: string;
  status: VerificationStatusValue;
  detail: string;
  href: string;
}) {
  const ready = status === "VERIFIED";
  return (
    <a
      href={href}
      className="group rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 transition-colors hover:border-primary/40 hover:bg-surface-container-high"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`material-symbols-outlined rounded-lg border p-1.5 text-[18px] ${
          ready
            ? "border-tertiary/20 bg-tertiary/10 text-tertiary"
            : status === "REJECTED"
              ? "border-error/20 bg-error/10 text-error"
              : "border-secondary/20 bg-secondary/10 text-secondary"
        }`}>
          {icon}
        </span>
        <StatusPill ok={ready} label={verificationPillLabel(status)} tone={verificationTone(status)} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface group-hover:text-primary">{label}</p>
      <p className="mt-2 min-h-10 text-xs font-medium leading-5 text-on-surface-variant">{detail}</p>
    </a>
  );
}

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true, email: true, name: true, role: true,
      preferred_llm: true, openai_key: true, anthropic_key: true,
      openai_key_encrypted: true, anthropic_key_encrypted: true, google_key_encrypted: true,
      agent_key_hash: true, stripe_account_id: true, stripe_customer_id: true,
      // Profile fields
      bio: true, skills: true, ai_agent_stack: true, portfolio_url: true,
      availability: true, years_experience: true, preferred_project_size: true,
      hourly_rate: true,
      // Client fields
      company_name: true, company_type: true,
      preferred_bid_type: true, typical_project_budget: true,
      address_line1: true, address_city: true, address_state: true,
      address_zip: true, address_country: true,
      // Legal
      tos_accepted_at: true,
      // Notifications
      notify_payment_updates: true,
      notify_new_proposals: true,
      notify_milestone_reviews: true,
      verifications: {
        select: {
          type: true,
          status: true,
        },
      },
      owned_organizations: {
        select: {
          id: true,
          name: true,
          type: true,
          website: true,
          billing_email: true,
          members: {
            select: {
              id: true,
              role: true,
              created_at: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { created_at: "asc" },
          },
        },
        orderBy: { created_at: "asc" },
      },
      organizations: {
        select: {
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
              type: true,
              website: true,
              billing_email: true,
              members: {
                select: {
                  id: true,
                  role: true,
                  created_at: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
                orderBy: { created_at: "asc" },
              },
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
      notifications: {
        where: { source_key: { startsWith: "verification:" } },
        select: {
          id: true,
          message: true,
          type: true,
          metadata: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 6,
      },
    },
  });
  if (!user) redirect("/api/auth/signin");

  const hasKey = (plain?: string | null, encrypted?: string | null) => {
    if (plain) return `sk-···${plain.slice(-4)}`;
    if (encrypted) return `[Encrypted]`;
    return "";
  };

  const stripeVerification = user.verifications.find((verification) => verification.type === "STRIPE")?.status ?? "PENDING";
  const businessVerification = user.verifications.find((verification) => verification.type === "BUSINESS")?.status ?? "PENDING";
  const identityVerification = user.verifications.find((verification) => verification.type === "IDENTITY")?.status ?? "PENDING";
  const portfolioVerification = user.verifications.find((verification) => verification.type === "PORTFOLIO")?.status ?? "PENDING";
  const editableOrganization = user.owned_organizations[0]
    ?? user.organizations.find(membership => membership.role === "OWNER" || membership.role === "ADMIN")?.organization
    ?? null;
  const workspaceName = editableOrganization?.name ?? user.company_name ?? "";
  const workspaceType = editableOrganization?.type ?? user.company_type ?? "";
  const isFacilitator = user.role === "FACILITATOR";
  const profileComplete = isFacilitator
    ? Boolean(user.bio && user.skills.length > 0 && user.ai_agent_stack.length > 0 && user.portfolio_url)
    : Boolean(workspaceName && workspaceType && user.typical_project_budget);
  const hasPaymentIdentity = isFacilitator ? Boolean(user.stripe_account_id) : Boolean(user.stripe_customer_id);
  const paymentReady = isFacilitator ? hasPaymentIdentity : true;
  const byokReady = Boolean(user.openai_key || user.anthropic_key || user.openai_key_encrypted || user.anthropic_key_encrypted || user.google_key_encrypted);
  const agentReady = Boolean(user.agent_key_hash);
  const legalReady = Boolean(user.tos_accepted_at);
  const relevantVerifications = isFacilitator
    ? [identityVerification, stripeVerification, portfolioVerification]
    : [businessVerification];
  const verificationCount = relevantVerifications
    .filter(status => status === "VERIFIED").length;
  const verificationTotal = relevantVerifications.length;
  const readinessSignals = [
    profileComplete,
    paymentReady,
    byokReady,
    ...(isFacilitator ? [agentReady] : []),
    legalReady,
    ...(isFacilitator
      ? [stripeVerification === "VERIFIED", identityVerification === "VERIFIED", portfolioVerification === "VERIFIED"]
      : [businessVerification === "VERIFIED"]),
  ];
  const readinessScore = Math.round((readinessSignals.filter(Boolean).length / readinessSignals.length) * 100);
  const actionItems = [
    !profileComplete
      ? {
          label: user.role === "FACILITATOR"
            ? "Complete client-visible facilitator profile"
            : "Complete workspace and project preference details",
          href: user.role === "FACILITATOR" ? "#professional-profile" : "#workspace-billing",
        }
      : null,
    user.role === "FACILITATOR" && !hasPaymentIdentity
      ? {
          label: "Connect Stripe Express for payouts",
          href: "#payments-payouts",
        }
      : null,
    user.role === "FACILITATOR" && stripeVerification !== "VERIFIED"
      ? { label: "Finish Stripe verification", href: "#payments-payouts" }
      : null,
    user.role === "FACILITATOR" && identityVerification !== "VERIFIED"
      ? { label: "Finish identity verification", href: "#payments-payouts" }
      : null,
    user.role === "FACILITATOR" && portfolioVerification !== "VERIFIED"
      ? { label: "Add or verify portfolio evidence", href: "#professional-profile" }
      : null,
    user.role === "CLIENT" && businessVerification !== "VERIFIED"
      ? { label: "Add business verification evidence", href: "#workspace-billing" }
      : null,
    !byokReady
      ? { label: "Add an AI provider key for proposal and scope assistance", href: "#ai-model-keys" }
      : null,
    isFacilitator && !agentReady
      ? { label: "Generate a delivery automation key when you are ready to connect approved AI-assisted tools", href: "#agent-access" }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  return (
    <main className="lg:p-6 relative overflow-hidden min-h-full pb-20 bg-background">
      {/* ── Header ── */}
      <header className="relative z-10 mb-8 px-4 lg:px-0 max-w-[1400px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Marketplace identity</p>
            <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tight text-on-surface leading-tight">
              Account Profile
            </h1>
            <p className="text-on-surface-variant font-medium mt-2 text-sm max-w-2xl">
              Manage the buyer-visible identity, verification evidence, payment readiness, and trusted access controls behind your marketplace account.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-outline-variant/30 bg-surface px-5 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Readiness</p>
              <p className="mt-1 text-3xl font-black text-on-surface">{readinessScore}%</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/30 bg-surface px-5 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Verification</p>
              <p className="mt-1 text-3xl font-black text-on-surface">{verificationCount}/{verificationTotal}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-4 lg:px-0 max-w-[1400px] space-y-5">
        <SectionJumpNav isFacilitator={isFacilitator} />

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Identity and trust</p>
          <h2 className="mt-1 text-lg font-black text-on-surface">Account readiness</h2>
        </div>

        {/* ── Readiness Overview ── */}
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ReadinessCard
            icon="badge"
            label={user.role === "FACILITATOR" ? "Facilitator profile" : "Buyer workspace"}
            value={profileComplete
              ? (user.role === "FACILITATOR" ? "Client-visible identity is ready" : "Workspace details are ready")
              : (user.role === "FACILITATOR" ? "Profile details need attention" : "Workspace details need attention")}
            ok={profileComplete}
          />
          <ReadinessCard
            icon="payments"
            label={user.role === "FACILITATOR" ? "Payout identity" : "Billing identity"}
            value={user.role === "FACILITATOR"
              ? (hasPaymentIdentity ? "Stripe identity present" : "Payment setup needed")
              : (hasPaymentIdentity ? "Stripe customer on file" : "Created during first checkout")}
            ok={paymentReady}
          />
          <ReadinessCard
            icon="key"
            label="AI provider keys"
            value={byokReady ? "BYOK configured" : "No provider key configured"}
            ok={byokReady}
          />
          {isFacilitator ? (
            <ReadinessCard
              icon="vpn_key"
              label="Automation key"
              value={agentReady ? "Automation key is bound" : "Automation key not generated"}
              ok={agentReady}
            />
          ) : null}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div id="verification" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">verified_user</span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Verification Evidence</h2>
                <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
                  Trust checks that affect shortlist confidence, bid awards, and payout readiness.
                </p>
              </div>
            </div>
            <div className={`grid grid-cols-1 ${isFacilitator ? "md:grid-cols-3" : "md:grid-cols-1"} divide-y md:divide-y-0 md:divide-x divide-outline-variant/10`}>
              {(isFacilitator
                ? [
                    { label: "Identity", status: identityVerification as VerificationStatusValue },
                    { label: "Stripe payouts", status: stripeVerification as VerificationStatusValue },
                    { label: "Portfolio", status: portfolioVerification as VerificationStatusValue },
                  ]
                : [
                    { label: "Business", status: businessVerification as VerificationStatusValue },
                  ]
              ).map(item => (
                <div key={item.label} className="p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">{item.label}</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-on-surface capitalize">{item.status.toLowerCase()}</p>
                    <StatusPill ok={item.status === "VERIFIED"} label={verificationPillLabel(item.status)} tone={verificationTone(item.status)} />
                  </div>
                  <p className="mt-3 text-[11px] font-medium leading-relaxed text-on-surface-variant">
                    {verificationDetail(item.label, item.status)}
                  </p>
                </div>
              ))}
            </div>
            {isFacilitator ? (
              <div className="border-t border-outline-variant/10 p-5">
                <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4" data-testid="award-eligibility-checklist">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Award Eligibility Checklist</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-on-surface-variant">
                        These are the buyer-trust gates that affect winning marketplace bids and receiving escrow payouts.
                      </p>
                    </div>
                    <span className="rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-[10px] font-black text-on-surface">
                      {verificationCount}/{verificationTotal}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <VerificationGate
                      icon="badge"
                      label="Identity"
                      status={identityVerification}
                      detail={identityVerification === "VERIFIED"
                        ? "Required identity check is complete."
                        : "Complete identity verification before bid awards can be finalized."}
                      href="#verification"
                    />
                    <VerificationGate
                      icon="account_balance"
                      label="Stripe payouts"
                      status={stripeVerification}
                      detail={stripeVerification === "VERIFIED"
                        ? "Payout readiness is verified."
                        : "Connect and verify Stripe Express for milestone payout release."}
                      href="#verification"
                    />
                    <VerificationGate
                      icon="work_history"
                      label="Portfolio evidence"
                      status={portfolioVerification}
                      detail={portfolioVerification === "VERIFIED"
                        ? "Portfolio evidence is verified for buyer review."
                        : "Add a credible portfolio URL so platform review can verify delivery history."}
                      href="#professional-profile"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <FacilitatorVerificationActions
                    hasStripeAccount={!!user.stripe_account_id}
                    stripeStatus={stripeVerification}
                    identityStatus={identityVerification}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <aside className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">task_alt</span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Setup Action Queue</h2>
                <p className="mt-1 text-[11px] font-medium text-on-surface-variant">Jump to account gaps that affect trust, funding, or AI assistance.</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {actionItems.length > 0 ? actionItems.map(item => (
                <a key={item.label} href={item.href} className="flex items-start gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">arrow_right_alt</span>
                  <p className="text-sm font-bold text-on-surface">{item.label}</p>
                </a>
              )) : (
                <div className="rounded-xl border border-tertiary/20 bg-tertiary/10 px-4 py-3">
                  <p className="text-sm font-bold text-tertiary">Core account setup is ready for review.</p>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">history</span>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Verification History</h2>
              <p className="mt-1 text-[11px] font-medium text-on-surface-variant">Recent provider updates recorded from profile evidence and Stripe webhooks.</p>
            </div>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {user.notifications.length > 0 ? user.notifications.map((notification) => (
              <div key={notification.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface">{notification.message}</p>
                    <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
                      {typeof notification.metadata === "object" && notification.metadata && "provider" in notification.metadata
                        ? `Source: ${String(notification.metadata.provider).replace(/_/g, " ")}`
                        : "Source: verification lifecycle"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {formatHistoryDate(notification.created_at)}
                  </span>
                </div>
              </div>
            )) : (
              <div className="px-6 py-5">
                <p className="text-sm font-bold text-on-surface">No verification lifecycle events recorded yet.</p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-on-surface-variant">
                  This will populate when Stripe or profile evidence updates identity, payout, portfolio, or business verification status.
                </p>
              </div>
            )}
          </div>
        </section>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Profile details</p>
          <h2 className="mt-1 text-lg font-black text-on-surface">Edit account details</h2>
        </div>

        <div className="space-y-5 min-w-0">
          {/* ── Profile ── */}
          <section id="profile" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Profile</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Email address
                </label>
                <input
                  type="text" disabled value={user.email || ""}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-3 text-sm text-on-surface font-medium cursor-not-allowed opacity-60"
                />
              </div>
              <DisplayNameInput initialName={user.name || ""} />
            </div>
          </section>

          {/* ── Facilitator: Profile & Tooling ── */}
          {user.role === "FACILITATOR" && (
            <section id="professional-profile" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">badge</span>
                <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Professional Profile</h2>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">Visible to Clients</span>
              </div>
              <FacilitatorProfileSettings initial={{
                bio: user.bio,
                skills: user.skills,
                aiAgentStack: user.ai_agent_stack,
                portfolioUrl: user.portfolio_url,
                availability: user.availability,
                yearsExperience: user.years_experience,
                preferredProjectSize: user.preferred_project_size,
                hourlyRate: Number(user.hourly_rate),
              }} />
            </section>
          )}

          {/* ── Client: Preferences ── */}
          {user.role === "CLIENT" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <section id="workspace-billing" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">domain</span>
                  <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Workspace & Billing Identity</h2>
                </div>
                <OrganizationSettingsClient
                  initial={{
                    id: editableOrganization?.id ?? null,
                    name: workspaceName,
                    type: workspaceType,
                    website: editableOrganization?.website ?? "",
                    billingEmail: editableOrganization?.billing_email ?? user.email ?? "",
                  }}
                  members={(editableOrganization?.members ?? []).map(member => ({
                    id: member.id,
                    role: member.role,
                    createdAt: member.created_at.toISOString(),
                    user: member.user,
                  }))}
                  currentUserId={user.id}
                  verificationStatus={businessVerification}
                />
              </section>

              <section id="project-preferences" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">tune</span>
                  <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Project Preferences</h2>
                </div>
                <ClientPreferencesSettings initial={{
                  companyName: workspaceName,
                  companyType: workspaceType,
                  preferredBidType: user.preferred_bid_type,
                  typicalProjectBudget: user.typical_project_budget,
                  addressLine1: user.address_line1,
                  addressCity: user.address_city,
                  addressState: user.address_state,
                  addressZip: user.address_zip,
                  addressCountry: user.address_country,
                }} />
              </section>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Platform operations</p>
          <h2 className="mt-1 text-lg font-black text-on-surface">Configure access, payments, and alerts</h2>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
            {/* ── BYOK AI Keys ── */}
            <section id="ai-model-keys" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">key</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">AI Model Keys</h2>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-on-surface-variant px-2 py-0.5 rounded-md bg-surface-container-high border border-outline-variant/20">BYOK</span>
          </div>
          <div className="p-6">
            <BYOKSettingsClient
              initialPreferred={user.preferred_llm}
              hasOpenAI={hasKey(user.openai_key, user.openai_key_encrypted)}
              hasAnthropic={hasKey(user.anthropic_key, user.anthropic_key_encrypted)}
              hasGoogle={hasKey(null, user.google_key_encrypted)}
              serverGemmaReady={isServerGemmaConfigured()}
            />
          </div>
        </section>

        {/* ── Delivery automation key ── */}
        {isFacilitator ? (
          <section id="agent-access" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">vpn_key</span>
              <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Delivery Automation Access</h2>
            </div>
            <div className="p-6">
              <AgentKeyClient hasKeyBound={!!user.agent_key_hash} />
            </div>
          </section>
        ) : null}

        {/* ── Financial Integration ── */}
        <section id="payments-payouts" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">payments</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Payments & Payouts</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Client Fee</p>
                <p className="text-lg font-black text-on-surface">{formatFeeRate(MARKETPLACE_CLIENT_FEE_RATE)}</p>
                <p className="text-[10px] text-on-surface-variant mt-1">Added at milestone funding.</p>
              </div>
              <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Facilitator Fee</p>
                <p className="text-lg font-black text-on-surface">{formatFeeRate(FACILITATOR_PLATFORM_FEE_RATE)}</p>
                <p className="text-[10px] text-on-surface-variant mt-1">Payout equals approved milestone amount.</p>
              </div>
              <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Escrow</p>
                <p className="text-lg font-black text-on-surface">Milestone</p>
                <p className="text-[10px] text-on-surface-variant mt-1">Funds release only after approval.</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant font-medium mb-4 leading-relaxed">
              {user.role === "FACILITATOR"
                ? "Connect Stripe Express to receive milestone payouts after client approval."
                : "Client billing is handled during milestone funding. Your total due is shown before checkout."}
            </p>
            {user.role === "FACILITATOR" ? (
              <div className="space-y-3">
                <StripeDashboardButton hasStripeAccount={!!user.stripe_account_id} />
              </div>
            ) : (
              <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface-variant">
                Stripe customer ID: {user.stripe_customer_id ? "On file" : "Created during first checkout"}
              </div>
            )}
          </div>
        </section>

        {/* ── Notifications ── */}
        <section id="notifications" className="scroll-mt-24 bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">notifications</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Email Notifications</h2>
          </div>
          <NotificationSettings initial={{
            notify_payment_updates: user.notify_payment_updates,
            notify_new_proposals: user.notify_new_proposals,
            notify_milestone_reviews: user.notify_milestone_reviews,
          }} />
        </section>
        </div>

      </div>
    </main>
  );
}
