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
  const [showPassword, setShowPassword] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error/10 border border-error/20 mb-5">
            <span className="material-symbols-outlined text-error text-3xl">link_off</span>
          </div>
          <h1 className="text-2xl font-black font-headline text-on-surface mb-2">Invalid reset link</h1>
          <p className="text-on-surface-variant text-sm mb-6">This link is invalid or has expired. Request a new one.</p>
          <Link href="/forgot-password" className="bg-primary text-on-primary font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const result = await resetPassword(token!, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Something went wrong.");
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
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-5 shadow-lg ${done ? "bg-tertiary/10 border-tertiary/30" : "bg-surface-container-low border-outline-variant/30"}`}>
            <span className={`material-symbols-outlined text-3xl ${done ? "text-tertiary" : "text-primary"}`} style={{ fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
              {done ? "check_circle" : "lock_reset"}
            </span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tighter text-on-surface">
            {done ? "Password updated!" : "Set new password"}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1.5 font-medium">
            {done ? "You can now sign in with your new password." : "Choose a strong, unique password."}
          </p>
        </div>

        {done ? (
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-widest hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20"
            >
              Sign In
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="bg-surface/70 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8}
                    className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3.5 pr-11 rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all"
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-[18px]">{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Confirm password</label>
                <input
                  type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)} required
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3.5 rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all"
                  placeholder="Repeat password"
                />
              </div>

              {error && (
                <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 flex items-center gap-2.5 animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-error text-[16px]">error</span>
                  <p className="text-error text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-on-surface text-surface font-black py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Updating...</>
                ) : "Update Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}