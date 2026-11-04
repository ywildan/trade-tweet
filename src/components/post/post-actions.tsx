"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { ShareResultButton } from "@/components/post/share-result-button";
import { formatCount } from "@/lib/format";
import type { FeedPost } from "@/types/post";

type InteractionKind = "like" | "repost" | "bookmark";

/**
 * Engagement bar interaktif (DESIGN.md §5.1 & §9).
 * Semua toggle optimistis; gagal → rollback + toast.
 */
export function PostActions({
  post,
  className = "",
  showShare = true,
}: {
  post: FeedPost;
  className?: string;
  showShare?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const repostRef = useRef<HTMLDivElement>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [liked, setLiked] = useState(post.viewer?.liked ?? false);
  const [likes, setLikes] = useState(post.counts.likes);
  const [reposted, setReposted] = useState(post.viewer?.reposted ?? false);
  const [reposts, setReposts] = useState(post.counts.reposts);
  const [bookmarked, setBookmarked] = useState(
    post.viewer?.bookmarked ?? false,
  );
  const [bookmarks, setBookmarks] = useState(post.counts.bookmarks);
  const [likePop, setLikePop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<InteractionKind | null>(null);

  // Prop dari server berubah (refresh) → samakan state lokal saat render.
  const signature = [
    post.id,
    post.viewer?.liked,
    post.viewer?.reposted,
    post.viewer?.bookmarked,
    post.counts.likes,
    post.counts.reposts,
    post.counts.bookmarks,
  ].join("|");
  const [syncedSignature, setSyncedSignature] = useState(signature);
  if (signature !== syncedSignature) {
    setSyncedSignature(signature);
    setLiked(post.viewer?.liked ?? false);
    setLikes(post.counts.likes);
    setReposted(post.viewer?.reposted ?? false);
    setReposts(post.counts.reposts);
    setBookmarked(post.viewer?.bookmarked ?? false);
    setBookmarks(post.counts.bookmarks);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!repostRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    };
  }, []);

  function goLogin() {
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
  }

  async function mutate(kind: InteractionKind, next: boolean) {
    const response = await fetch(`/api/posts/${post.id}/${kind}`, {
      method: next ? "POST" : "DELETE",
    });
    const json = await response.json().catch(() => null);
    if (response.status === 401) {
      goLogin();
      throw new Error("auth");
    }
    if (!response.ok) {
      throw new Error(json?.error?.message ?? "Aksi gagal.");
    }
    return json.data as { count: number };
  }

  async function toggleLike() {
    if (post.viewer === null) return goLogin();
    if (busy) return;

    const next = !liked;
    setLiked(next);
    setLikes((count) => Math.max(0, count + (next ? 1 : -1)));
    if (next) {
      setLikePop(true);
      if (popTimer.current) clearTimeout(popTimer.current);
      popTimer.current = setTimeout(() => setLikePop(false), 320);
    }

    setBusy("like");
    try {
      const data = await mutate("like", next);
      setLikes(data.count);
    } catch (error) {
      setLiked(!next);
      setLikes((count) => Math.max(0, count + (next ? -1 : 1)));
      if (error instanceof Error && error.message !== "auth") {
        toast({ message: "Gagal memperbarui suka. Coba lagi." });
      }
    } finally {
      setBusy(null);
    }
  }

  async function toggleRepost() {
    setMenuOpen(false);
    if (post.viewer === null) return goLogin();
    if (busy) return;

    const next = !reposted;
    setReposted(next);
    setReposts((count) => Math.max(0, count + (next ? 1 : -1)));
    setBusy("repost");
    try {
      const data = await mutate("repost", next);
      setReposts(data.count);
      toast({
        message: next
          ? "Direpost ke profilmu."
          : "Repost dibatalkan.",
      });
    } catch (error) {
      setReposted(!next);
      setReposts((count) => Math.max(0, count + (next ? -1 : 1)));
      if (error instanceof Error && error.message !== "auth") {
        toast({ message: "Gagal merepost. Coba lagi." });
      }
    } finally {
      setBusy(null);
    }
  }

  function quotePost() {
    setMenuOpen(false);
    if (post.viewer === null) return goLogin();
    router.push(`/compose?quote=${post.id}`);
  }

  async function toggleBookmark() {
    if (post.viewer === null) return goLogin();
    if (busy) return;

    const next = !bookmarked;
    setBookmarked(next);
    setBookmarks((count) => Math.max(0, count + (next ? 1 : -1)));
    setBusy("bookmark");
    try {
      const data = await mutate("bookmark", next);
      setBookmarks(data.count);
      toast(
        next
          ? {
              message: "Ditambahkan ke Simpanan.",
              action: { label: "Lihat", href: "/bookmarks" },
            }
          : { message: "Dihapus dari Simpanan." },
      );
      if (!next && pathname.startsWith("/bookmarks")) router.refresh();
    } catch (error) {
      setBookmarked(!next);
      setBookmarks((count) => Math.max(0, count + (next ? -1 : 1)));
      if (error instanceof Error && error.message !== "auth") {
        toast({ message: "Gagal memperbarui Simpanan. Coba lagi." });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className={`relative mt-2 flex max-w-md items-center justify-between text-text-muted ${className}`}
    >
      <Link
        href={`/post/${post.id}`}
        onClick={(event) => event.stopPropagation()}
        aria-label={`Balas, ${post.counts.replies} balasan`}
        title="Balas"
        className="inline-flex items-center gap-1 rounded-full p-1.5 text-[13px] transition-colors hover:bg-accent/10 hover:text-accent"
      >
        <MessageCircle size={18} strokeWidth={1.8} />
        {post.counts.replies > 0 && (
          <span className="tabular">{formatCount(post.counts.replies)}</span>
        )}
      </Link>

      <div ref={repostRef} className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (post.viewer === null) return goLogin();
            setMenuOpen((open) => !open);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-pressed={reposted}
          aria-label={reposted ? "Batalkan repost" : "Repost"}
          title="Repost"
          className={`inline-flex items-center gap-1 rounded-full p-1.5 text-[13px] transition-colors hover:bg-repost/10 hover:text-repost ${
            reposted ? "text-repost" : ""
          }`}
        >
          <Repeat2
            size={18}
            strokeWidth={1.8}
            fill={reposted ? "currentColor" : "none"}
          />
          {reposts > 0 && (
            <span className="tabular">{formatCount(reposts)}</span>
          )}
        </button>

        {menuOpen && (
          <div
            role="menu"
            onClick={(event) => event.stopPropagation()}
            className="absolute bottom-full left-0 z-40 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-bg-elev py-1 shadow-2xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={toggleRepost}
              disabled={busy !== null}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-text/10 disabled:opacity-60"
            >
              <Repeat2 size={17} />
              {reposted ? "Batalkan repost" : "Repost"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={quotePost}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-text/10"
            >
              <MessageCircle size={17} />
              Kutip postingan
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toggleLike();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-pressed={liked}
        aria-label={liked ? "Batalkan suka" : "Suka"}
        title={liked ? "Batalkan suka" : "Suka"}
        className={`inline-flex items-center gap-1 rounded-full p-1.5 text-[13px] transition-colors hover:bg-like/10 hover:text-like ${
          liked ? "text-like" : ""
        }`}
      >
        <Heart
          size={18}
          strokeWidth={1.8}
          fill={liked ? "currentColor" : "none"}
          className={likePop ? "animate-like-pop" : undefined}
        />
        {likes > 0 && <span className="tabular">{formatCount(likes)}</span>}
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toggleBookmark();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Hapus dari Simpanan" : "Simpan"}
        title={bookmarked ? "Hapus dari Simpanan" : "Simpan"}
        className={`inline-flex items-center gap-1 rounded-full p-1.5 text-[13px] transition-colors hover:bg-save/10 hover:text-save ${
          bookmarked ? "text-save" : ""
        }`}
      >
        <Bookmark
          size={18}
          strokeWidth={1.8}
          fill={bookmarked ? "currentColor" : "none"}
        />
        {bookmarks > 0 && (
          <span className="tabular">{formatCount(bookmarks)}</span>
        )}
      </button>

      {showShare &&
        (post.status === "TP_HIT" && !post.disputed ? (
          <ShareResultButton postId={post.id} />
        ) : (
          <button
            type="button"
            disabled
            aria-label="Bagikan"
            title={
              post.disputed
                ? "Hasil ini diperdebatkan, kartu tidak tersedia."
                : "Kartu hasil tersedia untuk sinyal TP."
            }
            className="inline-flex cursor-not-allowed items-center gap-1 rounded-full p-1.5 text-[13px] opacity-60"
          >
            <Share size={18} strokeWidth={1.8} />
          </button>
        ))}
    </div>
  );
}
