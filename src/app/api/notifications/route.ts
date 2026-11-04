import { connection } from "next/server";
import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { getNotifications } from "@/lib/notifications";

/** GET /api/notifications?cursor=&filter=unread */
export async function GET(request: Request) {
  // Notifikasi selalu per pengguna dan terbaru: jangan ikut prerender.
  await connection();

  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk melihat notifikasi.", 401);
    }

    const { searchParams } = new URL(request.url);
    const result = await getNotifications({
      userId: session.user.id,
      unreadOnly: searchParams.get("filter") === "unread",
      cursor: searchParams.get("cursor"),
    });

    return apiOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
