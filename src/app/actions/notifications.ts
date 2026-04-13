"use server";

import { getCurrentUser } from "@/lib/session";

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "MILESTONE"
  | "MESSAGE";

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
}

// In-memory notification store (resets on server restart — fine for dev/P0)
const notificationStore = new Map<string, NotificationItem[]>();

function getUserKey(userId: string): string {
  return `notifications:${userId}`;
}

export async function sendSystemNotification(
  userId: string,
  message: string,
  type: NotificationType = "INFO"
): Promise<{ success: boolean; notificationId: string }> {
  const id = crypto.randomUUID();
  const notification: NotificationItem = {
    id,
    message,
    type,
    read: false,
    createdAt: new Date(),
  };

  const existing = notificationStore.get(getUserKey(userId)) ?? [];
  notificationStore.set(getUserKey(userId), [notification, ...existing]);

  return { success: true, notificationId: id };
}

export async function getUserNotifications(
  userId: string
): Promise<{ success: boolean; notifications: NotificationItem[] }> {
  const notifications = notificationStore.get(getUserKey(userId)) ?? [];
  return { success: true, notifications };
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean }> {
  // Iterate all users' stores to find and mark the notification
  for (const [, notifications] of notificationStore) {
    const idx = notifications.findIndex((n) => n.id === notificationId);
    if (idx !== -1) {
      notifications[idx] = { ...notifications[idx], read: true };
      break;
    }
  }
  return { success: true };
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean }> {
  const notifications = notificationStore.get(getUserKey(userId)) ?? [];
  notificationStore.set(
    getUserKey(userId),
    notifications.map((n) => ({ ...n, read: true }))
  );
  return { success: true };
}
