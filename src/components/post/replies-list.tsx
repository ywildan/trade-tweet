"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

import { PostCard } from "@/components/post/post-card";
import { Button } from "@/components/ui/button";
import type { FeedPost } from "@/types/post";

const REPLIES_PAGE_SIZE = 20;

/**
 * Daftar balasan halaman detail: 20 pertama dari server, sisanya lewat
 * tombol "Muat balasan lainnya" (GET /api/posts/[id]/replies?cursor=…).
 * Pola sinkronisasi state mengikuti Feed: saat server mengirim data baru
 * (mis. setelah balas), state ikut diperbarui.
 */
export function RepliesList({
  postId,
  initialReplies,
  initialNextCursor,
  totalReplies,
}: {
  postId: string;
  initialReplies: FeedPost[];
  initialNextCursor: string | null;
  totalReplies: number;
}) {
  const [replies, setReplies] = useState(initialReplies);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialKey = `${initialNextCursor ?? ""}|${initialReplies
    .map((post) => post.id)
    .join(",")}`;
  const [syncedKey, setSyncedKey] = useState(initialKey);
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey);
    setReplies(initialReplies);
    setCursor(initialNextCursor);
    setError(null);
  }

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/posts/${postId}/replies?cursor=${encodeURIComponent(cursor)}&limit=${REPLIES_PAGE_SIZE}`,
        { cache: "no-store" },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "Gagal memuat balasan.");
      }

      const incoming = (json.data.items ?? []) as FeedPost[];
      setReplies((previous) => {
        const seen = new Set(previous.map((post) => post.id));
        return [...previous, ...incoming.filter((post) => !seen.has(post.id))];
      });
      setCursor((json.data.nextCursor as string | null) ?? null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal memuat balasan.",
      );
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, postId]);

  if (replies.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[15px] text-text-muted">
        Belum ada balasan. Tulis balasan di atas untuk memulai diskusi.
      </p>
    );
  }

  return (
    <>
      {replies.map((reply) => (
        <PostCard key={reply.id} post={reply} />
      ))}
      {cursor && (
        <div className="flex flex-col items-center gap-2 px-4 py-6">
          <p className="text-[13px] text-text-muted">
            Menampilkan {replies.length} dari {totalReplies} balasan
          </p>
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="secondary"
            size="sm"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? "Memuat…" : "Muat balasan lainnya"}
          </Button>
          {error && (
            <p className="text-[13px] text-short" role="alert">
              {error}{" "}
              <button
                type="button"
                onClick={loadMore}
                className="underline"
              >
                Coba lagi
              </button>
            </p>
          )}
        </div>
      )}
      {error && !cursor && (
        <p
          className="px-4 py-4 text-center text-[13px] text-short"
          role="alert"
        >
          {error}
        </p>
      )}
    </>
  );
}
