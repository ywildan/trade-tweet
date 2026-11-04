import { prisma } from "@/lib/db";
import {
  DAY_MS,
  dayRangeBounds,
  dayStart,
  lastDays,
  utcDay,
} from "@/lib/days";
import type { SignalStatusName } from "@/types/post";

export const DASHBOARD_PERIOD_DAYS = 30;

export type DashboardDay = {
  day: string;
  views: number;
  likes: number;
  reposts: number;
  replies: number;
  engagement: number;
};

export type SignalStatusCounts = Record<SignalStatusName, number>;

export type DashboardTopPost = {
  id: string;
  content: string;
  symbol: string | null;
  isSignal: boolean;
  createdAt: string;
  views: number;
  likes: number;
  reposts: number;
  replies: number;
  engagement: number;
};

export type DashboardSummary = {
  periodDays: number;
  views: {
    total: number;
    previous: number;
    delta: number | null;
    series: number[];
  };
  followers: {
    total: number;
    newInPeriod: number;
    previousPeriod: number;
    delta: number | null;
    /** Jumlah pengikut kumulatif di akhir tiap hari. */
    series: number[];
  };
  engagement: {
    likes: number;
    reposts: number;
    replies: number;
    total: number;
    /** (interaksi ÷ tayangan) × 100. */
    rate: number;
  };
  signals: {
    totalSignals: number;
    tpsHit: number;
    slsHit: number;
    expired: number;
    winRate: number;
    avgPnl: number;
    avgRr: number | null;
    rrSamples: number;
    statuses: SignalStatusCounts;
  };
  topPost: DashboardTopPost | null;
};

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return ((current - previous) / previous) * 100;
}

/**
 * Timeseries 30 hari: views & interaksi diterima (like/repost/balasan).
 * Nilai harian diambil live dari tabel sumber; bila cron DailyStat sudah
 * menulis hari tersebut, angka cache dipakai (spesifikasi.md §7).
 */
export async function getDashboardTimeseries(
  userId: string,
  days = DASHBOARD_PERIOD_DAYS,
): Promise<DashboardDay[]> {
  const dayList = lastDays(days);
  const { from, to } = dayRangeBounds(dayList);

  const [viewRows, likes, reposts, replies, dailyStats] = await Promise.all([
    prisma.postView.findMany({
      where: {
        day: { in: dayList },
        post: { authorId: userId, deletedAt: null },
      },
      select: { day: true, count: true },
    }),
    prisma.like.findMany({
      where: {
        post: { authorId: userId, deletedAt: null },
        createdAt: { gte: from, lt: to },
      },
      select: { createdAt: true },
    }),
    prisma.repost.findMany({
      where: {
        post: { authorId: userId, deletedAt: null },
        createdAt: { gte: from, lt: to },
      },
      select: { createdAt: true },
    }),
    prisma.post.findMany({
      where: {
        replyTo: { authorId: userId, deletedAt: null },
        deletedAt: null,
        createdAt: { gte: from, lt: to },
      },
      select: { createdAt: true },
    }),
    prisma.dailyStat.findMany({
      where: { userId, day: { in: dayList } },
      select: {
        day: true,
        views: true,
        likes: true,
        reposts: true,
        replies: true,
      },
    }),
  ]);

  const points = new Map<string, DashboardDay>();
  for (const day of dayList) {
    points.set(day, {
      day,
      views: 0,
      likes: 0,
      reposts: 0,
      replies: 0,
      engagement: 0,
    });
  }

  for (const row of viewRows) {
    const point = points.get(row.day);
    if (point) point.views += row.count;
  }
  for (const row of likes) {
    const point = points.get(utcDay(row.createdAt));
    if (point) point.likes += 1;
  }
  for (const row of reposts) {
    const point = points.get(utcDay(row.createdAt));
    if (point) point.reposts += 1;
  }
  for (const row of replies) {
    const point = points.get(utcDay(row.createdAt));
    if (point) point.replies += 1;
  }

  // Hari berjalan selalu live; hari lampau boleh memakai cache DailyStat.
  const today = dayList[dayList.length - 1];
  for (const stat of dailyStats) {
    if (stat.day === today) continue;
    const point = points.get(stat.day);
    if (!point) continue;
    point.views = stat.views;
    point.likes = stat.likes;
    point.reposts = stat.reposts;
    point.replies = stat.replies;
  }

  return dayList.map((day) => {
    const point = points.get(day)!;
    point.engagement = point.likes + point.reposts + point.replies;
    return point;
  });
}

