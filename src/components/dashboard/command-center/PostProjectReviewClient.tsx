"use client";

import { useState, useTransition } from "react";
import ReviewModal from "@/components/dashboard/ReviewModal";
import { submitClientReview } from "@/app/actions/reviews";

interface PostProjectReviewClientProps {
  projectId: string;
  facilitatorId: string;
  facilitatorName: string;
  facilitatorAvatar?: string;
}

export default function PostProjectReviewClient({
  projectId,
  facilitatorId,
  facilitatorName,
  facilitatorAvatar,
}: PostProjectReviewClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleReviewSubmit = async (data: { rating: number; review: string }) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const res = await submitClientReview({
          projectId,
          facilitatorId,
          rating: data.rating,
          feedback: data.review,
        });

        if (res.success) {
          resolve();
        } else {
          console.error("Review bounded execution failed:", res.error);
          reject(res.error);
        }
      });
    });
  };

  return (
    <div className="mt-8 flex justify-center">
      <button
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        className="px-8 py-3.5 rounded-full bg-gradient-to-r from-tertiary to-tertiary/90 text-on-tertiary font-black font-headline uppercase tracking-widest text-sm shadow-[0_8px_20px_rgba(var(--color-tertiary),0.3)] hover:shadow-tertiary/50 hover:scale-105 active:scale-95 transition-all w-full max-w-sm"
      >
        {isPending ? "Submitting Review..." : "Leave Final Review"}
      </button>

      <ReviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleReviewSubmit}
        facilitatorName={facilitatorName}
        facilitatorAvatar={facilitatorAvatar}
      />
    </div>
  );
}
