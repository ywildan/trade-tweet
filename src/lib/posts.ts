import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type {
  FeedPost,
  FeedResult,
  PostAuthor,
  PostDetail,
  QuotePost,
  ViewerState,
} from "@/types/post";

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  badges: { select: { type: true }, orderBy: { awardedAt: "asc" } },
  signalStats: { select: { winRate: true } },
} satisfies Prisma.UserSelect;

/**
 * Bentuk data post dipakai feed, detail, dan profil.
 * Relasi balasan/kutipan membuat hitungan & QuoteCard cukup satu query.
 */
export const postInclude = {
  author: { select: authorSelect },
  quoteOf: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      isSignal: true,
      symbol: true,
      direction: true,
      status: true,
      author: { select: authorSelect },
    },
  },
  _count: {
    select: {
      likes: true,
      reposts: true,
      bookmarks: true,
      quotes: true,
      replies: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.PostInclude;

type PostRow = Prisma.PostGetPayload<{ include: typeof postInclude }>;
type PostAuthorRow = Pick<PostRow["author"], "id" | "username" | "name" | "avatarUrl"> & {
  badges: Array<{ type: string }>;
};

function toAuthor(row: PostAuthorRow): PostAuthor {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl,
    badges: row.badges.map((badge) => badge.type),
  };
}

function toQuote(row: PostRow["quoteOf"]): QuotePost | null {
  if (!row) return null;
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    author: toAuthor(row.author),
    isSignal: row.isSignal,
    symbol: row.symbol,
    direction: row.direction,
    status: row.status,
  };
}

export function serializePost(
  row: PostRow,
  viewer: ViewerState | null = null,
): FeedPost {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    views: row.views,
    replyToId: row.replyToId,
    quoteOfId: row.quoteOfId,
    isSignal: row.isSignal,
    market: row.market,
    symbol: row.symbol,
    direction: row.direction,
    entry: row.entry,
    takeProfit: row.takeProfit,
    stopLoss: row.stopLoss,
    timeframe: row.timeframe,
    status: row.isSignal ? row.status : null,
    pnlPercent: row.pnlPercent,
    disputed: row.disputed,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedBy: row.resolvedBy,
    resolveNote: row.resolveNote,
    author: toAuthor(row.author),
    counts: {
      likes: row._count.likes,
      reposts: row._count.reposts,
      bookmarks: row._count.bookmarks,
      replies: row._count.replies,
      quotes: row._count.quotes,
    },
    viewer,
    quote: toQuote(row.quoteOf),
  };
}

/** Status like/repost/simpan viewer untuk sekumpulan post (1 query per tabel). */
async function getViewerStates(
  postIds: string[],
  viewerId: string | null,
): Promise<Map<string, ViewerState>> {
  const states = new Map<string, ViewerState>();
  if (!viewerId || postIds.length === 0) return states;

  for (const id of postIds) {
    states.set(id, { liked: false, reposted: false, bookmarked: false });
  }

  const [likes, reposts, bookmarks] = await Promise.all([
    prisma.like.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: { postId: true },
    }),
    prisma.repost.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: { postId: true },
    }),
    prisma.bookmark.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: { postId: true },
    }),
  ]);

  for (const row of likes) {
    const state = states.get(row.postId);
    if (state) state.liked = true;
  }
  for (const row of reposts) {
    const state = states.get(row.postId);
    if (state) state.reposted = true;
  }
  for (const row of bookmarks) {
    const state = states.get(row.postId);
    if (state) state.bookmarked = true;
  }

  return states;
}

async function serializeList(
  rows: PostRow[],
  viewerId: string | null,
): Promise<FeedPost[]> {
  const states = await getViewerStates(
    rows.map((row) => row.id),
    viewerId,
  );
  return rows.map((row) => serializePost(row, states.get(row.id) ?? null));
}

export type FeedTab = "foryou" | "following";

const FEED_LIMIT = 20;

/**
 * Untuk Kamu — skor deterministik spesifikasi.md §6:
 * recency*1 + follow*2 + engagement*0.5 + signalQuality*1.5
 */
export async function getFeed({
  tab,
  cursor,
  viewerId,
  limit = FEED_LIMIT,
}: {
  tab: FeedTab;
  cursor?: string | null;
  viewerId: string | null;
  limit?: number;
}): Promise<FeedResult> {
  const take = Math.min(Math.max(limit, 1), 30);

  if (tab === "following") {
    if (!viewerId) return { items: [], nextCursor: null, requiresAuth: true };

    const follows = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const followingIds = follows.map((row) => row.followingId);
    if (followingIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    const rows = await prisma.post.findMany({
      where: {
        deletedAt: null,
        replyToId: null,
        authorId: { in: followingIds },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: postInclude,
    });

    const page = rows.slice(0, take);
    return {
      items: await serializeList(page, viewerId),
      nextCursor: rows.length > take ? page[page.length - 1].id : null,
    };
  }

  // Kandidat dibatasi supaya skor tetap ringan; cukup untuk fase awal.
  const [rows, follows] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: null, replyToId: null },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: postInclude,
    }),
    viewerId
      ? prisma.follow.findMany({
          where: { followerId: viewerId },
          select: { followingId: true },
        })
      : Promise.resolve([]),
  ]);

  const followed = new Set(follows.map((row) => row.followingId));
  const now = Date.now();

  const engagementRaw = (row: PostRow) =>
    Math.log1p(
      row._count.likes + row._count.reposts * 2 + row._count.replies * 1.5,
    );
  const maxEngagement =
    Math.max(1, ...rows.map((row) => engagementRaw(row))) || 1;

  const scored = rows
    .map((row) => {
      const hours = Math.max(0, (now - row.createdAt.getTime()) / 3_600_000);
      const recency = 1 / (1 + hours / 6);
      const followBonus = followed.has(row.authorId) ? 1 : 0;
      const engagement = engagementRaw(row) / maxEngagement;
      const quality = row.isSignal
        ? Math.min(1, Math.max(0, row.author.signalStats?.winRate ?? 0))
        : 0;

      return {
        row,
        score:
          recency * 1.0 +
          followBonus * 2.0 +
          engagement * 0.5 +
          quality * 1.5,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.row.createdAt.getTime() - a.row.createdAt.getTime(),
    );

  const offset = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0);
  const page = scored.slice(offset, offset + take);
  const hasMore = offset + take < scored.length;

  return {
    items: await serializeList(
      page.map((entry) => entry.row),
      viewerId,
    ),
    nextCursor: hasMore ? String(offset + take) : null,
  };
}

