import type { Post } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { awardBadgesForAllUsers, awardBadgesForUser } from "@/lib/badges";
import { createNotification } from "@/lib/notifications";
import { getPriceFeed, type Candle } from "@/lib/price-feed";

export type ResolutionOutcome = "TP_HIT" | "SL_HIT" | "EXPIRED" | "CANCELLED";

const TIMEFRAME_MINUTES: Record<string, number> = {
  "15M": 15,
  "1H": 60,
  "4H": 240,
  "1D": 1440,
  "1W": 10080,
};

export function timeframeMinutes(timeframe: string | null): number {
  return TIMEFRAME_MINUTES[(timeframe ?? "4H").toUpperCase()] ?? 240;
}

/** PnL signed (%): LONG naik saat harga naik, SHORT sebaliknya. */
export function computeSignalPnl(
  direction: "LONG" | "SHORT",
  entry: number,
  exit: number,
): number {
  if (entry === 0) return 0;
  return direction === "LONG"
    ? ((exit - entry) / entry) * 100
    : ((entry - exit) / entry) * 100;
}

type OpenSignal = {
  id: string;
  authorId: string;
  market: "CRYPTO" | "METAL" | "FOREX" | "STOCK" | null;
  symbol: string | null;
  direction: "LONG" | "SHORT" | null;
  entry: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  timeframe: string | null;
  createdAt: Date;
};

/**
 * Deteksi touch secara kronologis, candle demi candle.
 * Prioritas SL hanya berlaku bila TP dan SL tersentuh di candle YANG SAMA
 * (§8.2) — bukan bila keduanya pernah tersentuh kapan pun sejak entry.
 * Sinyal yang TP dulu lalu retrace ke SL di candle berikutnya tetap TP.
 */
function detectTouch(
  signal: OpenSignal,
  candles: Candle[],
): "TP_HIT" | "SL_HIT" | null {
  if (
    !signal.direction ||
    signal.entry == null ||
    signal.takeProfit == null ||
    signal.stopLoss == null
  ) {
    return null;
  }

  const isLong = signal.direction === "LONG";
  const sorted = [...candles].sort((a, b) => a.t - b.t);
  for (const candle of sorted) {
    const tpHit = isLong
      ? candle.high >= signal.takeProfit
      : candle.low <= signal.takeProfit;
    const slHit = isLong
      ? candle.low <= signal.stopLoss
      : candle.high >= signal.stopLoss;

    // Konservatif di dalam satu candle: bila keduanya tersentuh, pilih SL.
    if (tpHit && slHit) return "SL_HIT";
    if (tpHit) return "TP_HIT";
    if (slHit) return "SL_HIT";
  }
  return null;
}

/**
 * Satu-satunya jalur update status sinyal (cron & override manual).
 * Return null bila sinyal sudah tidak OPEN (balapan / double resolve).
 */
export async function resolveSignal({
  postId,
  outcome,
  price,
  resolvedBy,
  note = null,
  disputed = false,
  notify = false,
}: {
  postId: string;
  outcome: ResolutionOutcome;
  price: number | null;
  resolvedBy: string;
  note?: string | null;
  disputed?: boolean;
  notify?: boolean;
}): Promise<{ post: Post; badges: string[] } | null> {
  const signal = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      isSignal: true,
      status: true,
      direction: true,
      entry: true,
      takeProfit: true,
      stopLoss: true,
    },
  });

  if (!signal || !signal.isSignal || signal.status !== "OPEN") return null;
  if (signal.entry == null || !signal.direction) return null;

  const exitPrice =
    outcome === "TP_HIT"
      ? signal.takeProfit
      : outcome === "SL_HIT"
        ? signal.stopLoss
        : outcome === "EXPIRED"
          ? price
          : null;

  const pnl =
    outcome === "CANCELLED" || exitPrice == null
      ? null
      : computeSignalPnl(signal.direction, signal.entry, exitPrice);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.post.updateMany({
      where: { id: postId, isSignal: true, status: "OPEN" },
      data: {
        status: outcome,
        resolvedAt: new Date(),
        resolvedBy,
        resolveNote: note,
        pnlPercent: pnl,
        disputed,
      },
    });
    if (result.count !== 1) return null;

    if (outcome !== "CANCELLED") {
      const stat = await tx.signalStat.upsert({
        where: { userId: signal.authorId },
        update: {},
        create: { userId: signal.authorId },
      });
      const resolved = stat.tpsHit + stat.slsHit + stat.expired;
      const tpsHit = stat.tpsHit + (outcome === "TP_HIT" ? 1 : 0);
      const slsHit = stat.slsHit + (outcome === "SL_HIT" ? 1 : 0);
      const expired = stat.expired + (outcome === "EXPIRED" ? 1 : 0);
      const denominator = tpsHit + slsHit;
      // PnL null (mis. EXPIRED tanpa harga feed) tidak boleh ditarik ke 0:
      // rata-rata tetap dari sinyal-sinyal yang PnL-nya diketahui.
      const avgPnl =
        pnl == null
          ? stat.avgPnl
          : resolved > 0
            ? (stat.avgPnl * resolved + pnl) / (resolved + 1)
            : pnl;

      await tx.signalStat.update({
        where: { userId: signal.authorId },
        data: {
          tpsHit,
          slsHit,
          expired,
          winRate: denominator > 0 ? tpsHit / denominator : 0,
          avgPnl,
        },
      });
    }

    return tx.post.findUnique({ where: { id: postId } });
  });

  if (!updated) return null;

  if (notify) {
    await createNotification({
      recipientId: signal.authorId,
      actorId: null,
      type: "signal_resolved",
      postId,
    });
  }

  const badges =
    outcome === "CANCELLED" ? [] : await awardBadgesForUser(signal.authorId);

  return { post: updated, badges };
}

