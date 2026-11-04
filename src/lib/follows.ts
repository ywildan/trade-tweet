import { prisma } from "@/lib/db";

export async function getIsFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  if (followerId === followingId) return false;
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  });
  return Boolean(row);
}
