"use client";

import { useState, useTransition } from "react";
import type { VerificationStatus, VerificationType } from "@prisma/client";
import { reviewManualVerification } from "@/app/actions/verification-admin";

type ReviewItem = {
  id: string;
  type: VerificationType;
  status: VerificationStatus;
  evidence: unknown;
  updatedAt: string;
  user: {
    name: string | null;
    email: string;
    role: string;
    portfolioUrl?: string | null;
    companyName?: string | null;
    companyType?: string | null;
  };
};

function evidenceValue(evidence: unknown, key: string) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return null;
  const record = evidence as Record<string, unknown>;
  const profileEvidence = record.profile_evidence && typeof record.profile_evidence === "object"
    ? record.profile_evidence as Record<string, unknown>
    : null;
  const value = record[key] ?? profileEvidence?.[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : null;
}

function statusClasses(status: VerificationStatus) {
  if (status === "VERIFIED") return "border-tertiary/30 bg-tertiary/10 text-tertiary";
  if (status === "REJECTED") return "border-error/30 bg-error/10 text-error";
  return "border-secondary/30 bg-secondary/10 text-secondary";
}

export default function ManualVerificationReviewPanel({ item }: { item: ReviewItem }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const portfolioUrl = item.user.portfolioUrl || evidenceValue(item.evidence, "portfolio_url");
  const website = evidenceValue(item.evidence, "website");
  const billingEmail = evidenceValue(item.evidence, "billing_email");
  const hasBio = evidenceValue(item.evidence, "has_bio");
  const skillsCount = evidenceValue(item.evidence, "skills_count");
  const aiToolCount = evidenceValue(item.evidence, "ai_tool_count");
  const isPortfolioReview = item.type === "PORTFOLIO";

  const submit = (status: "VERIFIED" | "REJECTED") => {
    setMessage("");
    startTransition(async () => {
      const result = await reviewManualVerification({ verificationId: item.id, status, note });
      setMessage(result.success ? "Review saved." : result.error || "Review failed.");
      if (result.success) setNote("");
    });
  };

  return (
    <article className="rounded-2xl border border-outline-variant/20 bg-surface overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/10 bg-surface-container-low px-5 py-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
            {item.type.toLowerCase()} verification
          </p>
          <h2 className="mt-1 text-base font-black text-on-surface">
            {item.user.name || item.user.email}
          </h2>
          <p className="mt-0.5 text-xs font-bold text-on-surface-variant">
            {item.user.role.toLowerCase()} · {item.user.email}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${statusClasses(item.status)}`}>
          {item.status.toLowerCase()}
        </span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {isPortfolioReview ? (
              <>
                <EvidenceMetric label="Portfolio URL" value={portfolioUrl || "Not listed"} />
                <EvidenceMetric label="Bio evidence" value={hasBio === "true" ? "Present" : "Missing"} />
                <EvidenceMetric label="Skills listed" value={skillsCount ?? "0"} />
                <EvidenceMetric label="AI tools listed" value={aiToolCount ?? "0"} />
              </>
            ) : (
              <>
                <EvidenceMetric label="Company" value={item.user.companyName || "Not listed"} />
                <EvidenceMetric label="Type" value={item.user.companyType || "Not listed"} />
                <EvidenceMetric label="Billing email" value={billingEmail || "Not listed"} />
              </>
            )}
            <EvidenceMetric label="Updated" value={new Date(item.updatedAt).toLocaleString()} />
          </div>

          {portfolioUrl || website ? (
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Review links</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {portfolioUrl ? <EvidenceLink href={portfolioUrl} label="Portfolio" /> : null}
                {website ? <EvidenceLink href={website} label="Company website" /> : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
              Review note
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-primary/50"
              placeholder="Add a short reason for approval or rejection."
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => submit("REJECTED")}
              className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-error disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => submit("VERIFIED")}
              className="rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary disabled:opacity-50"
            >
              Approve
            </button>
          </div>

          {message ? <p className="text-xs font-bold text-on-surface-variant">{message}</p> : null}
        </div>
      </div>
    </article>
  );
}

function EvidenceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-on-surface">{value}</p>
    </div>
  );
}

function EvidenceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-xs font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
    >
      {label}
      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
    </a>
  );
}
