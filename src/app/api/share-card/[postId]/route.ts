import { connection } from "next/server";
import { formatPnl, formatPrice } from "@/lib/format";
import { prisma } from "@/lib/db";
import { computeSignalPnl } from "@/lib/signal-resolver";

type Context = { params: Promise<{ postId: string }> };

// Kartu harus selalu mencerminkan status/PnL terbaru: tandai dinamis
// lewat connection() (segment config `dynamic` tidak kompatibel dengan
// Cache Components di Next 16 dan menggagalkan build).

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /api/share-card/[postId] — kartu SVG 1200×675 (DESIGN.md §5.4).
 * Hanya sinyal TP_HIT / SL_HIT yang tidak disputed.
 */
async function getShareCard(request: Request, context: Context) {
  await connection();
  const { postId } = await context.params;

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null, isSignal: true },
    select: {
      id: true,
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
          username: true,
          name: true,
          badges: { select: { type: true } },
          signalStats: { select: { winRate: true, totalSignals: true } },
        },
      },
    },
  });

  if (!post) {
    return Response.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Sinyal tidak ditemukan." } },
      { status: 404 },
    );
  }
  if (post.status !== "TP_HIT" && post.status !== "SL_HIT") {
    return Response.json(
      {
        ok: false,
        error: { code: "INVALID", message: "Kartu hanya untuk sinyal TP/SL." },
      },
      { status: 400 },
    );
  }
  if (post.disputed) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Hasil ini diperdebatkan, tidak boleh dibagikan.",
        },
      },
      { status: 403 },
    );
  }

  const symbol = escapeXml(post.symbol ?? "SIGNAL");
  const direction = post.direction === "SHORT" ? "SHORT" : "LONG";
  const isTp = post.status === "TP_HIT";
  const accent = isTp ? "#00ba7c" : "#f4212e";
  const statusLabel = isTp ? "TP TERCAPAI" : "SL TERSENTUH";
  const verified = post.author.badges.some((badge) => badge.type === "verified");

  const entry = post.entry ?? 0;
  const exit = isTp ? (post.takeProfit ?? entry) : (post.stopLoss ?? entry);
  const pnl =
    post.pnlPercent ??
    computeSignalPnl(direction === "SHORT" ? "SHORT" : "LONG", entry, exit);
  const winRate = Math.round((post.author.signalStats?.winRate ?? 0) * 100);
  const totalSignals = post.author.signalStats?.totalSignals ?? 0;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-labelledby="title desc" font-family="-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif">
  <title id="title">${symbol} ${direction} — ${statusLabel} ${formatPnl(pnl)}</title>
  <desc id="desc">Kartu hasil sinyal ${symbol} dari @${escapeXml(post.author.username)} di Neuraly.</desc>
  <defs>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow" cx="84%" cy="92%" r="78%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="675" fill="#0b0f14"/>
  <rect width="1200" height="675" fill="url(#grid)"/>
  <rect width="1200" height="675" fill="url(#glow)"/>

  <g transform="translate(64,42)">
    <rect x="0" y="16" width="8" height="28" rx="2" fill="#00ba7c"/>
    <line x1="4" y1="8" x2="4" y2="52" stroke="#00ba7c" stroke-width="2"/>
    <rect x="16" y="8" width="8" height="22" rx="2" fill="#f4212e"/>
    <line x1="20" y1="2" x2="20" y2="38" stroke="#f4212e" stroke-width="2"/>
    <rect x="32" y="22" width="8" height="20" rx="2" fill="#1d9bf0"/>
    <line x1="36" y1="14" x2="36" y2="50" stroke="#1d9bf0" stroke-width="2"/>
  </g>
  <text x="126" y="82" font-size="30" font-weight="700" fill="#e7e9ea">Neuraly</text>

  <text x="1136" y="80" text-anchor="end" font-size="18" letter-spacing="2" fill="#71767b">${
    verified ? "TRADER TERVERIFIKASI" : "SINYAL NEURALY"
  }</text>

  <text x="64" y="196" font-size="64" font-weight="700" fill="#e7e9ea">${symbol} <tspan fill="${accent}">· ${direction}</tspan></text>
  <text x="64" y="244" font-size="26" font-weight="700" letter-spacing="3" fill="${accent}">${statusLabel}</text>

  <text x="64" y="386" font-size="120" font-weight="700" fill="${accent}">${formatPnl(
    pnl,
  )}</text>

  <text x="64" y="462" font-size="27" fill="#9ba3ad">Entry ${formatPrice(
    entry,
  )} → ${isTp ? "TP" : "SL"} ${formatPrice(exit)} · Stop ${formatPrice(
    post.stopLoss ?? entry,
  )}</text>

  <line x1="64" y1="520" x2="1136" y2="520" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"/>

  <text x="64" y="592" font-size="28" font-weight="600" fill="#e7e9ea">@${escapeXml(
    post.author.username,
  )}</text>
  <text x="64" y="628" font-size="20" fill="#71767b">Win-rate ${winRate}% · ${totalSignals} sinyal</text>
  <text x="1136" y="628" text-anchor="end" font-size="20" fill="#71767b">Neuraly · sinyal dengan bukti</text>
</svg>`;

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=60, s-maxage=60",
  };
  if (download) {
    headers["Content-Disposition"] =
      `attachment; filename="neuraly-${post.symbol ?? "signal"}-${
        isTp ? "TP" : "SL"
      }-${post.id}.svg"`;
  }

  return new Response(svg, { status: 200, headers });
}

export async function GET(request: Request, context: Context) {
  try {
    return await getShareCard(request, context);
  } catch (error) {
    console.error("[share-card] gagal membuat kartu", error);
    return Response.json(
      {
        ok: false,
        error: { code: "INTERNAL", message: "Gagal membuat kartu share." },
      },
      { status: 500 },
    );
  }
}
