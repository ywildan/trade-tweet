import { auth } from "@/auth";
import {
  apiError,
  apiOk,
  handleApiError,
  isUniqueConstraintError,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { createNotification, removeNotification } from "@/lib/notifications";

type Context = { params: Promise<{ username: string }> };

async function targetUser(username: string) {
  return prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true },
  });
}

async function followerCount(userId: string) {
  return prisma.follow.count({ where: { followingId: userId } });
}

export async function POST(_request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk mengikuti trader.", 401);
    }

    const { username } = await context.params;
    const target = await targetUser(username);
    if (!target) {
      return apiError("NOT_FOUND", "Pengguna tidak ditemukan.", 404);
    }
    if (target.id === session.user.id) {
      return apiError("INVALID", "Tidak bisa mengikuti diri sendiri.", 400);
    }

    let created = false;
    try {
      await prisma.follow.create({
        data: { followerId: session.user.id, followingId: target.id },
      });
      created = true;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }

    if (created) {
      await createNotification({
        recipientId: target.id,
        actorId: session.user.id,
        type: "follow",
      });
    }

    return apiOk({
      following: true,
      followers: await followerCount(target.id),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk berhenti mengikuti.", 401);
    }

    const { username } = await context.params;
    const target = await targetUser(username);
    if (!target) {
      return apiError("NOT_FOUND", "Pengguna tidak ditemukan.", 404);
    }

    const deleted = await prisma.follow.deleteMany({
      where: { followerId: session.user.id, followingId: target.id },
    });

    if (deleted.count > 0) {
      await removeNotification({
        recipientId: target.id,
        actorId: session.user.id,
        type: "follow",
      });
    }

    return apiOk({
      following: false,
      followers: await followerCount(target.id),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
