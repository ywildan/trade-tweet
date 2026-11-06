import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { uniqueUsername } from "@/lib/usernames";

export const publicUserSelect = {
  id: true,
  username: true,
  usernameChangeCount: true,
  name: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  location: true,
  role: true,
  createdAt: true,
  badges: { select: { type: true }, orderBy: { awardedAt: "asc" } },
  signalStats: {
    select: {
      totalSignals: true,
      tpsHit: true,
      slsHit: true,
      expired: true,
      winRate: true,
      avgPnl: true,
    },
  },
  _count: {
    select: {
      followers: true,
      following: true,
      posts: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.UserSelect;

type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type PublicUser = {
  id: string;
  username: string;
  usernameChangeCount: number;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  location: string | null;
  role: string;
  createdAt: string;
  badges: string[];
  signalStat: PublicUserRow["signalStats"];
  counts: { followers: number; following: number; posts: number };
  email?: string;
};

export function serializePublicUser(
  row: PublicUserRow,
  email?: string | null,
): PublicUser {
  return {
    id: row.id,
    username: row.username,
    usernameChangeCount: row.usernameChangeCount,
    name: row.name,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    bannerUrl: row.bannerUrl,
    location: row.location,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    badges: row.badges.map((badge) => badge.type),
    signalStat: row.signalStats,
    counts: {
      followers: row._count.followers,
      following: row._count.following,
      posts: row._count.posts,
    },
    ...(email ? { email } : {}),
  };
}

/** Dipakai metadata + halaman pada request yang sama (diduplikasi oleh cache). */
export const getUserByUsername = cache(async (username: string) => {
  const row = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: publicUserSelect,
  });
  return row ? serializePublicUser(row) : null;
});

export async function getUserById(id: string) {
  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      ...publicUserSelect,
      email: true,
    },
  });
  return row ? serializePublicUser(row, row.email) : null;
}

type OAuthUserInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  usernameHint?: string | null;
};

/**
 * OAuth tidak memakai adapter: user dipetakan ke tabel User berdasarkan email.
 * X/Twitter OAuth 2 tidak mengirim email, jadi pemanggil memberi email sintetis
 * yang stabil per providerAccountId.
 */
export async function ensureOAuthUser(input: OAuthUserInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return existing;

  const username = await uniqueUsername(
    input.usernameHint || input.email.split("@")[0] || input.name || "trader",
  );
  const name = (input.name || username).trim().slice(0, 50) || username;

  try {
    return await prisma.user.create({
      data: {
        email,
        username,
        name,
        avatarUrl: input.image ?? null,
        signalStats: { create: {} },
      },
      select: { id: true },
    });
  } catch (error) {
    // Login OAuth beruntun bisa balapan membuat baris yang sama.
    if (isUniqueError(error)) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (user) return user;
    }
    throw error;
  }
}

function isUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
