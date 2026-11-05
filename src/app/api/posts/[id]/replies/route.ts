import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPostReplies } from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

/** GET /api/posts/[id]/replies?limit=20&cursor=<id-balasan-terakhir> */
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!post) return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);

    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const cursor = url.searchParams.get("cursor");
    const session = await auth();
    const { items, nextCursor } = await getPostReplies(
      id,
      session?.user.id ?? null,
      Number.isFinite(limit) ? limit : 20,
      cursor,
    );
    return apiOk({ items, nextCursor });
  } catch (error) {
    return handleApiError(error);
  }
}
