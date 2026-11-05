import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

/** POST /api/notifications/[id]/read: tandai satu notifikasi dibaca. */
export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu.", 401);
    }

    const updated = await prisma.notification.updateMany({
      where: { id, recipientId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (updated.count === 0) {
      // Bisa jadi sudah dibaca atau bukan milik pengguna: jangan bocorkan
      // bedanya lewat 404 vs 200 yang berbeda pesan: cukup balas 404 umum.
      const exists = await prisma.notification.findFirst({
        where: { id, recipientId: session.user.id },
        select: { id: true },
      });
      if (!exists) {
        return apiError("NOT_FOUND", "Notifikasi tidak ditemukan.", 404);
      }
    }
    return apiOk({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
