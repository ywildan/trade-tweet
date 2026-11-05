import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPostDetail } from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

/** GET /api/posts/[id]: post + balasan (spesifikasi.md §5). */
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const session = await auth();
    const detail = await getPostDetail(id, session?.user.id ?? null);
    if (!detail) {
      return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);
    }
    return apiOk(detail);
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/posts/[id]: soft delete, khusus pemilik (spesifikasi.md §5). */
export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk menghapus postingan.", 401);
    }

    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);
    }
    if (post.authorId !== session.user.id) {
      return apiError(
        "FORBIDDEN",
        "Hanya pembuat postingan yang bisa menghapusnya.",
        403,
      );
    }

    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return apiOk({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
