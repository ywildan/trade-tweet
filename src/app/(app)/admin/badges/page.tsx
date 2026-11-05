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
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-2 border-b border-border bg-bg/65 px-4 backdrop-blur">
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
        className="flex gap-2 border-b border-border px-4 py-3"
      >
        <label className="sr-only" htmlFor="admin-user-search">
          Cari pengguna
        </label>
        <input
          id="admin-user-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Cari username atau nama…"
          className="w-full rounded-xl border border-border bg-bg-input px-3 py-2 text-[14px] outline-none placeholder:text-text-muted"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-2 text-[14px] font-semibold text-white"
        >
          Cari
        </button>
      </form>
      {users.length === 50 && (
        <p className="border-b border-border px-4 py-2 text-[13px] text-text-muted">
          Menampilkan maksimal 50 pengguna — persempit dengan pencarian.
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
