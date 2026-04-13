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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-low border border-outline-variant/30 mb-5 shadow-lg">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tighter text-on-surface">Create your account</h1>
          <p className="text-on-surface-variant text-sm mt-1.5 font-medium">Join the Untether network in minutes</p>
        </div>

        {/* Card */}
        <div className="bg-surface/70 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                Full name
              </label>
              <input
                id="name" type="text" value={name}
                onChange={e => setName(e.target.value)} required
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3.5 rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all"
                placeholder="Jane Smith"
              />
            </div>

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
              <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                Password
              </label>
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

            {/* Role Selector */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">I want to...</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button" onClick={() => setRole("CLIENT")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    role === "CLIENT"
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/30 bg-surface-container-low hover:border-primary/30 opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl block mb-1.5 ${role === "CLIENT" ? "text-primary" : "text-on-surface-variant"}`}>work</span>
                  <p className={`font-black text-sm ${role === "CLIENT" ? "text-primary" : "text-on-surface"}`}>Hire Experts</p>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Post projects & pay via Escrow</p>
                </button>

                <button
                  type="button" onClick={() => setRole("FACILITATOR")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    role === "FACILITATOR"
                      ? "border-tertiary bg-tertiary/5"
                      : "border-outline-variant/30 bg-surface-container-low hover:border-tertiary/30 opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl block mb-1.5 ${role === "FACILITATOR" ? "text-tertiary" : "text-on-surface-variant"}`}>code</span>
                  <p className={`font-black text-sm ${role === "FACILITATOR" ? "text-tertiary" : "text-on-surface"}`}>Find Work</p>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Bid on projects & get paid</p>
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
                <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Creating account...</>
              ) : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
