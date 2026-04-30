"use client";

import { useState } from "react";
import { resolveDisputeForClient, resolveDisputeForFacilitator } from "@/app/actions/arbitration";

interface ArbitrationPanelProps {
  disputeId: string;
  milestoneId: string;
  appmapUrl?: string | null;
  aiReport?: string | null;
  evidence?: {
    id: string;
    name: string;
    url: string;
    sizeBytes: number | null;
  }[];
}

type ParsedAiReport = {
  standing: string;
  confidence: number | null;
  summary: string;
  keyFindings: string[];
  reviewedArtifacts: string[];
  evidenceGaps: string[];
  recommendation: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function parseAiReport(aiReport?: string | null): ParsedAiReport | null {
  if (!aiReport) return null;
  try {
    const parsed = JSON.parse(aiReport) as Record<string, unknown>;
    return {
      standing: typeof parsed.standing === "string" ? parsed.standing : "INCONCLUSIVE",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      keyFindings: stringList(parsed.key_findings),
      reviewedArtifacts: stringList(parsed.reviewed_artifacts),
      evidenceGaps: stringList(parsed.evidence_gaps),
      recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : "",
    };
  } catch {
    return null;
  }
}

function standingStyles(standing: string) {
  if (standing === "CLIENT") return "border-error/30 bg-error/10 text-error";
  if (standing === "FACILITATOR") return "border-tertiary/30 bg-tertiary/10 text-tertiary";
  return "border-secondary/30 bg-secondary/10 text-secondary";
}

export default function ArbitrationPanel({ disputeId, appmapUrl, aiReport, evidence = [] }: ArbitrationPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const appmapEvidence = evidence.find((attachment) => attachment.url === appmapUrl);
  const appmapHref = appmapEvidence ? `/api/attachments/${appmapEvidence.id}` : appmapUrl;
  const parsedAiReport = parseAiReport(aiReport);

  const executeRefund = async () => {
    if (resolutionNote.trim().length < 12) {
      setErrorStatus("Add a short arbitration note explaining the evidence behind this ruling.");
      return;
    }
    if (!confirm("Refunding this milestone returns the escrowed funds to the client and closes the dispute in the client's favor. Continue?")) return;
    setIsExecuting(true);
    setErrorStatus(null);

    const res = await resolveDisputeForClient(disputeId, resolutionNote);
    if (!res.success) setErrorStatus(res.error);
    setIsExecuting(false);
  };

  const executePayout = async () => {
    if (resolutionNote.trim().length < 12) {
      setErrorStatus("Add a short arbitration note explaining the evidence behind this ruling.");
      return;
    }
    if (!confirm("Releasing this milestone pays the facilitator and closes the dispute in the facilitator's favor. Continue?")) return;
    setIsExecuting(true);
    setErrorStatus(null);

    const res = await resolveDisputeForFacilitator(disputeId, resolutionNote);
    if (!res.success) setErrorStatus(res.error);
    setIsExecuting(false);
  };

  return (
    <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-8">
      <h3 className="text-xl font-bold font-headline text-on-surface mb-6 flex items-center gap-3 border-b border-outline-variant/20 pb-4">
        <span className="material-symbols-outlined text-error">gavel</span>
        Platform Arbitration Review
      </h3>

      {errorStatus && (
         <div className="bg-error/10 border border-error/50 p-4 rounded-xl mb-6 text-sm font-medium text-error">
            {errorStatus}
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
           <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Discovery Logs</h4>
           {appmapHref ? (
              <a href={appmapHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container transition-colors group cursor-pointer">
                  <span className="material-symbols-outlined text-primary">data_object</span>
                  <span className="text-sm font-medium text-on-surface">Inspect AppMap Trace</span>
                  <span className="material-symbols-outlined text-on-surface-variant ml-auto text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </a>
           ) : (
              <div className="p-4 rounded-xl border border-dashed border-outline-variant/50 text-sm italic text-on-surface-variant">No AppMap trace was provided.</div>
           )}
           {evidence.length > 0 && (
              <div className="mt-3 space-y-2">
                {evidence.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={`/api/attachments/${attachment.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm font-medium text-on-surface transition-colors hover:border-primary/40"
                  >
                    <span className="material-symbols-outlined text-primary text-[18px]">attach_file</span>
                    <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                    {attachment.sizeBytes && (
                      <span className="shrink-0 text-xs text-on-surface-variant">{formatBytes(attachment.sizeBytes)}</span>
                    )}
                  </a>
                ))}
              </div>
           )}
           {!appmapUrl && evidence.length === 0 && (
              <p className="mt-3 text-xs font-medium text-on-surface-variant">No additional evidence files are attached to this case.</p>
           )}
        </div>

        <div>
           <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">AI Fact Finding</h4>
           {parsedAiReport ? (
              <div className="space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${standingStyles(parsedAiReport.standing)}`}>
                    {parsedAiReport.standing} Standing
                  </span>
                  {parsedAiReport.confidence !== null && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {parsedAiReport.confidence}% confidence
                    </span>
                  )}
                </div>
                {parsedAiReport.summary && (
                  <p className="text-sm font-medium leading-relaxed text-on-surface">
                    {parsedAiReport.summary}
                  </p>
                )}
                {parsedAiReport.keyFindings.length > 0 && (
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Key Findings</p>
                    <div className="space-y-1.5">
                      {parsedAiReport.keyFindings.map((finding) => (
                        <p key={finding} className="flex gap-1.5 text-xs font-medium text-on-surface-variant">
                          <span className="material-symbols-outlined mt-0.5 text-[12px] text-primary">fact_check</span>
                          {finding}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {parsedAiReport.reviewedArtifacts.length > 0 && (
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Reviewed Artifacts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedAiReport.reviewedArtifacts.map((artifact) => (
                        <span key={artifact} className="rounded-md border border-outline-variant/20 bg-surface px-2 py-1 text-[9px] font-bold text-on-surface-variant">
                          {artifact}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {parsedAiReport.evidenceGaps.length > 0 && (
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-error">Evidence Gaps</p>
                    <div className="space-y-1.5">
                      {parsedAiReport.evidenceGaps.map((gap) => (
                        <p key={gap} className="flex gap-1.5 text-xs font-medium text-on-surface-variant">
                          <span className="material-symbols-outlined mt-0.5 text-[12px] text-error">priority_high</span>
                          {gap}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {parsedAiReport.recommendation && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-bold text-on-surface">
                    {parsedAiReport.recommendation}
                  </div>
                )}
              </div>
           ) : aiReport ? (
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 max-h-48 overflow-y-auto">
                 <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{aiReport}</p>
              </div>
           ) : (
              <div className="p-4 rounded-xl border border-dashed border-outline-variant/50 text-sm italic text-tertiary">No AI fact-finding report is available yet.</div>
           )}
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Arbitration Note
        </label>
        <textarea
          value={resolutionNote}
          onChange={(event) => setResolutionNote(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Summarize the evidence reviewed and why the ruling favors the client or facilitator."
          className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface p-3 text-sm font-medium text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary/50"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-on-surface-variant">
            This note is stored with the payment record, activity log, and party notifications.
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {resolutionNote.trim().length}/1000
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-outline-variant/20 pt-6">
        <button 
           onClick={executeRefund}
           disabled={isExecuting || resolutionNote.trim().length < 12}
           className="flex-1 bg-surface-container-high text-on-surface hover:bg-error hover:text-white transition-all px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs border border-outline-variant/30 disabled:opacity-50"
        >
           {isExecuting ? "Refunding..." : "Refund Client"}
        </button>

        <button 
           onClick={executePayout}
           disabled={isExecuting || resolutionNote.trim().length < 12}
           className="flex-1 bg-primary text-on-primary hover:bg-primary/90 transition-all px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 disabled:opacity-50"
        >
           {isExecuting ? "Releasing..." : "Release to Facilitator"}
        </button>
      </div>
    </div>
  );
}
