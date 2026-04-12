"use client";

import { useState, useTransition } from "react";
import { linkProjectRepository } from "@/app/actions/integrations";

export default function IntegrationsTab({ project }: { project: any }) {
  const [repoUrl, setRepoUrl] = useState(project.github_repo_url || "");
  const [token, setToken] = useState(project.github_access_token || "");
  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
       const res = await linkProjectRepository({
          projectId: project.id,
          repoUrl,
          token
       });

       if (res.success) {
          alert("GitHub repository connected successfully!");
       } else {
          alert(res.error);
       }
    });
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="bg-surface/50 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex items-center gap-4 mb-8 border-b border-outline-variant/20 pb-6 relative z-10">
             <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant/30 flex justify-center items-center shrink-0 shadow-inner text-on-surface">
                {/* SVG Github Icon */}
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-80"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
             </div>
             <div>
               <h3 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight">GitHub API Connection</h3>
               <p className="text-sm font-medium text-on-surface-variant opacity-80 mt-1">Bind this Project physically to native codebases allowing our AI endpoints to seamlessly extract `.diff` layouts.</p>
             </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6 relative z-10 max-w-2xl">
             <div>
                <label className="text-xs uppercase font-bold tracking-widest text-on-surface-variant mb-2 block">Repository URL Hub (Required)</label>
                <div className="flex bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors">
                  <div className="px-4 py-3 bg-surface-variant/20 border-r border-outline-variant/30 flex items-center justify-center shrink-0">
                     <span className="material-symbols-outlined text-on-surface-variant text-lg">public</span>
                  </div>
                  <input 
                     type="url"
                     required
                     value={repoUrl}
                     onChange={e => setRepoUrl(e.target.value)}
                     className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-3 text-on-surface focus:outline-none placeholder:text-on-surface-variant/40"
                     placeholder="https://github.com/microsoft/vscode"
                  />
                </div>
             </div>

             <div>
                <label className="text-xs uppercase font-bold tracking-widest text-on-surface-variant mb-2 block">Read-Only Access Token (If Private)</label>
                <div className="flex bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors relative">
                  <div className="px-4 py-3 bg-surface-variant/20 border-r border-outline-variant/30 flex items-center justify-center shrink-0">
                     <span className="material-symbols-outlined text-outline-variant text-lg">key</span>
                  </div>
                  <input 
                     type="password"
                     value={token}
                     onChange={e => setToken(e.target.value)}
                     className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-3 text-primary tracking-widest font-mono focus:outline-none placeholder:text-on-surface-variant/20 placeholder:tracking-normal placeholder:font-sans"
                     placeholder="ghp_xxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mt-2 opacity-60">Generate a GitHub Personal Access Token with read-only access to your repository.</p>
             </div>

             <div className="border-t border-outline-variant/20 pt-6 mt-8 flex justify-end">
                <button type="submit" disabled={isPending} className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container rounded-xl px-8 py-3.5 font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-[0_8px_20px_rgba(var(--color-primary),0.2)] hover:shadow-primary/40 hover:-translate-y-0.5">
                   {isPending ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> Binding Arrays...
                      </>
                   ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">cable</span> Authenticate Route
                      </>
                   )}
                </button>
             </div>
          </form>

       </div>
    </div>
  );
}
