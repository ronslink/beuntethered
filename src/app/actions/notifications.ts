"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

interface SendNotificationParams {
  userId: string;
  type: "review_received" | "payment_received" | "milestone_approved" | "message" | "system";
  title: string;
  message: string;
  relatedId?: string;
}

export async function sendSystemNotification(params: SendNotificationParams) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_id: params.relatedId,
        is_read: false,
      },
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Failed to send notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}

export async function getUserNotifications(userId: string, limit = 20) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== userId) {
      throw new Error("Unauthorized");
    }

    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return { success: true, notifications };
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
}
