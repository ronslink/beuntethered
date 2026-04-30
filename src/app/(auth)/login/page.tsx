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
    <div className="min-h-screen flex bg-surface relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      {/* Left Panel — Value Proposition */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-center px-16 xl:px-24 relative z-10">
        <div className="max-w-lg">
          <Link href="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
            </div>
            <span className="font-black font-headline text-sm tracking-tight text-on-surface">Untether</span>
          </Link>
          <h1 className="text-4xl xl:text-5xl font-black font-headline tracking-tighter text-on-surface leading-[0.95] mb-6">
            Stop paying for hours.
            <br />
            <span className="text-on-surface-variant">Start paying for results.</span>
          </h1>
          <p className="text-on-surface-variant leading-relaxed mb-10 max-w-md">
            AI-assisted scopes. Stripe Escrow. Zero facilitator fees.
            The marketplace where verified software facilitators build with confidence.
          </p>
          <div className="flex items-center gap-8">
            {[
              { value: "0%", label: "Facilitator Fees" },
              { value: "8%", label: "Client Premium" },
              { value: "100%", label: "Escrow Protected" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-black font-headline text-primary tracking-tighter">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Mobile brand */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-low border border-outline-variant/30 mb-5 shadow-lg">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
            </div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-on-surface">Welcome back</h1>
            <p className="text-on-surface-variant text-sm mt-1.5 font-medium">Sign in to your Untether account</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-black font-headline tracking-tighter text-on-surface">Welcome back</h2>
            <p className="text-on-surface-variant text-sm mt-1.5 font-medium">Sign in to continue</p>
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

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2.5 text-sm hover:border-outline-variant/60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                className="bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2.5 text-sm hover:border-outline-variant/60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>

            <p className="text-center text-sm text-on-surface-variant mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline underline-offset-4">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
