"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/password-reset";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to send reset link.");
    } else {
      setDone(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-low border border-outline-variant/30 mb-5 shadow-lg">
            <span className="material-symbols-outlined text-primary text-3xl">lock_reset</span>
          </div>
          {done ? (
            <>
              <h1 className="text-3xl font-black font-headline tracking-tighter text-on-surface">Check your email</h1>
              <p className="text-on-surface-variant text-sm mt-2 font-medium max-w-xs mx-auto leading-relaxed">
                If an account exists for <strong className="text-on-surface">{email}</strong>, a reset link is on its way. Check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-6 text-sm font-bold text-primary hover:underline underline-offset-4"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black font-headline tracking-tighter text-on-surface">Forgot password?</h1>
              <p className="text-on-surface-variant text-sm mt-1.5 font-medium">Enter your email and we'll send a reset link</p>
            </>
          )}
        </div>

        {!done && (
          <div className="bg-surface/70 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                  Email address
                </label>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3.5 rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-error text-[16px]">error</span>
                  <p className="text-error text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-on-surface text-surface font-black py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Sending...</>
                ) : "Send Reset Link"}
              </button>
            </form>

            <p className="text-center text-sm text-on-surface-variant mt-6">
              Remember your password?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline underline-offset-4">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}