import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPostReplies } from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

/** GET /api/posts/[id]/replies */
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!post) return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);

    const session = await auth();
    const items = await getPostReplies(id, session?.user.id ?? null);
    return apiOk({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
