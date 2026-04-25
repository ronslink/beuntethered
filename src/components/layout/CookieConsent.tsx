"use client";

import { useState, useEffect } from "react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if consent hasn't been given yet
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-surface/90 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">cookie</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-on-surface mb-1">Cookies</p>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              We use essential cookies only for authentication and security. No tracking or advertising cookies.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={accept}
                className="px-5 py-2 bg-primary text-on-primary text-xs font-black uppercase tracking-widest rounded-lg hover:-translate-y-0.5 transition-all active:scale-95"
              >
                Got it
              </button>
              <a href="/privacy" className="text-[10px] font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
