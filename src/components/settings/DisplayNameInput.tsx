"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "@/app/actions/profile";
import { useRouter } from "next/navigation";

export default function DisplayNameInput({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);

  const dirty = name !== initialName;

  const handleSave = () => {
    setSaved(false);
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (result.success) {
        setSaved(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Display name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          placeholder="Your name"
          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>
      {dirty && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-primary text-on-primary font-black text-xs uppercase tracking-widest hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? (
              <><span className="material-symbols-outlined animate-spin text-[15px]">refresh</span> Saving…</>
            ) : "Save Name"}
          </button>
          {saved && (
            <p className="text-xs text-[#059669] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Saved
            </p>
          )}
        </div>
      )}
    </div>
  );
}
