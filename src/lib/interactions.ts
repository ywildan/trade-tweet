import { prisma } from "@/lib/db";

export async function getPostForInteraction(postId: string) {
  return prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true },
  });
}

export async function getInteractionCounts(postId: string) {
  const [likes, reposts, bookmarks] = await Promise.all([
    prisma.like.count({ where: { postId } }),
    prisma.repost.count({ where: { postId } }),
    prisma.bookmark.count({ where: { postId } }),
  ]);
  return { likes, reposts, bookmarks };
}
