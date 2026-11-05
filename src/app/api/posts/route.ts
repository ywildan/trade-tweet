import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { extractMentions } from "@/lib/mentions";
import { createNotification } from "@/lib/notifications";
import { postInclude, serializePost } from "@/lib/posts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { postSchema } from "@/lib/validation";

/** POST /api/posts — post biasa, sinyal, balasan, atau kutipan (spesifikasi.md §5). */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk memposting.", 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID", "Postingan tidak valid.", 400, {
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    // Validasi dulu: body tidak valid tidak boleh menghabiskan kuota.
    const limit = await enforceRateLimit({
      key: `post:${session.user.id}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      const response = apiError(
        "RATE_LIMITED",
        `Terlalu banyak posting. Coba lagi dalam ${limit.retryAfter} detik.`,
        429,
      );
      response.headers.set("Retry-After", String(limit.retryAfter));
      return response;
    }

    const data = parsed.data;

    // Balasan selalu menempel ke root supaya timeline tetap satu level.
    let replyToId: string | null = null;
    let replyRootAuthorId: string | null = null;
    if (data.replyToId) {
      const target = await prisma.post.findFirst({
        where: { id: data.replyToId, deletedAt: null },
        select: {
          id: true,
          replyToId: true,
          authorId: true,
          replyTo: { select: { authorId: true } },
        },
      });
      if (!target) {
        return apiError(
          "NOT_FOUND",
          "Postingan yang dibalas tidak ditemukan.",
          404,
        );
      }
      replyToId = target.replyToId ?? target.id;
      replyRootAuthorId = target.replyToId
        ? (target.replyTo?.authorId ?? target.authorId)
        : target.authorId;
    }

    let quoteTarget: { id: string; authorId: string } | null = null;
    if (data.quoteOfId) {
      quoteTarget = await prisma.post.findFirst({
        where: { id: data.quoteOfId, deletedAt: null },
        select: { id: true, authorId: true },
      });
      if (!quoteTarget) {
        return apiError(
          "NOT_FOUND",
          "Postingan yang dikutip tidak ditemukan.",
          404,
        );
      }
    }

    const isSignal = data.isSignal && !replyToId && !quoteTarget;
    const authorId = session.user.id;

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId,
          content: data.content,
          replyToId,
          quoteOfId: quoteTarget?.id ?? null,
          isSignal,
          ...(isSignal
            ? {
                market: data.market,
                symbol: data.symbol,
                direction: data.direction,
                entry: data.entry,
                takeProfit: data.takeProfit,
                stopLoss: data.stopLoss,
                timeframe: data.timeframe,
                status: "OPEN" as const,
              }
            : {}),
        },
        include: postInclude,
      });

      if (isSignal) {
        await tx.signalStat.upsert({
          where: { userId: authorId },
          update: { totalSignals: { increment: 1 } },
          create: { userId: authorId, totalSignals: 1 },
        });
      }

      return created;
    });

    // Notifikasi tidak boleh menggagalkan postingan.
    try {
      if (replyToId && replyRootAuthorId) {
        await createNotification({
          recipientId: replyRootAuthorId,
          actorId: authorId,
          type: "reply",
          postId: row.id,
        });
      }
      if (quoteTarget) {
        await createNotification({
          recipientId: quoteTarget.authorId,
          actorId: authorId,
          type: "repost",
          postId: row.id,
        });
      }

      const mentioned = extractMentions(data.content);
      if (mentioned.length > 0) {
        const mentionedUsers = await prisma.user.findMany({
          where: { username: { in: mentioned } },
          select: { id: true },
        });
        // Penerima balasan/kutipan sudah dapat notifikasinya sendiri.
        const alreadyNotified = new Set(
          [authorId, replyRootAuthorId, quoteTarget?.authorId].filter(
            (value): value is string => Boolean(value),
          ),
        );
        for (const mentionedUser of mentionedUsers) {
          if (alreadyNotified.has(mentionedUser.id)) continue;
          await createNotification({
            recipientId: mentionedUser.id,
            actorId: authorId,
            type: "mention",
            postId: row.id,
          });
        }
      }
    } catch (error) {
      console.error("[posts] gagal membuat notifikasi", error);
    }

    return apiOk(
      {
        post: serializePost(row, {
          liked: false,
          reposted: false,
          bookmarked: false,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
