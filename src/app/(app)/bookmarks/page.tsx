import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/demo/stat-tile";
import { PostCard } from "@/components/post/post-card";
import { getUserBookmarks } from "@/lib/posts";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Simpanan",
};

export const instant = false;

export default async function BookmarksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fbookmarks");

  const posts = await getUserBookmarks(user.id, user.id);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-4 border-b border-border bg-bg/65 px-4 backdrop-blur">
        <h1 className="text-[20px] font-bold">Simpanan</h1>
        <span className="text-[13px] text-text-muted">
          {posts.length} postingan
        </span>
      </header>

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <EmptyState
          title="Belum ada simpanan"
          subtitle="Tekan ikon simpan di postingan untuk menyimpannya di sini."
          cta={
            <Link
              href="/"
              className="rounded-2xl bg-accent px-4 py-2 text-[15px] font-semibold text-white"
            >
              Jelajahi feed
            </Link>
          }
        />
      )}
    </>
  );
}
