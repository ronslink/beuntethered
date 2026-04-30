"use client";

import { useState } from "react";
import OpenDisputeModal from "./OpenDisputeModal";
import type { DisputeEvidenceContext } from "@/lib/dispute-evidence";

interface OpenDisputeButtonProps {
  projectId: string;
  milestoneId?: string;
  reviewContext?: DisputeEvidenceContext;
  label?: string;
}

export default function OpenDisputeButton({
  projectId,
  milestoneId,
  reviewContext,
  label = "Open Dispute",
}: OpenDisputeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-error/10 hover:bg-error/20 text-error px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2 border border-error/30"
      >
        <span className="material-symbols-outlined text-[16px]">gavel</span>
        {label}
      </button>

      <OpenDisputeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        milestoneId={milestoneId}
        reviewContext={reviewContext}
      />
    </>
  );
}
