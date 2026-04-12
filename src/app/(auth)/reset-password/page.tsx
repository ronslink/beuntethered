"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/app/actions/password-reset";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-variant/30 px-4 py-12">
        <div className="w-full max-w-md text-center">
          <span className="material-symbols-outlined text-error text-5xl mb-4">error</span>
          <h1 className="text-2xl font-black text-on-surface mb-2">Invalid reset link</h1>
          <p className="text-on-surface-variant mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/login" className="text-primary font-bold hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    
    if (!token) {
      setError("Invalid token");
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Something went wrong");
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-variant/30 px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-tertiary/10 border border-tertiary/20 mb-6">
            <span className="material-symbols-outlined text-tertiary text-3xl">check_circle</span>
          </div>
          <h1 className="text-3xl font-black font-headline text-on-surface mb-2">Password updated</h1>
          <p className="text-on-surface-variant mb-8">
            Your password has been changed. You can now sign in.
          </p>
          <Link
            href="/login"
            className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            Sign in
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
          <h1 className="text-3xl font-black font-headline text-on-surface">Set new password</h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Choose a strong password for your account
          </p>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                placeholder="Repeat password"
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
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-surface-variant/30 px-4 py-12"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}