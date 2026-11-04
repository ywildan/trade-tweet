import { prisma } from "@/lib/db";
import {
  addDays,
  dayStart,
  utcDay,
  DAY_MS,
} from "@/lib/days";

function normalizeDay(input?: string | null): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const parsed = new Date(`${input}T00:00:00.000Z`);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === input
    ) {
      return input;
    }
  }
  return utcDay(new Date(Date.now() - DAY_MS));
}

/**
 * Rollup harian dashboard (spesifikasi.md §7).
 * Default menghitung kemarin UTC karena hari berjalan belum lengkap;
 * dashboard tetap membaca hari berjalan secara live.
 */
export async function refreshDailyStats(dayInput?: string) {
  const day = normalizeDay(dayInput);
  const start = dayStart(day);
  const end = dayStart(addDays(day, 1));

  const users = await prisma.user.findMany({ select: { id: true } });
  let written = 0;

  for (const user of users) {
    const [views, profileViews, likes, reposts, replies] = await Promise.all([
      prisma.postView.aggregate({
        where: {
          day,
          post: { authorId: user.id, deletedAt: null },
        },
        _sum: { count: true },
      }),
      prisma.profileView.count({ where: { profileId: user.id, day } }),
      prisma.like.count({
        where: {
          post: { authorId: user.id, deletedAt: null },
          createdAt: { gte: start, lt: end },
        },
      }),
      prisma.repost.count({
        where: {
          post: { authorId: user.id, deletedAt: null },
          createdAt: { gte: start, lt: end },
        },
      }),
      prisma.post.count({
        where: {
          replyTo: { authorId: user.id, deletedAt: null },
          deletedAt: null,
          createdAt: { gte: start, lt: end },
        },
      }),
    ]);

    const data = {
      views: views._sum.count ?? 0,
      profileViews,
      likes,
      reposts,
      replies,
    };

    await prisma.dailyStat.upsert({
      where: { userId_day: { userId: user.id, day } },
      update: data,
      create: { userId: user.id, day, ...data },
    });
    written += 1;
  }

  // Jendela rate limit lama (> 1 hari) tidak dipakai lagi.
  const staleLimits = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: new Date(Date.now() - DAY_MS) } },
  });

  return { day, users: written, rateLimitsRemoved: staleLimits.count };
}