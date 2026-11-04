import { auth } from "@/auth";
import {
  apiError,
  apiOk,
  handleApiError,
  isUniqueConstraintError,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { getInteractionCounts, getPostForInteraction } from "@/lib/interactions";
import { createNotification, removeNotification } from "@/lib/notifications";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk menyukai postingan.", 401);
    }

    const { id } = await context.params;
    const post = await getPostForInteraction(id);
    if (!post) return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);

    let created = false;
    try {
      await prisma.like.create({
        data: { userId: session.user.id, postId: id },
      });
      created = true;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }

    if (created) {
      await createNotification({
        recipientId: post.authorId,
        actorId: session.user.id,
        type: "like",
        postId: id,
      });
    }

    const counts = await getInteractionCounts(id);
    return apiOk({ liked: true, count: counts.likes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk menyukai postingan.", 401);
    }

    const { id } = await context.params;
    const post = await getPostForInteraction(id);
    if (!post) return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);

    const deleted = await prisma.like.deleteMany({
      where: { userId: session.user.id, postId: id },
    });

    if (deleted.count > 0) {
      await removeNotification({
        recipientId: post.authorId,
        actorId: session.user.id,
        type: "like",
        postId: id,
      });
    }

    const counts = await getInteractionCounts(id);
    return apiOk({ liked: false, count: counts.likes });
  } catch (error) {
    return handleApiError(error);
  }
}
