"use client";

import { useState } from "react";
import { submitMilestonePayload } from "@/app/actions/milestones";
import { useRouter } from "next/navigation";
import { calculateMilestoneFees, formatCents } from "@/lib/platform-fees";
import { getReviewReleaseState } from "@/lib/review-release-rules";

export function FacilitatorSubmitGateway({ milestoneId }: { milestoneId: string }) {
  const [loading, setLoading] = useState(false);
  const [payloadName, setPayloadName] = useState("Payload");
  const [evidenceNames, setEvidenceNames] = useState<string[]>([]);

  const handleAction = async (formData: FormData) => {
    setLoading(true);
    try {
      const res = await submitMilestonePayload(formData);
      if (!res.success) {
        alert("Submission failed: " + res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form action={handleAction} className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-primary/20 bg-surface-container-low p-4">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input
        type="url"
        name="previewUrl"
        placeholder="https://preview.vercel.app"
        required
        className="w-full px-4 py-2 bg-surface-variant/50 text-on-surface border-none rounded-xl focus:ring-2 focus:ring-primary text-sm"
      />
      <textarea
        name="evidenceSummary"
        required
        minLength={20}
        rows={3}
        placeholder="Summarize what changed and how the submission satisfies the acceptance criteria..."
        className="w-full resize-none rounded-xl bg-surface-variant/50 px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary"
      />
      <p className="text-[10px] font-medium leading-relaxed text-on-surface-variant">
        Include the review path, any setup notes, and which acceptance checks the buyer should verify before release.
      </p>

      <div className="flex flex-wrap gap-2 w-full">
        <label className="relative cursor-pointer bg-surface-variant/30 hover:bg-surface-variant text-on-surface-variant px-5 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-colors shrink-0 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">folder_zip</span>
            <span className="max-w-[140px] truncate">{payloadName}</span>
            <input
              type="file"
              name="payloadZip"
              accept=".zip,.tar.gz"
              required
              onChange={(event) => setPayloadName(event.target.files?.[0]?.name || "Payload")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </label>
        <label className="relative cursor-pointer bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant px-5 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-colors shrink-0 flex items-center gap-2 border border-outline-variant/20">
            <span className="material-symbols-outlined text-lg">fact_check</span>
            <span className="max-w-[160px] truncate">
              {evidenceNames.length ? `${evidenceNames.length} Evidence Files` : "Evidence"}
            </span>
            <input
              type="file"
              name="evidenceFiles"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.log,application/pdf,image/*,text/*"
              onChange={(event) => setEvidenceNames(Array.from(event.target.files || []).map((file) => file.name))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </label>

        <button
            type="submit"
            disabled={loading}
            className={`ml-auto bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-primary/20 transition-all shrink-0 ${loading ? 'opacity-50' : 'hover:-translate-y-0.5'}`}
        >
            {loading ? "Submitting..." : "Submit Code"}
        </button>
      </div>
      {evidenceNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {evidenceNames.slice(0, 5).map((name) => (
            <span key={name} className="rounded-md border border-outline-variant/20 bg-surface/60 px-2 py-1 text-[10px] font-bold text-on-surface-variant">
              {name}
            </span>
          ))}
        </div>
      )}
    </form>
  );
}

export function ClientReviewGateway({
  milestoneId,
  previewUrl,
  amount,
  isByoc,
  aiAuditStatus = "NONE"
}: {
  milestoneId: string,
  previewUrl: string,
  amount: number,
  isByoc: boolean,
  aiAuditStatus?: "PENDING" | "SUCCESS" | "FAILED" | "NONE"
}) {
  const [loading, setLoading] = useState(false);
  const [testedPreview, setTestedPreview] = useState(false);
  const [reviewedEvidence, setReviewedEvidence] = useState(false);
  const [acceptsRelease, setAcceptsRelease] = useState(false);
  const [failedAuditOverrideAccepted, setFailedAuditOverrideAccepted] = useState(false);
  const [failedAuditOverrideReason, setFailedAuditOverrideReason] = useState("");
  const router = useRouter();
  const fees = calculateMilestoneFees({ amount, isByoc });
  const releaseState = getReviewReleaseState({
    testedPreview,
    reviewedEvidence,
    acceptsRelease,
    auditStatus: aiAuditStatus,
    failedAuditOverrideAccepted,
    failedAuditOverrideReason,
  });

  const handleApprove = async () => {
    if (!releaseState.canRelease) {
      alert(releaseState.reason ?? "Complete the approval checklist before releasing escrow.");
      return;
    }
    if (aiAuditStatus === "FAILED") {
       if (!confirm("The AI delivery audit did not verify all acceptance criteria. You can still approve this milestone, but doing so releases payment and accepts the submitted deliverable. Continue?")) return;
    }
    if (!confirm("Approving releases the milestone payment to the facilitator and unlocks the source payload for you. Continue?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/release-escrow", {
        method: "POST",
        body: JSON.stringify({
          milestoneId,
          approvalAttestation: {
            testedPreview,
            reviewedEvidence,
            acceptsPaymentRelease: acceptsRelease,
            auditStatus: aiAuditStatus,
            acceptedAt: new Date().toISOString(),
            ...(aiAuditStatus === "FAILED"
              ? {
                  failedAuditOverrideAccepted,
                  failedAuditOverrideReason,
                }
              : {}),
          },
        }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        alert("Payment released. Source download is now available.");
        router.refresh();
      } else {
        alert("Payment release failed: " + data.error);
      }
    } catch {
      alert("Network error while releasing payment.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-tertiary/10 p-5 rounded-2xl border border-tertiary/30 w-full max-w-2xl relative overflow-hidden">

        {/* AI Audit Banner Overlay */}
        {aiAuditStatus !== "NONE" && (
           <div className={`absolute top-0 left-0 right-0 h-1 flex`}>
              <div className={`h-full flex-1 ${aiAuditStatus === 'SUCCESS' ? 'bg-green-500' : aiAuditStatus === 'FAILED' ? 'bg-error' : 'bg-amber-500 animate-pulse'}`} />
           </div>
        )}

        <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
               <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary">Staging Ready</p>
               {aiAuditStatus === "SUCCESS" && (
                 <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-green-500/20 text-green-600 border border-green-500/30 flex items-center gap-1">
                   <span className="material-symbols-outlined text-[11px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span> Audit Passed
                 </span>
               )}
               {aiAuditStatus === "FAILED" && (
                 <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-error/20 text-error border border-error/30 flex items-center gap-1">
                   <span className="material-symbols-outlined text-[11px]" style={{fontVariationSettings: "'FILL' 1"}}>warning</span> Audit Failed
                 </span>
               )}
               {aiAuditStatus === "PENDING" && (
                 <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center gap-1">
                   <span className="material-symbols-outlined text-[11px] animate-spin">sync</span> Audit Running...
                 </span>
               )}
            </div>

            {aiAuditStatus === "FAILED" ? (
               <p className="text-sm font-medium text-error leading-snug max-w-md">
                 The AI-assisted audit report flagged that this deliverable does <strong className="font-bold">not</strong> meet the locked Acceptance Criteria. Please review carefully.
               </p>
            ) : aiAuditStatus === "PENDING" ? (
               <p className="text-sm font-medium text-on-surface leading-snug max-w-md">
                 The delivery audit is still running. Review the preview now, then release escrow after the audit report is available.
               </p>
            ) : (
               <p className="text-sm font-medium text-on-surface">The facilitator has deployed the application. Test it thoroughly.</p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 max-w-md">
              <div className="rounded-lg border border-outline-variant/20 bg-surface/50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Escrow</p>
                <p className="text-xs font-black text-on-surface">{formatCents(fees.grossAmountCents)}</p>
              </div>
              <div className="rounded-lg border border-outline-variant/20 bg-surface/50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Platform Fee</p>
                <p className="text-xs font-black text-on-surface">{formatCents(fees.platformFeeCents)}</p>
              </div>
              <div className="rounded-lg border border-outline-variant/20 bg-surface/50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Payout</p>
                <p className="text-xs font-black text-tertiary">{formatCents(fees.facilitatorPayoutCents)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 max-w-xl">
              <label className="flex items-start gap-2 rounded-lg border border-outline-variant/20 bg-surface/50 px-3 py-2 text-xs font-medium text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={testedPreview}
                  onChange={(event) => setTestedPreview(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span>I tested the preview and can access the submitted deliverable.</span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-outline-variant/20 bg-surface/50 px-3 py-2 text-xs font-medium text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={reviewedEvidence}
                  onChange={(event) => setReviewedEvidence(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span>I reviewed the proof package, audit result, and acceptance checks.</span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-outline-variant/20 bg-surface/50 px-3 py-2 text-xs font-medium text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={acceptsRelease}
                  onChange={(event) => setAcceptsRelease(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span>I understand approval releases escrow, accepts the work, and transfers IP according to the agreement.</span>
              </label>
              {aiAuditStatus === "FAILED" && (
                <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-3">
                  <label className="flex items-start gap-2 text-xs font-medium text-error">
                    <input
                      type="checkbox"
                      checked={failedAuditOverrideAccepted}
                      onChange={(event) => setFailedAuditOverrideAccepted(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-error)]"
                    />
                    <span>I accept this delivery despite the failed audit and want to release escrow.</span>
                  </label>
                  <textarea
                    value={failedAuditOverrideReason}
                    onChange={(event) => setFailedAuditOverrideReason(event.target.value)}
                    maxLength={1000}
                    placeholder="Explain why the delivery is acceptable despite the audit finding."
                    className="mt-3 min-h-20 w-full rounded-lg border border-error/20 bg-surface px-3 py-2 text-xs font-medium text-on-surface outline-none transition focus:border-error/50"
                  />
                </div>
              )}
            </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            <a
                href={previewUrl}
                target="_blank"
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all border border-outline-variant/30 shrink-0"
            >
                <span className="material-symbols-outlined text-[16px]">captive_portal</span>
                Test App
            </a>

            <button
                onClick={handleApprove}
                disabled={loading || !releaseState.canRelease}
                className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-secondary/20 transition-all shrink-0 ${loading || !releaseState.canRelease ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-80' : 'bg-secondary text-secondary-container-on hover:-translate-y-0.5'}`}
            >
                {loading ? "Releasing..." : releaseState.label}
            </button>
        </div>
    </div>
  );
}

export function ClientFundGateway({ milestoneId, amount, isByoc }: { milestoneId: string, amount: number, isByoc: boolean }) {
  const [loading, setLoading] = useState(false);
  const fees = calculateMilestoneFees({ amount, isByoc });

  const handleFund = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ milestoneId }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.url) {
         window.location.href = data.url;
      } else {
         alert("Checkout could not start: " + (data.error || "Please try again."));
         setLoading(false);
      }
    } catch {
      alert("Network error while opening checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-primary/5 p-5 rounded-2xl border border-primary/20 w-full">
        <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Milestone Escrow</p>
            <p className="text-sm font-medium text-on-surface leading-relaxed max-w-sm">Funds are held in Stripe escrow. The facilitator is paid only after you approve the submitted deliverable.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 max-w-md">
              <div className="rounded-lg border border-outline-variant/20 bg-surface/60 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Milestone</p>
                <p className="text-xs font-black text-on-surface">{formatCents(fees.grossAmountCents)}</p>
              </div>
              <div className="rounded-lg border border-outline-variant/20 bg-surface/60 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Client Fee</p>
                <p className="text-xs font-black text-on-surface">{formatCents(fees.platformFeeCents)}</p>
              </div>
              <div className="rounded-lg border border-outline-variant/20 bg-surface/60 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Due Now</p>
                <p className="text-xs font-black text-primary">{formatCents(fees.clientTotalCents)}</p>
              </div>
            </div>
        </div>

        <div className="flex items-center w-full sm:w-auto">
            <button
                onClick={handleFund}
                disabled={loading}
                className={`bg-primary w-full sm:w-auto text-on-primary px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50' : 'hover:-translate-y-0.5 active:scale-95'}`}
            >
                <span className="material-symbols-outlined text-[16px]">{loading ? 'hourglass_empty' : 'lock'}</span>
                {loading ? "Opening Checkout..." : "Fund Milestone"}
            </button>
        </div>
    </div>
  );
}
