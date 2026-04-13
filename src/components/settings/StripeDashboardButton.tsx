"use client";

import { useState } from "react";
import { createStripeLoginLink } from "@/app/actions/stripe";

export default function StripeDashboardButton({ hasStripeAccount }: { hasStripeAccount: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleRedirect = async () => {
    if (!hasStripeAccount) {
       alert("You do not have an active Stripe Express account connected to Untether Exchange yet.");
       return;
    }

    setLoading(true);
    try {
      const res = await createStripeLoginLink();
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        alert(res.error || "Failed to generate Stripe dashboard link.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
       onClick={handleRedirect}
       disabled={loading || !hasStripeAccount} 
       className={`transition-colors px-6 py-3 rounded-xl flex items-center gap-3 border border-outline-variant/30 ${!hasStripeAccount ? 'bg-surface-container-low text-on-surface opacity-70 cursor-not-allowed' : 'bg-surface-container-high text-on-surface hover:bg-surface-container hover:border-primary/50 cursor-pointer shadow-sm active:scale-95'}`}
    >
        <span className="material-symbols-outlined text-primary">
            {loading ? "sync" : "account_balance"}
        </span>
        <span className="font-bold font-headline text-sm tracking-widest uppercase">
            {loading ? "Resolving Bridge..." : "Manage Stripe Dashboard"}
        </span>
    </button>
  );
}
