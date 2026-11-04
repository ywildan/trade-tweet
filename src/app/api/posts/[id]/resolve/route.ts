import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { resolveSignal } from "@/lib/signal-resolver";
import { resolveSignalSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

/** POST /api/posts/[id]/resolve — finalisasi manual (khusus pembuat). */
export async function POST(request: Request, context: Context) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("UNAUTH", "Masuk dulu untuk mengelola sinyal.", 401);
    }

    const { id } = await context.params;
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        authorId: true,
        isSignal: true,
        status: true,
        direction: true,
        takeProfit: true,
        stopLoss: true,
      },
    });

    if (!post) return apiError("NOT_FOUND", "Postingan tidak ditemukan.", 404);
    if (post.authorId !== session.user.id) {
      return apiError("FORBIDDEN", "Hanya pembuat sinyal yang bisa menutupnya.", 403);
    }
    if (!post.isSignal) {
      return apiError("INVALID", "Postingan ini bukan sinyal.", 400);
    }
    if (post.status !== "OPEN") {
      return apiError("CONFLICT", "Sinyal ini sudah selesai.", 409);
    }

    const body = await request.json().catch(() => null);
    const parsed = resolveSignalSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID", "Data penutupan tidak valid.", 400, {
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const lastCheck = await prisma.signalCheck.findFirst({
      where: { postId: id },
      orderBy: { ts: "desc" },
      select: { price: true },
    });

    let disputed = false;
    if (lastCheck && post.direction) {
      const price = lastCheck.price;
      if (parsed.data.outcome === "TP_HIT" && post.takeProfit != null) {
        disputed =
          post.direction === "LONG"
            ? price < post.takeProfit
            : price > post.takeProfit;
      }
      if (parsed.data.outcome === "SL_HIT" && post.stopLoss != null) {
        disputed =
          post.direction === "LONG"
            ? price > post.stopLoss
            : price < post.stopLoss;
      }
    }

    const result = await resolveSignal({
      postId: id,
      outcome: parsed.data.outcome,
      price: lastCheck?.price ?? null,
      resolvedBy: session.user.id,
      note: parsed.data.note,
      disputed,
      notify: false,
    });

    if (!result) {
      return apiError("CONFLICT", "Sinyal ini sudah selesai.", 409);
    }

    return apiOk({
      id: result.post.id,
      status: result.post.status,
      pnlPercent: result.post.pnlPercent,
      disputed: result.post.disputed,
      resolveNote: result.post.resolveNote,
      badges: result.badges,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
