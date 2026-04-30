"use client";

import { useState, useEffect, useRef } from "react";
import { getUserNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/app/actions/notifications";
import Link from "next/link";

type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "MILESTONE" | "MESSAGE" | "BID" | "ALERT";

interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  href?: string;
  detail?: string;
}

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

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      try {
        const result = await getUserNotifications();
        if (result.success) {
          setNotifications(result.notifications as NotificationItem[]);
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
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden bg-surface-container-high/95 backdrop-blur-2xl rounded-2xl border border-outline-variant/30 shadow-2xl z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30">
            <h3 className="font-semibold text-on-surface text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-72">
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
              <ul className="divide-y divide-outline-variant/20">
                {notifications.map((notification) => {
                  const inner = (
                    <div className="flex gap-3">
                      <span className={`material-symbols-outlined text-xl flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? "text-on-surface-variant" : "text-on-surface font-medium"}`}>
                          {notification.message}
                        </p>
                        {notification.detail && (
                          <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
                            {notification.detail}
                          </p>
                        )}
                        <p className="text-xs text-on-surface-variant/70 mt-1">
                          {formatTimestamp(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  );
                  const liClass = `px-4 py-3 hover:bg-surface-container transition-colors ${!notification.read ? "bg-primary/5" : ""}`;
                  return notification.href ? (
                    <li key={notification.id}>
                      <Link href={notification.href} onClick={() => handleNotificationClick(notification.id)} className={`block ${liClass}`}>
                        {inner}
                      </Link>
                    </li>
                  ) : (
                    <li key={notification.id} className={liClass}>
                      <button type="button" onClick={() => handleNotificationClick(notification.id)} className="block w-full text-left">
                        {inner}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
