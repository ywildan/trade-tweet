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

function detectTouch(
  signal: OpenSignal,
  high: number,
  low: number,
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
  const tpHit = isLong ? high >= signal.takeProfit : low <= signal.takeProfit;
  const slHit = isLong ? low <= signal.stopLoss : high >= signal.stopLoss;

  // Konservatif: bila keduanya tersentuh dalam rentang, pilih SL (§8.2).
  if (tpHit && slHit) return "SL_HIT";
  if (tpHit) return "TP_HIT";
  if (slHit) return "SL_HIT";
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
      const avgPnl =
        resolved > 0
          ? (stat.avgPnl * resolved + (pnl ?? 0)) / (resolved + 1)
          : (pnl ?? 0);

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

  const orderedGroups = [...groups.entries()]
    .sort(
      (a, b) =>
        Math.min(...a[1].map((signal) => signal.createdAt.getTime())) -
        Math.min(...b[1].map((signal) => signal.createdAt.getTime())),
    )
    .slice(0, MAX_SYMBOLS_PER_RUN);

  let resolved = 0;
  let expired = 0;
  let failedSymbols = 0;

  for (const [, group] of orderedGroups) {
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
      continue;
    }

    if (candles.length === 0) {
      failedSymbols += 1;
      console.error(
        `[signal-check] feed kosong ${first.market}:${first.symbol}`,
      );
      continue;
    }

    for (const signal of group) {
      try {
        // Rentang dihitung per sinyal: jangan memakai high/low sebelum entry.
        const entryTime = signal.createdAt.getTime();
        const relevant = candles.filter((candle) => candle.t >= entryTime);
        const used = relevant.length > 0 ? relevant : [candles[candles.length - 1]];

        let high = used[0].high;
        let low = used[0].low;
        for (const candle of used) {
          high = Math.max(high, candle.high);
          low = Math.min(low, candle.low);
        }
        const last = used[used.length - 1].close;

        await prisma.signalCheck.create({
          data: { postId: signal.id, ts: now, price: last },
        });

        const touched = detectTouch(signal, high, low);
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
