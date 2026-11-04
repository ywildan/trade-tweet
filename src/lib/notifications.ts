import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type {
  NotificationItemData,
  NotificationType,
} from "@/types/notification";

const actorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  badges: { select: { type: true }, orderBy: { awardedAt: "asc" } },
} satisfies Prisma.UserSelect;

type ActorRow = Prisma.UserGetPayload<{ select: typeof actorSelect }>;

function serializeActor(row: ActorRow) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl,
    badges: row.badges.map((badge) => badge.type),
  };
}

export const getUnreadNotificationCount = cache(async (userId: string) => {
  return prisma.notification.count({
    where: { recipientId: userId, readAt: null },
  });
});

export async function getNotifications({
  userId,
  unreadOnly = false,
  cursor,
  take = 30,
}: {
  userId: string;
  unreadOnly?: boolean;
  cursor?: string | null;
  take?: number;
}): Promise<{
  items: NotificationItemData[];
  nextCursor: string | null;
  unreadCount: number;
}> {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        readAt: true,
        createdAt: true,
        actor: { select: actorSelect },
        post: {
          select: {
            id: true,
            content: true,
            deletedAt: true,
            isSignal: true,
            symbol: true,
            status: true,
            pnlPercent: true,
          },
        },
      },
    }),
    getUnreadNotificationCount(userId),
  ]);

  const page = rows.slice(0, take);

  return {
    items: page.map((row) => ({
      id: row.id,
      type: row.type,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      actor: row.actor ? serializeActor(row.actor) : null,
      post: row.post
        ? {
            id: row.post.id,
            content: row.post.content,
            deletedAt: row.post.deletedAt?.toISOString() ?? null,
            isSignal: row.post.isSignal,
            symbol: row.post.symbol,
            status: row.post.status,
            pnlPercent: row.post.pnlPercent,
          }
        : null,
    })),
    nextCursor: rows.length > take ? page[page.length - 1].id : null,
    unreadCount,
  };
}

/** Notifikasi tidak pernah dikirim ke diri sendiri; actor null = sistem. */
export async function createNotification(input: {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  postId?: string | null;
}) {
  if (input.actorId && input.recipientId === input.actorId) return;
  await prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      type: input.type,
      postId: input.postId ?? null,
    },
  });
}

export async function removeNotification(input: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  postId?: string | null;
}) {
  await prisma.notification.deleteMany({
    where: {
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      postId: input.postId ?? null,
    },
  });
}
