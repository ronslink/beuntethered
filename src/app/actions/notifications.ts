"use server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";

export interface NotificationItem {
  id: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "MILESTONE" | "MESSAGE" | "BID";
  read: boolean;
  createdAt: Date;
  href?: string;
}

// Derive live notifications from DB state — no in-memory store needed.
// For a CLIENT: pending bids on their open projects.
// For a FACILITATOR: bid status changes on their submitted bids.
export async function getUserNotifications(): Promise<{ success: boolean; notifications: NotificationItem[] }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, notifications: [] };

    const notifications: NotificationItem[] = [];

    if (user.role === "CLIENT") {
      // Fetch all open-bidding projects with pending bid counts
      const projects = await prisma.project.findMany({
        where: { client_id: user.id, status: "OPEN_BIDDING" },
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
          project: { client_id: user.id },
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

    // Sort newest first
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { success: true, notifications };
  } catch (e) {
    console.error("Notification fetch error:", e);
    return { success: false, notifications: [] };
  }
}

// Legacy stubs — kept for backward compat, no-ops since notifications derive from DB
export async function sendSystemNotification(
  _userId?: string,
  _message?: string,
  _type?: string
) {
  return { success: true, notificationId: "" };
}
export async function markAllNotificationsAsRead(_userId?: string) {
  return { success: true };
}
export async function markNotificationAsRead(_notificationId?: string) {
  return { success: true };
}