export async function getPostDetail(
  id: string,
  viewerId: string | null,
): Promise<PostDetail | null> {
  const row = await prisma.post.findFirst({
    where: { id, deletedAt: null },
    include: postInclude,
  });
  if (!row) return null;

  const [replies, parent] = await Promise.all([
    row.replyToId
      ? Promise.resolve([])
      : prisma.post.findMany({
          where: { replyToId: id, deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 100,
          include: postInclude,
        }),
    row.replyToId
      ? prisma.post.findFirst({
          where: { id: row.replyToId, deletedAt: null },
          select: {
            id: true,
            author: { select: authorSelect },
          },
        })
      : Promise.resolve(null),
  ]);

  const states = await getViewerStates(
    [row, ...replies].map((post) => post.id),
    viewerId,
  );

  return {
    post: serializePost(row, states.get(row.id) ?? null),
    replies: replies.map((reply) =>
      serializePost(reply, states.get(reply.id) ?? null),
    ),
    parent: parent
      ? { id: parent.id, author: toAuthor(parent.author) }
      : null,
  };
}

/** Post tingkat atas milik satu pengguna (tab Sinyal/Postingan). */
export async function getUserPosts(
  userId: string,
  viewerId: string | null,
  take = 40,
): Promise<FeedPost[]> {
  const rows = await prisma.post.findMany({
    where: { authorId: userId, deletedAt: null, replyToId: null },
    orderBy: { createdAt: "desc" },
    take,
    include: postInclude,
  });
  return serializeList(rows, viewerId);
}

/** Balasan buatan pengguna (tab Balasan). */
export async function getUserReplies(
  userId: string,
  viewerId: string | null,
  take = 40,
): Promise<FeedPost[]> {
  const rows = await prisma.post.findMany({
    where: {
      authorId: userId,
      deletedAt: null,
      replyToId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take,
    include: postInclude,
  });
  return serializeList(rows, viewerId);
}

/** Post yang direpost pengguna, urut waktu repost terbaru (tab Repost). */
export async function getUserReposts(
  userId: string,
  viewerId: string | null,
  take = 40,
): Promise<FeedPost[]> {
  const rows = await prisma.repost.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: take * 2,
    select: { post: { include: postInclude } },
  });

  const posts = rows
    .map((row) => row.post)
    .filter((post) => post.deletedAt === null)
    .slice(0, take);

  return serializeList(posts, viewerId);
}

/** Post yang disimpan pengguna (tab Simpan; hanya pemilik). */
export async function getUserBookmarks(
  userId: string,
  viewerId: string | null,
  take = 40,
): Promise<FeedPost[]> {
  const rows = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: take * 2,
    select: { post: { include: postInclude } },
  });

  const posts = rows
    .map((row) => row.post)
    .filter((post) => post.deletedAt === null)
    .slice(0, take);

  return serializeList(posts, viewerId);
}

/** Balasan sebuah thread root, untuk GET /api/posts/[id]/replies. */
export async function getPostReplies(
  postId: string,
  viewerId: string | null,
  take = 100,
): Promise<FeedPost[]> {
  const rows = await prisma.post.findMany({
    where: { replyToId: postId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take,
    include: postInclude,
  });
  return serializeList(rows, viewerId);
}

/** Pencarian isi post (spesifikasi.md §4 Phase 6). */
export async function searchPosts(
  query: string,
  viewerId: string | null,
  take = 10,
): Promise<FeedPost[]> {
  const rows = await prisma.post.findMany({
    where: {
      deletedAt: null,
      content: { contains: query, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take,
    include: postInclude,
  });
  return serializeList(rows, viewerId);
}

/** Post root untuk satu simbol (halaman /symbol/[symbol]). */
export async function getSymbolPosts(
  symbol: string,
  viewerId: string | null,
  take = 40,
): Promise<FeedPost[]> {
  const rows = await prisma.post.findMany({
    where: {
      symbol: symbol.toUpperCase(),
      deletedAt: null,
      replyToId: null,
    },
    orderBy: { createdAt: "desc" },
    take,
    include: postInclude,
  });
  return serializeList(rows, viewerId);
}
