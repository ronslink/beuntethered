"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { sendSystemNotification } from "@/app/actions/notifications";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { rating: number; review: string }) => Promise<void>;
  facilitatorName: string;
  facilitatorAvatar?: string;
  facilitatorId?: string;
}

export default function ReviewModal({
  isOpen,
  onClose,
  onSubmit,
  facilitatorName,
  facilitatorAvatar,
  facilitatorId,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRating(0);
      setHoverRating(0);
      setReview("");
      setIsSubmitting(false);
      setShowSuccess(false);
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

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      // Send notification to facilitator
      if (facilitatorId) {
        await sendSystemNotification(facilitatorId, `You received a ${rating}-star review from a client${review ? `: "${review.slice(0, 50)}${review.length > 50 ? '...' : ''}"` : ''}`, "MILESTONE");
      }

      await onSubmit({ rating, review });
      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, review, facilitatorId, onSubmit]);

  const handleSkip = () => {
    onClose();
  };

  const displayedRating = hoverRating || rating;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-scrim/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="bg-surface-container-high border border-outline-variant/30 rounded-3xl p-8 w-full max-w-lg relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-tertiary/10 blur-3xl rounded-full pointer-events-none" />
        
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
              Review Submitted
            </h3>
            <p className="text-sm text-on-surface-variant mt-2 font-medium">
              Thanks for your feedback!
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-tertiary">
                  End of Contract
                </span>
                <h2 className="text-xl font-black font-headline uppercase tracking-tight text-on-surface mt-1">
                  Review Your Facilitator
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-error/20 hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Facilitator Info */}
            <div className="flex items-center gap-4 mb-8 p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border-2 border-outline-variant/30">
                {facilitatorAvatar ? (
                  <Image
                    src={facilitatorAvatar}
                    alt={facilitatorName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                    person
                  </span>
                )}
              </div>
              <div>
                <p className="font-black text-on-surface font-headline tracking-tight">
                  {facilitatorName}
                </p>
                <p className="text-xs text-on-surface-variant font-medium">
                  Facilitator
                </p>
              </div>
            </div>

            {/* Star Rating */}
            <div className="mb-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-4">
                Rate Your Experience
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                      transition-all duration-150 ease-out
                      ${displayedRating >= star 
                        ? 'bg-tertiary/20 text-tertiary shadow-[0_0_20px_rgba(var(--color-tertiary),0.3)] scale-110' 
                        : 'bg-surface-container text-outline-variant hover:bg-surface-container-high'
                      }
                      ${hoverRating > 0 && star <= hoverRating ? 'scale-110' : ''}
                    `}
                  >
                    <span 
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: displayedRating >= star ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-3 text-lg font-black text-on-surface">
                    {rating}.0
                  </span>
                )}
              </div>
            </div>

            {/* Text Review */}
            <div className="mb-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-2">
                Written Feedback
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="How was your experience working together?"
                rows={4}
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-4 text-sm font-medium text-on-surface placeholder:text-outline-variant/50 focus:border-tertiary/50 focus:ring-1 focus:ring-tertiary/50 transition-all resize-none custom-scrollbar"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className={`
                  flex-1 px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm
                  transition-all duration-200 flex items-center justify-center gap-2
                  ${rating === 0 
                    ? 'bg-surface-container text-outline-variant cursor-not-allowed' 
                    : 'bg-gradient-to-r from-tertiary to-tertiary/80 hover:scale-[1.02] text-on-tertiary shadow-[0_8px_20px_rgba(var(--color-tertiary),0.3)] hover:shadow-[0_12px_30px_rgba(var(--color-tertiary),0.4)]'
                  }
                  ${isSubmitting ? 'opacity-70 cursor-wait' : ''}
                `}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Review
                    <span className="material-symbols-outlined text-[16px]">send</span>
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
