import { z } from "zod";
import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

const badgeSchema = z.object({ type: z.enum(["verified", "curator"]) });

type Context = { params: Promise<{ username: string }> };

async function authorize(username: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: apiError("UNAUTH", "Masuk dulu.", 401) };
  }
  if (session.user.role !== "admin") {
    return {
      error: apiError("FORBIDDEN", "Hanya admin yang boleh mengubah badge.", 403),
    };
  }

  const target = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true },
  });
  if (!target) {
    return { error: apiError("NOT_FOUND", "Pengguna tidak ditemukan.", 404) };
  }

  return { target };
}

/** POST /api/admin/users/[username]/badges: beri badge manual (admin). */
export async function POST(request: Request, context: Context) {
  try {
    const { username } = await context.params;
    const access = await authorize(username);
    if ("error" in access) return access.error;

    const body = await request.json().catch(() => null);
    const parsed = badgeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID", "Tipe badge tidak valid.", 400);
    }

    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_type: { userId: access.target.id, type: parsed.data.type },
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.userBadge.create({
        data: { userId: access.target.id, type: parsed.data.type },
      });
      await createNotification({
        recipientId: access.target.id,
        actorId: null,
        type: "badge_awarded",
      });
    }

    return apiOk({
      username: access.target.username,
      badges: await listBadges(access.target.id),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/admin/users/[username]/badges?type=verified|curator */
export async function DELETE(request: Request, context: Context) {
  try {
    const { username } = await context.params;
    const access = await authorize(username);
    if ("error" in access) return access.error;

    const { searchParams } = new URL(request.url);
    const parsed = badgeSchema.safeParse({
      type: searchParams.get("type") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("INVALID", "Tipe badge tidak valid.", 400);
    }

    await prisma.userBadge.deleteMany({
      where: { userId: access.target.id, type: parsed.data.type },
    });

    return apiOk({
      username: access.target.username,
      badges: await listBadges(access.target.id),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function listBadges(userId: string) {
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    select: { type: true },
    orderBy: { awardedAt: "asc" },
  });
  return rows.map((row) => row.type);
}
