import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { searchPosts } from "@/lib/posts";
import { searchCatalog, type SymbolEntry } from "@/lib/symbols";
import type { FeedPost } from "@/types/post";

export type SearchUser = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  badges: string[];
  followers: number;
  winRate: number;
  totalSignals: number;
};

export type SearchResults = {
  query: string;
  users: SearchUser[];
  posts: FeedPost[];
  symbols: SymbolEntry[];
};

const searchUserSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  bio: true,
  badges: { select: { type: true }, orderBy: { awardedAt: "asc" } },
  signalStats: { select: { winRate: true, totalSignals: true } },
  _count: { select: { followers: true } },
} satisfies Prisma.UserSelect;

type SearchUserRow = Prisma.UserGetPayload<{ select: typeof searchUserSelect }>;

function serializeSearchUser(row: SearchUserRow): SearchUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    badges: row.badges.map((badge) => badge.type),
    followers: row._count.followers,
    winRate: row.signalStats?.winRate ?? 0,
    totalSignals: row.signalStats?.totalSignals ?? 0,
  };
}

/** Cari user (username/nama), post (isi), dan simbol katalog dalam satu panggilan. */
export async function searchAll(
  rawQuery: string,
  viewerId: string | null,
): Promise<SearchResults> {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return { query, users: [], posts: [], symbols: [] };
  }

  const lower = query.toLowerCase();

  const [users, posts] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: lower, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { username: "asc" },
      take: 10,
      select: searchUserSelect,
    }),
    searchPosts(query, viewerId, 10),
  ]);

  const symbols = searchCatalog(query, 8);

  return {
    query,
    users: users.map(serializeSearchUser),
    posts,
    symbols,
  };
}
