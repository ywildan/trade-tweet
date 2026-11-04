import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

/** POST /api/notifications/read-all */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk mengubah notifikasi.", 401);
    }

    const result = await prisma.notification.updateMany({
      where: { recipientId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return apiOk({ updated: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
