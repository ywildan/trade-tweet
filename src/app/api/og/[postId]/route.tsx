import { connection } from "next/server";
import { ImageResponse } from "next/og";

import { prisma } from "@/lib/db";
import { formatPnl, formatPrice } from "@/lib/format";

type Context = { params: Promise<{ postId: string }> };

// Gambar OG mencerminkan status/PnL terbaru, jadi tandai dinamis lewat
// connection(). Segment config `dynamic` tidak kompatibel dengan Cache
// Components di Next 16 dan menggagalkan build.

const BG = "#0f1419";
const TEXT = "#e7e9ea";
const MUTED = "#9aa0a6";
const DIVIDER = "#2f3336";
const CHIP_TEXT = "#000000";
const LONG = "#00ba7c";
const SHORT = "#f4212e";
const ACCENT = "#1d9bf0";

/**
 * GET /api/og/[postId]: gambar OG 1200x630 (spesifikasi.md §4 Phase 6).
 * ImageResponse bawaan Next (satori/resvg), tanpa dependensi tambahan.
 */
async function getOg(_request: Request, context: Context) {
  await connection();
  const { postId } = await context.params;

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: {
      content: true,
      isSignal: true,
      symbol: true,
      direction: true,
      entry: true,
      takeProfit: true,
      stopLoss: true,
      status: true,
      pnlPercent: true,
      disputed: true,
      author: {
        select: {
          name: true,
          username: true,
          badges: { select: { type: true } },
          signalStats: { select: { winRate: true, totalSignals: true } },
        },
      },
    },
  });

  if (!post) {
    return new Response("Postingan tidak ditemukan", { status: 404 });
  }

  const verified = post.author.badges.some(
    (badge) => badge.type === "verified",
  );
  const winRate = Math.round((post.author.signalStats?.winRate ?? 0) * 100);
  const totalSignals = post.author.signalStats?.totalSignals ?? 0;

  const isResolved =
    post.isSignal && (post.status === "TP_HIT" || post.status === "SL_HIT");
  // Arah diwarnai menurut arahnya sendiri, bukan menurut hasil: LONG
  // selalu hijau, SHORT selalu merah.
  const directionTone = post.direction === "SHORT" ? SHORT : LONG;
  // Status selalu berlabel teks di atas latar solid, jadi terbaca tanpa
  // mengandalkan warna. Kadaluwarsa/dibatalkan memakai abu supaya biru
  // hanya untuk sinyal yang masih terbuka.
  const statusBg =
    post.status === "TP_HIT"
      ? LONG
      : post.status === "SL_HIT"
        ? SHORT
        : post.status === "OPEN"
          ? ACCENT
          : MUTED;
  const pnlTone = post.status === "TP_HIT" ? LONG : SHORT;
  const statusLabel =
    post.status === "TP_HIT"
      ? "TP TERCAPAI"
      : post.status === "SL_HIT"
        ? "SL TERSENTUH"
        : post.status === "OPEN"
          ? "SINYAL TERBUKA"
          : post.status === "EXPIRED"
            ? "KEDALUWARSA"
            : "DIBATALKAN";

  const content = post.content.replace(/\s+/g, " ").slice(0, 180);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          padding: "56px 64px",
          color: TEXT,
          fontFamily:
            '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                width: "10px",
              }}
            >
              <div style={{ height: "26px", background: LONG, borderRadius: "2px" }} />
              <div style={{ height: "18px", background: SHORT, borderRadius: "2px" }} />
              <div style={{ height: "22px", background: ACCENT, borderRadius: "2px" }} />
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700 }}>Neuraly</div>
          </div>
          <div style={{ fontSize: "17px", color: MUTED }}>
            {verified ? "TRADER TERVERIFIKASI" : "SINYAL NEURALY"}
          </div>
        </div>

        {post.isSignal ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "18px" }}>
              <span style={{ fontSize: "68px", fontWeight: 700 }}>
                {post.symbol ?? "SIGNAL"}
              </span>
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: 700,
                  color: directionTone,
                }}
              >
                · {post.direction ?? "LONG"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                backgroundColor: statusBg,
                color: CHIP_TEXT,
                fontSize: "20px",
                fontWeight: 700,
                padding: "10px 16px",
                borderRadius: "8px",
                marginTop: "18px",
              }}
            >
              {statusLabel}
              {post.disputed ? " · DIPERDEBATKAN" : ""}
            </div>
            <div style={{ display: "flex", marginTop: "26px" }}>
              {isResolved && post.pnlPercent != null ? (
                <span
                  style={{
                    fontSize: "116px",
                    fontWeight: 700,
                    color: pnlTone,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatPnl(post.pnlPercent)}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "58px",
                    fontWeight: 700,
                    color: TEXT,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Entry {formatPrice(post.entry ?? 0)}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "26px",
                color: MUTED,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              TP {formatPrice(post.takeProfit ?? 0)} · SL{" "}
              {formatPrice(post.stopLoss ?? 0)}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: "42px", fontWeight: 700 }}>
              {post.author.name}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "34px",
                lineHeight: 1.45,
                color: TEXT,
                marginTop: "14px",
                maxWidth: "980px",
              }}
            >
              {content || `Postingan @${post.author.username} di Neuraly`}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${DIVIDER}`,
            paddingTop: "22px",
            fontSize: "22px",
            color: MUTED,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ color: TEXT, fontWeight: 600 }}>
            @{post.author.username}
          </span>
          <span>
            Win-rate {winRate}% · {totalSignals} sinyal · sinyal dengan bukti
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    },
  );
}

export async function GET(request: Request, context: Context) {
  try {
    return await getOg(request, context);
  } catch (error) {
    console.error("[og] gagal membuat gambar", error);
    return new Response("Gagal membuat gambar OG", { status: 500 });
  }
}
