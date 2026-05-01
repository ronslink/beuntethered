"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { getUserNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/app/actions/notifications";
import Link from "next/link";
import {
  getNotificationCategory,
  getNotificationCenterCounts,
  isPersistentUnread,
  type NotificationCenterItem,
} from "@/lib/notification-center";

type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "MILESTONE" | "MESSAGE" | "BID" | "ALERT";

type NotificationItem = NotificationCenterItem & { type: NotificationType };

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "BID":       return "gavel";
    case "SUCCESS":   return "check_circle";
    case "WARNING":   return "warning";
    case "ERROR":     return "error";
    case "MILESTONE": return "emoji_events";
    case "MESSAGE":   return "mail";
    case "ALERT":     return "notifications_active";
    case "INFO":
    default:          return "info";
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case "BID":       return "text-primary";
    case "SUCCESS":   return "text-tertiary";
    case "WARNING":   return "text-yellow-500";
    case "ERROR":     return "text-red-500";
    case "MILESTONE": return "text-primary";
    case "MESSAGE":   return "text-secondary";
    case "ALERT":     return "text-primary";
    case "INFO":
    default:          return "text-on-surface-variant";
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const counts = getNotificationCenterCounts(notifications);
  const actionItems = notifications.filter(notification => getNotificationCategory(notification) === "ACTION").slice(0, 5);
  const recentItems = notifications.filter(notification => getNotificationCategory(notification) !== "ACTION").slice(0, 12);

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      try {
        const result = await getUserNotifications();
        if (result.success) {
          setNotifications(result.notifications.map((notification) => ({
            ...notification,
            createdAt: notification.createdAt,
          })) as NotificationItem[]);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    }
    // Fetch on mount for badge + on open for fresh data
    fetchNotifications();
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    setIsOpen(false);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    await markNotificationAsRead(notificationId);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-on-surface-variant hover:bg-surface-container transition-all duration-300 rounded-full active:scale-90 flex items-center justify-center relative"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {counts.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {counts.unread > 99 ? "99+" : counts.unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface/95 shadow-2xl backdrop-blur-2xl z-50"
        >
          {/* Header */}
          <div className="border-b border-outline-variant/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Action Center</p>
                <h3 className="text-sm font-black text-on-surface">Notifications</h3>
              </div>
              {counts.unread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/15"
              >
                Mark all as read
              </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <NotificationStat label="Needs action" value={actionItems.length} />
              <NotificationStat label="Unread" value={counts.unread} />
              <NotificationStat label="Trust events" value={counts.trust} />
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="material-symbols-outlined text-on-surface-variant animate-spin">progress_activity</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-2">notifications_off</span>
                <p className="text-on-surface-variant text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-4 p-3">
                {actionItems.length > 0 && (
                  <NotificationSection title="Needs Action" icon="task_alt">
                    {actionItems.map(notification => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        onOpen={() => handleNotificationClick(notification.id)}
                        prominent
                      />
                    ))}
                  </NotificationSection>
                )}

                <NotificationSection title="Recent Activity" icon="history">
                  {recentItems.length === 0 ? (
                    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-5 text-center">
                      <p className="text-sm font-bold text-on-surface">No recent activity</p>
                      <p className="mt-1 text-xs font-medium text-on-surface-variant">Trust events, messages, and system notices will appear here.</p>
                    </div>
                  ) : recentItems.map(notification => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      onOpen={() => handleNotificationClick(notification.id)}
                    />
                  ))}
                </NotificationSection>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      aria-label={`${label}: ${value}`}
      className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2"
    >
      <p className="text-lg font-black leading-none text-on-surface">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  );
}

function NotificationSection({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="material-symbols-outlined text-[15px] text-primary">{icon}</span>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface">{title}</h4>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function NotificationRow({
  notification,
  onOpen,
  prominent = false,
}: {
  notification: NotificationItem;
  onOpen: () => void;
  prominent?: boolean;
}) {
  const content = (
    <div className={`flex gap-3 rounded-xl border px-3 py-3 transition-colors ${
      prominent
        ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
        : isPersistentUnread(notification)
          ? "border-primary/20 bg-primary/5 hover:bg-surface-container-high"
          : "border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high"
    }`}>
      <span className={`material-symbols-outlined mt-0.5 shrink-0 text-xl ${getNotificationColor(notification.type)}`}>
        {getNotificationIcon(notification.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-5 ${notification.read ? "font-medium text-on-surface-variant" : "font-bold text-on-surface"}`}>
          {notification.message}
        </p>
        {notification.detail && (
          <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-on-surface-variant">
            {notification.detail}
          </p>
        )}
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
          {formatTimestamp(new Date(notification.createdAt))}
        </p>
      </div>
      {isPersistentUnread(notification) && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  );

  return notification.href ? (
    <Link href={notification.href} onClick={onOpen} className="block">
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onOpen} className="block w-full text-left">
      {content}
    </button>
  );
}
