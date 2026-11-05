import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { getPostAnalytics } from "@/lib/analytics";

type Context = { params: Promise<{ id: string }> };

/** GET /api/posts/[id]/analytics: hanya pemilik post (spesifikasi.md §5). */
export async function GET(_request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk melihat analitik.", 401);
    }

    const { id } = await context.params;
    const analytics = await getPostAnalytics(id);
    if (!analytics) {
      return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);
    }
    if (analytics.authorId !== session.user.id) {
      return apiError(
        "FORBIDDEN",
        "Analitik hanya bisa dilihat pemilik postingan.",
        403,
      );
    }

    return apiOk({
      views: analytics.views,
      likes: analytics.likes,
      reposts: analytics.reposts,
      bookmarks: analytics.bookmarks,
      replies: analytics.replies,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
