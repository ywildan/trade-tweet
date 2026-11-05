import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminBadgeList } from "@/components/admin/admin-badge-list";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Admin · Badge" };

export const instant = false;

export default async function AdminBadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fbadges");
  if (user.role !== "admin") notFound();

  const params = await searchParams;
  const rawQ = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (rawQ ?? "").trim();

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { username: "asc" },
    take: 50,
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      role: true,
      badges: { select: { type: true }, orderBy: { awardedAt: "asc" } },
      _count: { select: { posts: true, followers: true } },
    },
  });

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-2 border-b border-border bg-bg px-4">
        <div>
          <h1 className="text-[20px] font-bold leading-6">Admin · Badge</h1>
          <p className="text-[13px] leading-4 text-text-muted">
            Kelola badge manual: verified &amp; kurator
          </p>
        </div>
      </header>

      <form
        action="/admin/badges"
        method="get"
        role="search"
        className="border-b border-border px-4 py-3"
      >
        <label
          htmlFor="admin-user-search"
          className="mb-1 block text-[13px] font-semibold text-text"
        >
          Cari pengguna
        </label>
        <div className="flex gap-2">
          <input
            id="admin-user-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Cari username atau nama…"
            className="min-h-11 w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-[14px] placeholder:text-text-muted"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-text px-4 py-2 text-[14px] font-semibold text-bg transition-colors hover:bg-text/90"
          >
            Cari
          </button>
        </div>
      </form>
      {users.length === 50 && (
        <p className="border-b border-border px-4 py-2 text-[13px] text-text-muted">
          Menampilkan maksimal 50 pengguna, persempit dengan pencarian.
        </p>
      )}

      <AdminBadgeList
        users={users.map((row) => ({
          id: row.id,
          username: row.username,
          name: row.name,
          avatarUrl: row.avatarUrl,
          role: row.role,
          badges: row.badges.map((badge) => badge.type),
          posts: row._count.posts,
          followers: row._count.followers,
        }))}
      />
    </>
  );
}
