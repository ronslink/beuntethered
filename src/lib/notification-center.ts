export type NotificationCenterType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "MILESTONE" | "MESSAGE" | "BID" | "ALERT";

export type NotificationCenterItem = {
  id: string;
  message: string;
  type: NotificationCenterType;
  read: boolean;
  createdAt: Date | string;
  href?: string;
  detail?: string;
  category?: "ACTION" | "TRUST" | "MESSAGE" | "SYSTEM";
  persistent?: boolean;
};

const ACTION_TYPES = new Set<NotificationCenterType>(["BID", "MILESTONE", "MESSAGE", "WARNING", "ERROR"]);
const TRUST_TYPES = new Set<NotificationCenterType>(["ALERT", "SUCCESS"]);

export function getNotificationCategory(notification: Pick<NotificationCenterItem, "type" | "category">) {
  if (notification.category) return notification.category;
  if (ACTION_TYPES.has(notification.type)) return "ACTION";
  if (TRUST_TYPES.has(notification.type)) return "TRUST";
  return "SYSTEM";
}

export function isPersistentUnread(notification: Pick<NotificationCenterItem, "read" | "persistent">) {
  return notification.persistent !== false && !notification.read;
}

export function getNotificationCenterCounts(notifications: NotificationCenterItem[]) {
  return notifications.reduce(
    (counts, notification) => {
      const category = getNotificationCategory(notification);
      if (category === "ACTION") counts.action += 1;
      if (category === "TRUST") counts.trust += 1;
      if (isPersistentUnread(notification)) counts.unread += 1;
      return counts;
    },
    { action: 0, trust: 0, unread: 0 }
  );
}
