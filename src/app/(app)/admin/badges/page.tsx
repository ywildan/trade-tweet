import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminBadgeList } from "@/components/admin/admin-badge-list";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Admin · Badge" };

export const instant = false;

export default async function AdminBadgesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fbadges");
  if (user.role !== "admin") notFound();

  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
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
