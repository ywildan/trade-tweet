import { prisma } from "@/lib/db";

export type PostAnalytics = {
  authorId: string;
  views: number;
  likes: number;
  reposts: number;
  bookmarks: number;
  replies: number;
};

/** Angka analitik satu post — dipakai API owner-only dan panel detail post. */
export async function getPostAnalytics(
  postId: string,
): Promise<PostAnalytics | null> {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: {
      authorId: true,
      views: true,
      _count: {
        select: {
          likes: true,
          reposts: true,
          bookmarks: true,
          replies: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!post) return null;

  return {
    authorId: post.authorId,
    views: post.views,
    likes: post._count.likes,
    reposts: post._count.reposts,
    bookmarks: post._count.bookmarks,
    replies: post._count.replies,
  };
}
