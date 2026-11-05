import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { countChars } from "@/lib/text";

/**
 * Award badge otomatis sesuai gerbang §9 (spesifikasi.md).
 * Hanya menambah; badge manual (verified/curator) tidak disentuh.
 */
export async function awardBadgesForUser(userId: string): Promise<string[]> {
  const [stat, existing, posts] = await Promise.all([
    prisma.signalStat.findUnique({ where: { userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { type: true },
    }),
    prisma.post.findMany({
      where: { authorId: userId, isSignal: false, deletedAt: null },
      select: { content: true },
    }),
  ]);

  // Badge analyst tidak bergantung pada sinyal sama sekali, jadi tidak
  // boleh terblokir hanya karena baris SignalStat belum ada.
  const resolved = stat ? stat.tpsHit + stat.slsHit + stat.expired : 0;
  const longPosts = posts.filter((post) => countChars(post.content) >= 200).length;
  const have = new Set(existing.map((badge) => badge.type));

  const earned: Array<"sniper" | "consistent" | "profit_hunter" | "analyst"> = [];
  if (
    stat &&
    stat.tpsHit >= 5 &&
    stat.winRate >= 0.7 &&
    resolved >= 10
  ) {
    earned.push("sniper");
  }
  if (stat && resolved >= 10 && stat.winRate >= 0.6) {
    earned.push("consistent");
  }
  if (stat && resolved >= 10 && stat.avgPnl >= 2) {
    earned.push("profit_hunter");
  }
  if (longPosts >= 20) {
    earned.push("analyst");
  }

  const awarded: string[] = [];
  for (const type of earned) {
    if (have.has(type)) continue;
    try {
      await prisma.userBadge.create({ data: { userId, type } });
      awarded.push(type);
      await createNotification({
        recipientId: userId,
        actorId: null,
        type: "badge_awarded",
      });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined;
      if (code !== "P2002") throw error;
    }
  }

  return awarded;
}

export async function awardBadgesForAllUsers() {
  const users = await prisma.user.findMany({ select: { id: true } });
  const awarded: Record<string, string[]> = {};

  for (const user of users) {
    const badges = await awardBadgesForUser(user.id);
    if (badges.length > 0) awarded[user.id] = badges;
  }

  return awarded;
}
