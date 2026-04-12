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
      setError(result.error);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-variant/30 px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">mail</span>
          </div>
          <h1 className="text-3xl font-black font-headline text-on-surface mb-2">Check your email</h1>
          <p className="text-on-surface-variant mb-8 leading-relaxed">
            If an account with that email exists, we've sent a password reset link.
            Check your inbox (and spam folder).
          </p>
          <Link href="/login" className="text-primary font-bold hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-variant/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">lock_reset</span>
          </div>
          <h1 className="text-3xl font-black font-headline text-on-surface">Forgot password</h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="text-error text-sm font-medium bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Remember your password?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}