"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferences } from "@/app/actions/profile";

const NOTIFICATION_OPTIONS = [
  { key: "notify_payment_updates" as const, label: "Payment Updates", desc: "When a milestone is funded or paid out." },
  { key: "notify_new_proposals" as const, label: "New Proposals", desc: "When a developer bids on your project." },
  { key: "notify_milestone_reviews" as const, label: "Milestone Reviews", desc: "When a deliverable is submitted for review." },
];

type Prefs = {
  notify_payment_updates: boolean;
  notify_new_proposals: boolean;
  notify_milestone_reviews: boolean;
};

export default function NotificationSettings({ initial }: { initial: Prefs }) {
  const [isPending, startTransition] = useTransition();
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof Prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaved(false);
    startTransition(async () => {
      const result = await updateNotificationPreferences(updated);
      if (result.success) setSaved(true);
    });
  };

  return (
    <div className="p-6 space-y-5">
      {NOTIFICATION_OPTIONS.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-on-surface">{item.label}</p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{item.desc}</p>
          </div>
          <button
            onClick={() => toggle(item.key)}
            disabled={isPending}
            className={`w-11 h-6 rounded-full relative border transition-colors ${
              prefs[item.key]
                ? "bg-primary border-primary/30"
                : "bg-surface-container-high border-outline-variant/30"
            }`}
            aria-label={`Toggle ${item.label}`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute top-0.5 shadow-sm transition-all ${
                prefs[item.key]
                  ? "bg-on-primary right-1"
                  : "bg-on-surface-variant left-1"
              }`}
            />
          </button>
        </div>
      ))}
      <p className="text-[10px] text-on-surface-variant/60 font-medium pt-2 border-t border-outline-variant/10 flex items-center gap-1.5">
        {isPending ? (
          <><span className="material-symbols-outlined animate-spin text-[12px]">refresh</span> Saving…</>
        ) : saved ? (
          <><span className="material-symbols-outlined text-[12px] text-[#059669]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Preferences saved</>
        ) : (
          "Notification preferences are saved automatically."
        )}
      </p>
    </div>
  );
}
