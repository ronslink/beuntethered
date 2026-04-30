import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/auth";

const NOTIFICATION_TYPES = new Set<NotificationType>([
  "INFO",
  "SUCCESS",
  "WARNING",
  "ERROR",
  "MILESTONE",
  "MESSAGE",
  "BID",
  "ALERT",
]);

export function normalizeNotificationType(type?: string): NotificationType {
  if (type && NOTIFICATION_TYPES.has(type as NotificationType)) {
    return type as NotificationType;
  }
  return "INFO";
}

export async function createSystemNotification({
  userId,
  message,
  type,
  href,
  sourceKey,
  metadata,
}: {
  userId: string;
  message: string;
  type?: string;
  href?: string | null;
  sourceKey?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  if (sourceKey) {
    return prisma.notification.upsert({
      where: { source_key: sourceKey },
      update: {
        message,
        type: normalizeNotificationType(type),
        href: href ?? null,
        metadata,
      },
      create: {
        user_id: userId,
        message,
        type: normalizeNotificationType(type),
        href: href ?? null,
        source_key: sourceKey,
        metadata,
      },
    });
  }

  return prisma.notification.create({
    data: {
      user_id: userId,
      message,
      type: normalizeNotificationType(type),
      href: href ?? null,
      metadata,
    },
  });
}
