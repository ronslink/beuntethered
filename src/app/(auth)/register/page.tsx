"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/app/actions/register";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"CLIENT" | "FACILITATOR">("CLIENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await registerUser({ email, password, name, role });

    setLoading(false);

    if (!result.success) {
      setError(result.error || "Registration failed. Please try again.");
    } else {
      router.push("/login?registered=true");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-variant/30 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">
              account_balance_wallet
            </span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Create your account
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Join beuntethered and get started in minutes
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
                placeholder="Jane Smith"
              />
            </div>

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

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                I want to...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("CLIENT")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    role === "CLIENT"
                      ? "border-primary bg-primary/5 text-on-surface"
                      : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-primary/30"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl block mb-1">
                    person
                  </span>
                  <p className="font-bold text-sm">Hire developers</p>
                  <p className="text-xs mt-0.5 opacity-70">Post projects & hire</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("FACILITATOR")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    role === "FACILITATOR"
                      ? "border-primary bg-primary/5 text-on-surface"
                      : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-primary/30"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl block mb-1">
                    code
                  </span>
                  <p className="font-bold text-sm">Work as a developer</p>
                  <p className="text-xs mt-0.5 opacity-70">Bid on projects</p>
                </button>
              </div>
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-bold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