/** Ringkasan dashboard (spesifikasi.md §4 Phase 5). */
export async function getDashboardSummary(
  userId: string,
  series?: DashboardDay[],
): Promise<DashboardSummary> {
  const points = series ?? (await getDashboardTimeseries(userId));
  const dayList = points.map((point) => point.day);
  const { from } = dayRangeBounds(dayList);
  const previousDays = lastDays(
    DASHBOARD_PERIOD_DAYS,
    new Date(from.getTime() - 1),
  );

  const [
    previousViews,
    totalFollowers,
    followerRows,
    signalStat,
    statusRows,
    rrSignals,
    topViewRows,
  ] = await Promise.all([
    prisma.postView.aggregate({
      where: {
        day: { in: previousDays },
        post: { authorId: userId, deletedAt: null },
      },
      _sum: { count: true },
    }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.findMany({
      where: { followingId: userId },
      select: { createdAt: true },
    }),
    prisma.signalStat.findUnique({ where: { userId } }),
    prisma.post.groupBy({
      by: ["status"],
      where: { authorId: userId, isSignal: true, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.post.findMany({
      where: {
        authorId: userId,
        isSignal: true,
        deletedAt: null,
        status: { not: "CANCELLED" },
        entry: { not: null },
        takeProfit: { not: null },
        stopLoss: { not: null },
      },
      select: { entry: true, takeProfit: true, stopLoss: true },
    }),
    prisma.postView.groupBy({
      by: ["postId"],
      where: {
        day: { in: dayList },
        post: { authorId: userId, deletedAt: null },
      },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 1,
    }),
  ]);

  const viewsTotal = points.reduce((sum, point) => sum + point.views, 0);
  const viewsPrevious = previousViews._sum.count ?? 0;

  const likes = points.reduce((sum, point) => sum + point.likes, 0);
  const reposts = points.reduce((sum, point) => sum + point.reposts, 0);
  const replies = points.reduce((sum, point) => sum + point.replies, 0);
  const engagements = likes + reposts + replies;

  const followerTimes = followerRows
    .map((row) => row.createdAt.getTime())
    .sort((a, b) => a - b);
  const followerBase = followerTimes.filter(
    (time) => time < from.getTime(),
  ).length;

  let followerCursor = 0;
  let followerRunning = followerBase;
  const followerSeries = dayList.map((day) => {
    const end = dayStart(day).getTime() + DAY_MS;
    while (
      followerCursor < followerTimes.length &&
      followerTimes[followerCursor] < end
    ) {
      followerRunning += 1;
      followerCursor += 1;
    }
    return followerRunning;
  });

  const newInPeriod = followerRunning - followerBase;
  const previousFrom = dayStart(previousDays[0]).getTime();
  const previousPeriod = followerTimes.filter(
    (time) => time >= previousFrom && time < from.getTime(),
  ).length;

  const statuses: SignalStatusCounts = {
    OPEN: 0,
    TP_HIT: 0,
    SL_HIT: 0,
    EXPIRED: 0,
    CANCELLED: 0,
  };
  for (const row of statusRows) {
    if (row.status && row.status in statuses) {
      statuses[row.status as SignalStatusName] = row._count._all;
    }
  }

  const ratios = rrSignals
    .map((signal) => {
      const reward = Math.abs(signal.takeProfit! - signal.entry!);
      const risk = Math.abs(signal.entry! - signal.stopLoss!);
      return risk > 0 ? reward / risk : NaN;
    })
    .filter((ratio) => Number.isFinite(ratio) && ratio > 0);
  const avgRr =
    ratios.length > 0
      ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
      : null;

  const topPost = await getTopPost(userId, topViewRows[0]);

  return {
    periodDays: DASHBOARD_PERIOD_DAYS,
    views: {
      total: viewsTotal,
      previous: viewsPrevious,
      delta: percentDelta(viewsTotal, viewsPrevious),
      series: points.map((point) => point.views),
    },
    followers: {
      total: totalFollowers,
      newInPeriod,
      previousPeriod,
      delta: percentDelta(newInPeriod, previousPeriod),
      series: followerSeries,
    },
    engagement: {
      likes,
      reposts,
      replies,
      total: engagements,
      rate: viewsTotal > 0 ? (engagements / viewsTotal) * 100 : 0,
    },
    signals: {
      totalSignals: signalStat?.totalSignals ?? 0,
      tpsHit: signalStat?.tpsHit ?? 0,
      slsHit: signalStat?.slsHit ?? 0,
      expired: signalStat?.expired ?? 0,
      winRate: signalStat?.winRate ?? 0,
      avgPnl: signalStat?.avgPnl ?? 0,
      avgRr,
      rrSamples: ratios.length,
      statuses,
    },
    topPost,
  };
}

const topPostSelect = {
  id: true,
  content: true,
  symbol: true,
  isSignal: true,
  createdAt: true,
  _count: {
    select: {
      likes: true,
      reposts: true,
      replies: { where: { deletedAt: null } },
    },
  },
} as const;

async function getTopPost(
  userId: string,
  topView: { postId: string; _sum: { count: number | null } } | undefined,
): Promise<DashboardTopPost | null> {
  if (topView) {
    const row = await prisma.post.findFirst({
      where: { id: topView.postId, deletedAt: null },
      select: topPostSelect,
    });
    if (row) return serializeTopPost(row, topView._sum.count ?? 0);
  }

  const fallback = await prisma.post.findFirst({
    where: { authorId: userId, deletedAt: null },
    orderBy: [{ views: "desc" }, { createdAt: "desc" }],
    select: { ...topPostSelect, views: true },
  });
  return fallback ? serializeTopPost(fallback, fallback.views) : null;
}

function serializeTopPost(
  row: {
    id: string;
    content: string;
    symbol: string | null;
    isSignal: boolean;
    createdAt: Date;
    _count: { likes: number; reposts: number; replies: number };
  },
  views: number,
): DashboardTopPost {
  const engagement = row._count.likes + row._count.reposts + row._count.replies;
  return {
    id: row.id,
    content: row.content,
    symbol: row.symbol,
    isSignal: row.isSignal,
    createdAt: row.createdAt.toISOString(),
    views,
    likes: row._count.likes,
    reposts: row._count.reposts,
    replies: row._count.replies,
    engagement,
  };
}
