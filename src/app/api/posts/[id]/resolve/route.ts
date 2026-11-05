import { auth } from "@/auth";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPriceFeed } from "@/lib/price-feed";
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
        market: true,
        symbol: true,
        takeProfit: true,
        stopLoss: true,
        createdAt: true,
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

    // Bukti feed harus berupa high/low sejak entry, bukan close terakhir:
    // TP yang tersentuh lalu harga kembali tidak boleh ditandai disputed,
    // dan klaim tanpa bukti feed apa pun harus ditandai disputed.
    let disputed = false;
    if (parsed.data.outcome !== "CANCELLED" && post.direction) {
      let rangeChecked = false;
      if (post.market && post.symbol) {
        try {
          const range = await getPriceFeed(post.market).getRange(
            post.symbol,
            post.createdAt,
            new Date(),
          );
          rangeChecked = true;
          if (parsed.data.outcome === "TP_HIT" && post.takeProfit != null) {
            disputed =
              post.direction === "LONG"
                ? range.high < post.takeProfit
                : range.low > post.takeProfit;
          }
          if (parsed.data.outcome === "SL_HIT" && post.stopLoss != null) {
            disputed =
              post.direction === "LONG"
                ? range.low > post.stopLoss
                : range.high < post.stopLoss;
          }
        } catch {
          // Jatuh ke pemeriksaan close terakhir di bawah.
        }
      }
      if (!rangeChecked) {
        if (!lastCheck) {
          // Tidak ada snapshot feed sama sekali: klaim tidak terbukti.
          disputed = true;
        } else {
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
