import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/auth";
import ArbitrationPanel from "@/components/dashboard/admin/ArbitrationPanel";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { buildDisputeEvidenceContext } from "@/lib/dispute-evidence";
import { formatReleaseAttestationValue, getReleaseAttestation } from "@/lib/release-attestation";

function formatCurrencyFromCents(cents: number | null) {
  if (cents === null) return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatMilestoneAmount(amount: { toString: () => string }) {
  const value = Number(amount.toString());
  if (!Number.isFinite(value)) return amount.toString();
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatIsoDate(value: string | null) {
  if (!value) return "Date missing";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date);
}

export default async function AdminDisputesHub() {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
     redirect("/command-center");
  }

  // Extract all actively disputed milestones and historical logs
  const disputes = await prisma.dispute.findMany({
     where: { project: { is_byoc: false } },
     orderBy: { created_at: "desc" },
     include: {
        project: true,
        milestone: {
          include: {
            audits: { orderBy: { created_at: "desc" }, include: { attachments: true } },
            attachments: { orderBy: { created_at: "desc" } },
            payment_records: { orderBy: { created_at: "desc" } },
            activity_logs: { orderBy: { created_at: "desc" }, take: 10 },
          },
        },
        client: true,
        facilitator: true,
        attachments: { orderBy: { created_at: "asc" } }
     }
  });
  const openCount = disputes.filter((dispute) => dispute.status === "OPEN").length;
  const evidenceFileCount = disputes.reduce(
    (total, dispute) => total + dispute.attachments.length + dispute.milestone.attachments.length,
    0
  );

  return (
    <main className="lg:p-6 min-h-full flex flex-col relative pb-20">
       <div className="absolute top-0 left-[10%] w-[600px] h-[600px] bg-error/5 blur-[120px] rounded-full pointer-events-none" />

       <header className="mb-8 px-4 lg:px-0 relative z-10">
         <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full bg-error/10 text-error text-[10px] font-black tracking-widest uppercase border border-error/20 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
               Admin Only
            </span>
         </div>
         <h1 className="text-3xl lg:text-4xl font-black font-headline tracking-tighter text-on-surface uppercase leading-tight">
           Dispute Arbitration
         </h1>
         <p className="text-on-surface-variant font-medium mt-2 text-sm">
           Review disputed Escrow payments, examine AI fact-finding reports, and issue resolution rulings.
         </p>
       </header>

       <section className="relative z-10 space-y-5 px-4 lg:px-0 max-w-[1200px]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { label: "Open Cases", value: openCount, icon: "gavel" },
              { label: "Evidence Files", value: evidenceFileCount, icon: "folder_open" },
              {
                label: "AI Reports",
                value: disputes.filter((dispute) => Boolean(dispute.ai_fact_finding_report)).length,
                icon: "psychology",
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-outline-variant/20 bg-surface p-4">
                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                  <span className="material-symbols-outlined text-[13px]">{stat.icon}</span>
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-black text-on-surface">{stat.value}</p>
              </div>
            ))}
          </div>
          {disputes.length === 0 ? (
             <div className="bg-surface border border-outline-variant/20 rounded-2xl p-16 text-center">
               <span className="material-symbols-outlined text-[56px] text-outline-variant/40 mb-4 block" style={{ fontVariationSettings: "'FILL' 0" }}>gavel</span>
               <h3 className="text-xl font-black font-headline text-on-surface mb-2 uppercase tracking-tight">No Active Disputes</h3>
               <p className="text-sm text-on-surface-variant max-w-sm mx-auto">All Escrow transactions are executing cleanly. No arbitration required at this time.</p>
             </div>
          ) : (
             disputes.map((dispute) => {
                const reviewContext = buildDisputeEvidenceContext(dispute.milestone);
                const latestRelease = reviewContext.paymentStatus.find(
                  (record) => record.kind === "ESCROW_RELEASE" && record.status === "SUCCEEDED"
                );
                const releaseAttestation = reviewContext.releaseAttestations
                  .map((attestation) => getReleaseAttestation(attestation.metadata))
                  .find(Boolean);

                return (
                <div key={dispute.id} className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden">
                   
                   {/* Dispute Header */}
                   <div className="bg-surface-container-low px-5 py-4 flex items-center justify-between border-b border-outline-variant/10 flex-wrap gap-4">
                      <div>
                         <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Case #{dispute.id.slice(0, 8)}</p>
                         <h3 className="text-base font-black text-on-surface">{dispute.project.title}</h3>
                         <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                           Milestone: {dispute.milestone.title} · {formatMilestoneAmount(dispute.milestone.amount)} · Opened {formatDate(dispute.created_at)}
                         </p>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                         dispute.status === "OPEN" ? "bg-secondary/10 text-secondary border-secondary/30" :
                         "bg-tertiary/10 text-tertiary border-tertiary/30"
                      }`}>
                         {dispute.status.replace("_", " ")}
                      </span>
                   </div>

                   {/* Case Files */}
                   <div className="p-6 lg:p-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Client Issue */}
                          <div className="space-y-4">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                   <span className="material-symbols-outlined text-sm text-primary">person</span>
                                </div>
                                <div>
                                   <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Client Ledger</p>
                                   <p className="text-sm font-bold text-on-surface">{dispute.client.name || dispute.client.email}</p>
                                </div>
                             </div>
                             <div className="bg-surface-container p-4 rounded-2xl border border-error/20 border-l-[3px] border-l-error text-sm text-on-surface font-medium leading-relaxed">
                                {dispute.reason}
                             </div>
                          </div>

                          {/* Facilitator Context */}
                          <div className="space-y-4">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center border border-tertiary/20">
                                   <span className="material-symbols-outlined text-sm text-tertiary">code</span>
                                </div>
                                <div>
                                   <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Facilitator</p>
                                   <p className="text-sm font-bold text-on-surface">{dispute.facilitator.name || dispute.facilitator.email}</p>
                                </div>
                             </div>
                             <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/30 text-sm text-on-surface font-medium leading-relaxed italic text-on-surface-variant">
                                The facilitator has submitted delivery evidence and is requesting release of ${dispute.milestone.amount.toString()} against the agreed milestone terms.
                             </div>
                          </div>
                       </div>

                       <div className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                             <div>
                                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary">
                                  <span className="material-symbols-outlined text-[13px]">fact_check</span>
                                  Evidence Dossier
                                </p>
                                <p className="mt-1 text-sm font-bold text-on-surface">{reviewContext.proofPlan.summary}</p>
                                <p className="mt-1 text-xs font-medium text-on-surface-variant">
                                  Arbitration should compare the dispute claim against the locked milestone proof plan, submitted artifacts, audit result, and escrow records.
                                </p>
                             </div>
                             {reviewContext.latestAudit ? (
                               <div className="rounded-xl border border-outline-variant/20 bg-surface px-3 py-2 text-right">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Latest Audit</p>
                                  <p className={`text-lg font-black ${reviewContext.latestAudit.isPassing ? "text-tertiary" : "text-error"}`}>
                                    {reviewContext.latestAudit.score}%
                                  </p>
                               </div>
                             ) : (
                               <div className="rounded-xl border border-outline-variant/20 bg-surface px-3 py-2 text-right">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Latest Audit</p>
                                  <p className="text-xs font-bold text-on-surface-variant">Pending</p>
                               </div>
                             )}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                             {reviewContext.proofPlan.requiredArtifacts.map((artifact) => (
                               <div
                                 key={artifact.key}
                                 className={`rounded-xl border px-3 py-2 ${
                                   artifact.available
                                     ? "border-tertiary/20 bg-tertiary/10 text-tertiary"
                                     : "border-outline-variant/20 bg-surface text-on-surface-variant"
                                 }`}
                               >
                                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-[12px]">
                                      {artifact.available ? "check_circle" : "radio_button_unchecked"}
                                    </span>
                                    {artifact.label}
                                  </p>
                               </div>
                             ))}
                             <div className="rounded-xl border border-outline-variant/20 bg-surface px-3 py-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Case Files</p>
                                <p className="mt-1 text-xs font-bold text-on-surface">
                                  {reviewContext.submittedEvidence.length + dispute.attachments.length} artifact{reviewContext.submittedEvidence.length + dispute.attachments.length === 1 ? "" : "s"}
                                </p>
                             </div>
                          </div>

                          {(latestRelease || releaseAttestation) && (
                            <div className="mt-4 rounded-xl border border-tertiary/20 bg-tertiary/5 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-tertiary">
                                    <span className="material-symbols-outlined text-[13px]">verified</span>
                                    Release Attestation
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-on-surface-variant">
                                    {latestRelease
                                      ? `Payment release record: ${formatCurrencyFromCents(latestRelease.facilitatorPayoutCents)} facilitator payout.`
                                      : "Release approval was found in the immutable activity trail."}
                                  </p>
                                </div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                                  {latestRelease ? `Released ${formatIsoDate(latestRelease.createdAt)}` : "Activity record"}
                                </p>
                              </div>
                              {releaseAttestation && (
                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  {[
                                    { label: "Preview tested", value: releaseAttestation.testedPreview },
                                    { label: "Evidence reviewed", value: releaseAttestation.reviewedEvidence },
                                    { label: "Release accepted", value: releaseAttestation.acceptsPaymentRelease },
                                    { label: "Audit status", value: releaseAttestation.auditStatus || "Recorded" },
                                  ].map(({ label, value }) => (
                                    <div key={label} className="rounded-lg border border-tertiary/15 bg-surface px-3 py-2">
                                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-tertiary">
                                        <span className="material-symbols-outlined text-[12px]">
                                          {value === false ? "error" : "check_circle"}
                                        </span>
                                        {label}
                                      </p>
                                      <p className="mt-1 text-[10px] font-medium text-on-surface-variant">
                                        {formatReleaseAttestationValue(value)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {releaseAttestation?.failedAuditOverrideReason && (
                                <p className="mt-3 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2 text-xs font-medium text-on-surface-variant">
                                  Audit override reason: {releaseAttestation.failedAuditOverrideReason}
                                </p>
                              )}
                            </div>
                          )}
                       </div>

                       {dispute.status === "OPEN" && (
                          <ArbitrationPanel 
                             disputeId={dispute.id}
                             milestoneId={dispute.milestone_id}
                             appmapUrl={dispute.appmap_log_url}
                             aiReport={dispute.ai_fact_finding_report}
                             evidence={dispute.attachments.map((attachment) => ({
                                id: attachment.id,
                                name: attachment.name,
                                url: attachment.url,
                                sizeBytes: attachment.size_bytes,
                             }))}
                          />
                       )}
                   </div>
                </div>
                );
             })
          )}
       </section>
    </main>
  );
}
