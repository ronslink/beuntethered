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
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/15 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-surface/50 backdrop-blur-xl border border-outline-variant/30 mb-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary text-4xl transform group-hover:scale-110 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>
              all_inclusive
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black font-headline tracking-tighter text-on-surface mb-3 drop-shadow-sm">
            Welcome back
          </h1>
          <p className="text-on-surface-variant font-medium text-sm lg:text-base">
            Securely access your active Escrow matrix
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-[2.5rem] p-8 lg:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.08)] animate-in fade-in zoom-in-95 duration-700 delay-100">
          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-3 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">mail</span> Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-container-low/50 hover:bg-surface-container-low focus:bg-surface-container-low border border-outline-variant/30 focus:border-primary/50 px-5 py-4 rounded-2xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all focus:ring-4 focus:ring-primary/10 shadow-inner"
                placeholder="you@untether.network"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-3 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">lock</span> Secure Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-surface-container-low/50 hover:bg-surface-container-low focus:bg-surface-container-low border border-outline-variant/30 focus:border-primary/50 px-5 py-4 rounded-2xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all focus:ring-4 focus:ring-primary/10 shadow-inner"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-error/10 border border-error/20 rounded-2xl px-5 py-4 flex items-center gap-3 animate-in shake">
                 <span className="material-symbols-outlined text-error text-[20px]">error</span>
                 <p className="text-error text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden bg-on-surface text-surface hover:-translate-y-1 font-black py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgb(0,0,0,0.15)] group uppercase tracking-widest text-xs"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              {loading ? (
                 <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Executing...</span>
              ) : "Initialize Session"}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors hover:underline underline-offset-4"
              >
                Lost access to your network?
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#fcfdfd] dark:bg-[#1a1c1e] px-4 font-bold uppercase tracking-widest text-[#73777f] dark:text-[#8c9199]">
                Trusted Providers
              </span>
            </div>
          </div>

          {/* OAuth */}
          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="w-full bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/30 text-on-surface font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group"
          >
            <svg className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Authenticate via GitHub
          </button>

          <p className="text-center text-sm font-medium text-on-surface-variant mt-8 bg-surface-container-low/50 py-3 rounded-xl border border-outline-variant/20 inline-block w-full">
            No profile detected?{" "}
            <Link
              href="/register"
              className="text-primary font-black uppercase tracking-widest text-[10px] ml-2 hover:underline underline-offset-4"
            >
              Sign Up Matrix
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
