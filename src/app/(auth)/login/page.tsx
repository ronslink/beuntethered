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
    <div className="min-h-screen flex items-center justify-center bg-surface-variant/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">
              account_balance_wallet
            </span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Welcome back
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Sign in to your beuntethered account
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-8 shadow-xl">
          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                placeholder="Min. 8 characters"
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
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-on-surface-variant hover:text-primary transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-4 text-on-surface-variant">
                or continue with
              </span>
            </div>
          </div>

          {/* OAuth */}
          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="w-full bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-bold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
