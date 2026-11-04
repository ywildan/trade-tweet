import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { getPostDetail } from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

/** GET /api/posts/[id] — post + balasan (spesifikasi.md §5). */
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
