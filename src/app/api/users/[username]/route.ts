import { auth, unstable_update } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { publicUserSelect, serializePublicUser } from "@/lib/users";
import { profileUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ username: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { username } = await context.params;
    const session = await auth();

    const row = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { ...publicUserSelect, email: true },
    });
    if (!row) {
      return apiError("NOT_FOUND", "Pengguna tidak ditemukan.", 404);
    }

    const isSelf = session?.user.id === row.id;
    return apiOk({
      user: serializePublicUser(row, isSelf ? row.email : null),
      isSelf,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Kamu harus masuk untuk mengubah profil.", 401);
    }

    const { username } = await context.params;
    const target = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true },
    });
    if (!target) {
      return apiError("NOT_FOUND", "Pengguna tidak ditemukan.", 404);
    }
    if (target.id !== session.user.id) {
      return apiError("FORBIDDEN", "Kamu hanya bisa mengubah profil sendiri.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID", "Data profil tidak valid.", 400, {
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const row = await prisma.user.update({
      where: { id: target.id },
      data: parsed.data,
      select: { ...publicUserSelect, email: true },
    });

    // Segarkan klaim JWT (nama/avatar di nav) tanpa memaksa login ulang.
    try {
      await unstable_update({});
    } catch (error) {
      console.error("[users] gagal memperbarui sesi", error);
    }

    return apiOk({ user: serializePublicUser(row, row.email) });
  } catch (error) {
    return handleApiError(error);
  }
}
