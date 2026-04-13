"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-low border border-outline-variant/30 mb-5 shadow-lg">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tighter text-on-surface">Welcome back</h1>
          <p className="text-on-surface-variant text-sm mt-1.5 font-medium">Sign in to your Untether account</p>
        </div>

        {/* Card */}
        <div className="bg-surface/70 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                Email address
              </label>
              <input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3.5 rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[10px] font-bold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={8}
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3.5 pr-11 rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
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
                <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Signing in...</>
              ) : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/20" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">or continue with</span>
            </div>
          </div>

          {/* GitHub OAuth */}
          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="w-full bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 text-sm hover:border-outline-variant/60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline underline-offset-4">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