export type SignalCheckSummary = {
  symbols: number;
  skippedSymbols: number;
  signals: number;
  resolved: number;
  expired: number;
  failedSymbols: number;
  badges: Record<string, string[]>;
};

const MAX_SYMBOLS_PER_RUN = 20;

/** Cron worker: batch OPEN signals, cek touch TP/SL, expire, badge sweep. */
export async function runSignalCheck(
  now = new Date(),
): Promise<SignalCheckSummary> {
  const signals = await prisma.post.findMany({
    where: {
      isSignal: true,
      status: "OPEN",
      deletedAt: null,
      market: { not: null },
      symbol: { not: null },
      direction: { not: null },
      entry: { not: null },
      takeProfit: { not: null },
      stopLoss: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authorId: true,
      market: true,
      symbol: true,
      direction: true,
      entry: true,
      takeProfit: true,
      stopLoss: true,
      timeframe: true,
      createdAt: true,
    },
  });

  const groups = new Map<string, OpenSignal[]>();
  for (const signal of signals) {
    const key = `${signal.market}:${signal.symbol?.toUpperCase()}`;
    const group = groups.get(key);
    if (group) group.push(signal);
    else groups.set(key, [signal]);
  }

  const orderedGroups = [...groups.entries()].sort(
    (a, b) =>
      Math.min(...a[1].map((signal) => signal.createdAt.getTime())) -
      Math.min(...b[1].map((signal) => signal.createdAt.getTime())),
  );
  // Cap 20 hanya membatasi pengecekan TP/SL via feed, bukan expiry:
  // expiry murni berbasis waktu (§8.4) dan harus jalan untuk semua grup,
  // termasuk grup yang feed-nya gagal atau terlewat cap.
  const feedGroups = orderedGroups.slice(0, MAX_SYMBOLS_PER_RUN);
  const skippedGroups = orderedGroups.slice(MAX_SYMBOLS_PER_RUN);

  let resolved = 0;
  let expired = 0;
  let failedSymbols = 0;

  async function expireIfDue(
    signal: OpenSignal,
    price: number | null,
  ): Promise<boolean> {
    const expiry = new Date(
      signal.createdAt.getTime() +
        timeframeMinutes(signal.timeframe) * 3 * 60_000,
    );
    if (now <= expiry) return false;
    try {
      const result = await resolveSignal({
        postId: signal.id,
        outcome: "EXPIRED",
        price,
        resolvedBy: "auto",
        notify: true,
      });
      if (result) {
        resolved += 1;
        expired += 1;
        return true;
      }
    } catch (error) {
      console.error(`[signal-check] gagal expire ${signal.id}`, error);
    }
    return false;
  }

  for (const [, group] of feedGroups) {
    const first = group[0];
    if (!first.market || !first.symbol) continue;

    const from = new Date(
      Math.min(...group.map((signal) => signal.createdAt.getTime())),
    );

    let candles: Candle[];
    try {
      candles = await getPriceFeed(first.market).getCandles(
        first.symbol,
        from,
        now,
      );
    } catch (error) {
      failedSymbols += 1;
      console.error(
        `[signal-check] gagal feed ${first.market}:${first.symbol}`,
        error,
      );
      // Feed gagal bukan alasan menahan expiry: resolve EXPIRED tanpa harga
      // (PnL null, rata-rata PnL tidak berubah) daripada OPEN selamanya.
      for (const signal of group) await expireIfDue(signal, null);
      continue;
    }

    if (candles.length === 0) {
      failedSymbols += 1;
      console.error(
        `[signal-check] feed kosong ${first.market}:${first.symbol}`,
      );
      for (const signal of group) await expireIfDue(signal, null);
      continue;
    }

    for (const signal of group) {
      try {
        // Rentang dihitung per sinyal: jangan memakai high/low sebelum entry.
        // Bila belum ada candle yang dimulai setelah entry, touch tidak bisa
        // dibuktikan — jangan memakai candle pra-entry sebagai bukti.
        const entryTime = signal.createdAt.getTime();
        const relevant = candles.filter((candle) => candle.t >= entryTime);
        if (relevant.length === 0) {
          await expireIfDue(signal, null);
          continue;
        }
        const last = relevant[relevant.length - 1].close;

        await prisma.signalCheck.create({
          data: { postId: signal.id, ts: now, price: last },
        });

        const touched = detectTouch(signal, relevant);
        const expiry = new Date(
          signal.createdAt.getTime() +
            timeframeMinutes(signal.timeframe) * 3 * 60_000,
        );
        const outcome: ResolutionOutcome | null =
          touched ?? (now > expiry ? "EXPIRED" : null);
        if (!outcome) continue;

        const result = await resolveSignal({
          postId: signal.id,
          outcome,
          price: last,
          resolvedBy: "auto",
          notify: true,
        });
        if (result) {
          resolved += 1;
          if (outcome === "EXPIRED") expired += 1;
        }
      } catch (error) {
        console.error(`[signal-check] gagal resolve ${signal.id}`, error);
      }
    }
  }

  // Grup di luar cap tetap diperiksa expiry-nya (tanpa harga feed).
  for (const [, group] of skippedGroups) {
    for (const signal of group) await expireIfDue(signal, null);
  }

  const badges = await awardBadgesForAllUsers();

  return {
    symbols: groups.size,
    skippedSymbols: Math.max(0, groups.size - MAX_SYMBOLS_PER_RUN),
    signals: signals.length,
    resolved,
    expired,
    failedSymbols,
    badges,
  };
}
