"use server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { buyerProjectListWhere } from "@/lib/project-access";
import { buildActivityNotificationCopy, getProjectActivityHref } from "@/lib/activity-display";
import { createSystemNotification } from "@/lib/notifications";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import {
  notificationReadAllInputSchema,
  notificationReadInputSchema,
  systemNotificationInputSchema,
} from "@/lib/validators";

export interface NotificationItem {
  id: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "MILESTONE" | "MESSAGE" | "BID" | "ALERT";
  read: boolean;
  createdAt: Date;
  href?: string;
  detail?: string;
}

export async function getUserNotifications(): Promise<{ success: boolean; notifications: NotificationItem[] }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, notifications: [] };

    const persisted = await prisma.notification.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      take: 20,
    });

    const notifications: NotificationItem[] = persisted.map((notification) => ({
      id: notification.id,
      message: notification.message,
      type: notification.type,
      read: Boolean(notification.read_at),
      createdAt: notification.created_at,
      href: notification.href ?? undefined,
    }));

    if (user.role === "CLIENT") {
      // Fetch all open-bidding projects with pending bid counts
      const projects = await prisma.project.findMany({
        where: {
          AND: [
            buyerProjectListWhere(user.id),
            { status: "OPEN_BIDDING" },
          ],
        },
        include: {
          bids: { where: { status: "PENDING" }, select: { id: true, created_at: true } },
        },
      });

      for (const p of projects) {
        if (p.bids.length > 0) {
          const latest = p.bids.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
          notifications.push({
            id: `bid-${p.id}`,
            message: `${p.bids.length} new proposal${p.bids.length > 1 ? "s" : ""} on "${p.title}"`,
            type: "BID",
            read: false,
            createdAt: latest.created_at,
            href: `/projects/${p.id}`,
          });
        }
      }

      // Milestones in review
      const milestones = await prisma.milestone.findMany({
        where: {
          project: buyerProjectListWhere(user.id),
          status: "SUBMITTED_FOR_REVIEW",
        },
        include: { project: { select: { id: true, title: true } } },
        orderBy: { id: "desc" },
        take: 5,
      });
      for (const m of milestones) {
        notifications.push({
          id: `milestone-${m.id}`,
          message: `"${m.title}" is ready for your review`,
          type: "MILESTONE",
          read: false,
          createdAt: new Date(),
          href: `/command-center/${m.project.id}`,
        });
      }
    }

    if (user.role === "FACILITATOR") {
      const bids = await prisma.bid.findMany({
        where: { developer_id: user.id },
        include: { project: { select: { id: true, title: true } } },
        orderBy: { updated_at: "desc" },
        take: 10,
      });
      for (const b of bids) {
        if (b.status === "UNDER_NEGOTIATION") {
          notifications.push({
            id: `neg-${b.id}`,
            message: `Client wants to negotiate on "${b.project.title}"`,
            type: "MESSAGE",
            read: false,
            createdAt: b.updated_at,
          });
        }
        if (b.status === "ACCEPTED") {
          notifications.push({
            id: `acc-${b.id}`,
            message: `Your proposal was accepted — "${b.project.title}"`,
            type: "SUCCESS",
            read: false,
            createdAt: b.updated_at,
          });
        }
      }
    }

    const recentActivityLogs = await prisma.activityLog.findMany({
      where:
        user.role === "CLIENT"
          ? { project: buyerProjectListWhere(user.id) }
          : {
              OR: [
                { bid: { is: { developer_id: user.id } } },
                { milestone: { is: { facilitator_id: user.id } } },
                { project: { milestones: { some: { facilitator_id: user.id } } } },
              ],
            },
      include: {
        actor: { select: { name: true, email: true, role: true } },
        project: { select: { id: true, title: true, status: true } },
      },
      orderBy: { created_at: "desc" },
      take: 8,
    });

    for (const log of recentActivityLogs) {
      const copy = buildActivityNotificationCopy({
        action: log.action,
        metadata: log.metadata,
        projectTitle: log.project.title,
        actorName: log.actor?.name || log.actor?.email,
        actorRole: log.actor?.role,
      });
      notifications.push({
        id: `activity-${log.id}`,
        message: copy.message,
        detail: copy.detail,
        type: copy.isWorkspaceAdmin ? "ALERT" : "INFO",
        read: true,
        createdAt: log.created_at,
        href: getProjectActivityHref(log.project),
      });
    }

    // Sort newest first
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { success: true, notifications: notifications.slice(0, 30) };
  } catch (e) {
    console.error("Notification fetch error:", e);
    return { success: false, notifications: [] };
  }
}

export async function sendSystemNotification(
  userId?: unknown,
  message?: unknown,
  type?: unknown,
  href?: unknown
) {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    return { success: false, notificationId: "" };
  }

  const parsed = systemNotificationInputSchema.safeParse({ userId, message, type, href });
  if (!parsed.success) {
    return { success: false, notificationId: "" };
  }

  const notification = await createSystemNotification(parsed.data);

  return { success: true, notificationId: notification.id };
}
export async function markAllNotificationsAsRead(userId?: unknown) {
  const user = await getCurrentUser();
  if (!user) return { success: false };
  const parsed = notificationReadAllInputSchema.safeParse({ userId });
  if (!parsed.success) return { success: false };
  const targetUserId = parsed.data.userId ?? user.id;
  if (targetUserId !== user.id && !isPlatformAdminEmail(user.email)) {
    return { success: false };
  }

  await prisma.notification.updateMany({
    where: { user_id: targetUserId, read_at: null },
    data: { read_at: new Date() },
  });

  return { success: true };
}
export async function markNotificationAsRead(notificationId?: unknown) {
  const user = await getCurrentUser();
  const parsed = notificationReadInputSchema.safeParse({ notificationId });
  if (!user || !parsed.success) return { success: false };

  await prisma.notification.updateMany({
    where: { id: parsed.data.notificationId, user_id: user.id },
    data: { read_at: new Date() },
  });

  return { success: true };
}
