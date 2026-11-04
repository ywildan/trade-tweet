import { auth } from "@/auth";
import {
  apiError,
  apiOk,
  handleApiError,
  isUniqueConstraintError,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { getInteractionCounts, getPostForInteraction } from "@/lib/interactions";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk menyimpan postingan.", 401);
    }

    const { id } = await context.params;
    const post = await getPostForInteraction(id);
    if (!post) return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);

    try {
      await prisma.bookmark.create({
        data: { userId: session.user.id, postId: id },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }

    const counts = await getInteractionCounts(id);
    return apiOk({ bookmarked: true, count: counts.bookmarks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk menyimpan postingan.", 401);
    }

    const { id } = await context.params;
    const post = await getPostForInteraction(id);
    if (!post) return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);

    await prisma.bookmark.deleteMany({
      where: { userId: session.user.id, postId: id },
    });

    const counts = await getInteractionCounts(id);
    return apiOk({ bookmarked: false, count: counts.bookmarks });
  } catch (error) {
    return handleApiError(error);
  }
}
