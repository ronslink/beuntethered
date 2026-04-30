"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import { openDisputeWithEvidence } from "@/app/actions/dispute";
import type { DisputeEvidenceContext } from "@/lib/dispute-evidence";

interface OpenDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  milestoneId?: string;
  reviewContext?: DisputeEvidenceContext;
}

export default function OpenDisputeModal({
  isOpen,
  onClose,
  projectId,
  milestoneId,
  reviewContext,
}: OpenDisputeModalProps) {
  const [codeDoesNotRun, setCodeDoesNotRun] = useState(false);
  const [reason, setReason] = useState("");
  const [appmapFile, setAppmapFile] = useState<File | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCodeDoesNotRun(false);
      setReason("");
      setAppmapFile(null);
      setEvidenceFiles([]);
      setIsSubmitting(false);
      setShowSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Auto-close after success
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, onClose]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAppmapFile(file);
  };

  const handleEvidenceChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEvidenceFiles(Array.from(e.target.files || []).slice(0, 5));
  };

  const handleSubmit = useCallback(async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for the dispute.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("projectId", projectId);
      if (milestoneId) formData.append("milestoneId", milestoneId);
      formData.append("reason", reason);
      formData.append("codeDoesNotRun", String(codeDoesNotRun));
      if (appmapFile) formData.append("appmapLog", appmapFile);
      evidenceFiles.forEach((file) => formData.append("evidenceFiles", file));

      const res = await openDisputeWithEvidence(formData);

      if (res.success) {
        setShowSuccess(true);
      } else {
        setError(res.error || "Failed to submit dispute.");
      }
    } catch (err) {
      console.error("Dispute submission error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, milestoneId, reason, codeDoesNotRun, appmapFile, evidenceFiles]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-scrim/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-surface-container-high border border-outline-variant/30 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-error/10 blur-3xl rounded-full pointer-events-none" />

        {showSuccess ? (
          /* Success State */
          <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-tertiary/10 border-2 border-tertiary/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(var(--color-tertiary),0.4)]">
              <span
                className="material-symbols-outlined text-4xl text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-on-surface">
              Dispute Opened
            </h3>
            <p className="text-sm text-on-surface-variant mt-2 font-medium">
              The counterparty has been notified and the case is ready for arbitration review.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-error">
                  Arbitration
                </span>
                <h2 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mt-1">
                  Open Dispute
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dispute modal"
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-error/20 hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-error text-xl">error</span>
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            )}

            {reviewContext && (
              <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">fact_check</span>
                      Dispute Review Context
                    </p>
                    <p className="mt-1 text-sm font-bold text-on-surface">
                      {reviewContext.milestoneTitle}
                    </p>
                    <p className="mt-1 text-xs font-medium text-on-surface-variant">
                      {reviewContext.proofPlan.summary} · Status {reviewContext.milestoneStatus.replaceAll("_", " ").toLowerCase()}
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
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {reviewContext.proofPlan.requiredArtifacts.map((artifact) => (
                    <span
                      key={artifact.key}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                        artifact.available
                          ? "border-tertiary/20 bg-tertiary/10 text-tertiary"
                          : "border-outline-variant/20 bg-surface text-on-surface-variant"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[11px]">
                        {artifact.available ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      {artifact.label}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-xl border border-outline-variant/20 bg-surface px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Preview</p>
                    <p className="mt-1 text-xs font-bold text-on-surface">
                      {reviewContext.previewUrl ? "Submitted" : "Missing"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/20 bg-surface px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Package</p>
                    <p className="mt-1 text-xs font-bold text-on-surface">
                      {reviewContext.hasPayloadPackage ? "Submitted" : "Missing"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/20 bg-surface px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Evidence</p>
                    <p className="mt-1 text-xs font-bold text-on-surface">
                      {reviewContext.submittedEvidence.length} artifact{reviewContext.submittedEvidence.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Code Does Not Run Checkbox */}
            <div className="mb-6">
              <label className="flex items-center gap-4 p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl cursor-pointer hover:bg-surface-container transition-colors group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={codeDoesNotRun}
                    onChange={(e) => setCodeDoesNotRun(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                      codeDoesNotRun
                        ? "bg-error border-error"
                        : "border-outline-variant group-hover:border-outline"
                    }`}
                  >
                    {codeDoesNotRun && (
                      <span
                        className="material-symbols-outlined text-[14px] text-on-error"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-on-surface font-headline">
                    Code Does Not Run
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Check this if the submitted code fails to execute or build
                  </p>
                </div>
              </label>
            </div>

            {/* Appmap.log Upload */}
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-2">
                Appmap.log (Optional)
              </label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".log,.txt,text/plain"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-3 bg-surface-container-low border ${
                    appmapFile
                      ? "border-primary/50 bg-primary/5"
                      : "border-outline-variant/30 border-dashed"
                  } rounded-xl text-sm font-medium flex items-center gap-3 hover:bg-surface-container transition-colors cursor-pointer`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      appmapFile ? "text-primary" : "text-outline-variant"
                    }`}
                  >
                    {appmapFile ? "description" : "upload_file"}
                  </span>
                  <span className={appmapFile ? "text-on-surface" : "text-outline-variant"}>
                    {appmapFile ? appmapFile.name : "Upload appmap.log"}
                  </span>
                </button>
              </div>
            </div>

            {/* Evidence Uploads */}
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-2">
                Evidence Files (Optional)
              </label>
              <input
                ref={evidenceInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.zip,.log,application/pdf,image/*,text/*"
                onChange={handleEvidenceChange}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => evidenceInputRef.current?.click()}
                className={`w-full px-4 py-3 bg-surface-container-low border ${
                  evidenceFiles.length
                    ? "border-primary/50 bg-primary/5"
                    : "border-outline-variant/30 border-dashed"
                } rounded-xl text-sm font-medium flex items-center gap-3 hover:bg-surface-container transition-colors cursor-pointer`}
              >
                <span
                  className={`material-symbols-outlined ${
                    evidenceFiles.length ? "text-primary" : "text-outline-variant"
                  }`}
                >
                  attach_file
                </span>
                <span className={evidenceFiles.length ? "text-on-surface" : "text-outline-variant"}>
                  {evidenceFiles.length ? `${evidenceFiles.length} files attached` : "Attach screenshots, reports, or logs"}
                </span>
              </button>
              {evidenceFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {evidenceFiles.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="rounded-md border border-outline-variant/20 bg-surface-container px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                      {file.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reason / Description */}
            <div className="mb-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-2">
                Reason / Description
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface placeholder:text-outline-variant/50 focus:border-error/50 focus:ring-1 focus:ring-error/50 transition-all resize-none custom-scrollbar"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !reason.trim()}
                className={`
                  flex-1 px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm
                  transition-all duration-200 flex items-center justify-center gap-2
                  ${
                    !reason.trim()
                      ? "bg-surface-container text-outline-variant cursor-not-allowed"
                      : "bg-gradient-to-r from-error to-error/80 hover:scale-[1.02] text-on-error shadow-[0_8px_20px_rgba(var(--color-error),0.3)] hover:shadow-[0_12px_30px_rgba(var(--color-error),0.4)]"
                  }
                  ${isSubmitting ? "opacity-70 cursor-wait" : ""}
                `}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Dispute
                    <span className="material-symbols-outlined text-[16px]">gavel</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
