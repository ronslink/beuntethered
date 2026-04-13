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
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/15 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-surface/50 backdrop-blur-xl border border-outline-variant/30 mb-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary text-4xl transform group-hover:scale-110 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>
              group_add
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black font-headline tracking-tighter text-on-surface mb-3 drop-shadow-sm">
            Join the Matrix
          </h1>
          <p className="text-on-surface-variant font-medium text-sm lg:text-base">
            Initialize an Untether Node in minutes.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface/60 backdrop-blur-3xl border border-outline-variant/30 rounded-[2.5rem] p-8 lg:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.08)] animate-in fade-in zoom-in-95 duration-700 delay-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-3 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">face</span> Full Name Identifier
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface-container-low/50 hover:bg-surface-container-low focus:bg-surface-container-low border border-outline-variant/30 focus:border-primary/50 px-5 py-4 rounded-2xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all focus:ring-4 focus:ring-primary/10 shadow-inner"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-3 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">mail</span> Email Contact Bound
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
                <span className="material-symbols-outlined text-[14px]">lock</span> Secure Encryption Key
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-surface-container-low/50 hover:bg-surface-container-low focus:bg-surface-container-low border border-outline-variant/30 focus:border-primary/50 px-5 py-4 rounded-2xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all focus:ring-4 focus:ring-primary/10 shadow-inner"
                placeholder="Min. 8 characters"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-4">
                Platform Designation
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("CLIENT")}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    role === "CLIENT"
                      ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]"
                      : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-primary/30 opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl block mb-2 ${role === 'CLIENT' ? 'text-primary' : ''}`}>
                    person
                  </span>
                  <p className={`font-black text-sm uppercase tracking-widest ${role === 'CLIENT' ? 'text-primary' : ''}`}>Hire Experts</p>
                  <p className="text-[10px] mt-1 font-medium opacity-80 leading-relaxed">Deposit Escrow</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("FACILITATOR")}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    role === "FACILITATOR"
                      ? "border-tertiary bg-tertiary/5 shadow-[0_0_15px_rgba(var(--color-tertiary),0.1)]"
                      : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-tertiary/30 opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl block mb-2 ${role === 'FACILITATOR' ? 'text-tertiary' : ''}`}>
                    code
                  </span>
                  <p className={`font-black text-sm uppercase tracking-widest ${role === 'FACILITATOR' ? 'text-tertiary' : ''}`}>Work / Audit</p>
                  <p className="text-[10px] mt-1 font-medium opacity-80 leading-relaxed">Bid & Execute</p>
                </button>
              </div>
            </div>

            {error && (
               <div className="bg-error/10 border border-error/20 rounded-2xl px-5 py-4 flex items-center gap-3 animate-in shake">
                  <span className="material-symbols-outlined text-error text-[20px]">error</span>
                  <p className="text-error text-[12px] font-bold">{error}</p>
               </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden bg-on-surface text-surface hover:-translate-y-1 font-black py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgb(0,0,0,0.15)] group uppercase tracking-widest text-xs mt-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              {loading ? (
                 <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Generating Node...</span>
              ) : "Create Account Matrix"}
            </button>
          </form>

          <p className="text-center text-sm font-medium text-on-surface-variant mt-8 bg-surface-container-low/50 py-3 rounded-xl border border-outline-variant/20 inline-block w-full">
            Ready to reconnect?{" "}
            <Link
              href="/login"
              className="text-primary font-black uppercase tracking-widest text-[10px] ml-2 hover:underline underline-offset-4"
            >
              Initialize Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
