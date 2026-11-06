import type { Prisma } from "@/generated/prisma/client";
import { auth, unstable_update } from "@/auth";
import { apiError, apiOk, handleApiError, isUniqueConstraintError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { publicUserSelect, serializePublicUser } from "@/lib/users";
import {
  USERNAME_CHANGE_LIMIT,
  profileUpdateSchema,
} from "@/lib/validation";

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
      select: { id: true, username: true, usernameChangeCount: true },
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

    const newUsername = parsed.data.username;
    const wantsRename =
      newUsername !== undefined && newUsername !== target.username;

    if (wantsRename) {
      if (target.usernameChangeCount >= USERNAME_CHANGE_LIMIT) {
        return apiError(
          "FORBIDDEN",
          `Kamu sudah ${USERNAME_CHANGE_LIMIT} kali mengganti username, jadi tidak bisa diubah lagi.`,
          403,
        );
      }
      const taken = await prisma.user.findUnique({
        where: { username: newUsername },
        select: { id: true },
      });
      if (taken) {
        return apiError(
          "CONFLICT",
          "Username sudah dipakai pengguna lain.",
          409,
        );
      }
    }

    const data: Prisma.UserUpdateInput = {
      name: parsed.data.name,
      bio: parsed.data.bio,
      location: parsed.data.location,
      avatarUrl: parsed.data.avatarUrl,
      bannerUrl: parsed.data.bannerUrl,
    };
    if (wantsRename) {
      // Username + counter naik bersamaan dalam satu update atomik.
      data.username = newUsername;
      data.usernameChangeCount = { increment: 1 };
    }

    let row;
    try {
      row = await prisma.user.update({
        where: { id: target.id },
        data,
        select: { ...publicUserSelect, email: true },
      });
    } catch (error) {
      // Balapan dengan rename lain ke username yang sama.
      if (isUniqueConstraintError(error)) {
        return apiError(
          "CONFLICT",
          "Username sudah dipakai pengguna lain.",
          409,
        );
      }
      throw error;
    }

    // Segarkan klaim JWT (nama/avatar/username di nav) tanpa memaksa login
    // ulang — callback JWT membaca ulang user dari DB saat trigger "update".
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
