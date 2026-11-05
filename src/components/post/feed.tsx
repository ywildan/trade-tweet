"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { PostCard } from "@/components/post/post-card";
import { EmptyState } from "@/components/demo/stat-tile";
import { Button } from "@/components/ui/button";
import type { FeedPost } from "@/types/post";

export function Feed({
  initialItems,
  initialCursor,
  tab,
  isGuest,
  requiresAuth = false,
}: {
  initialItems: FeedPost[];
  initialCursor: string | null;
  tab: "foryou" | "following";
  isGuest: boolean;
  requiresAuth?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sinkronkan lagi saat server mengirim data baru (mis. setelah compose).
  const initialKey = `${initialCursor ?? ""}|${initialItems
    .map((post) => post.id)
    .join(",")}`;
  const [syncedKey, setSyncedKey] = useState(initialKey);
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey);
    setItems(initialItems);
    setCursor(initialCursor);
    setError(null);
  }

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/feed?tab=${tab}&cursor=${encodeURIComponent(cursor)}`,
        { cache: "no-store" },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "Gagal memuat feed.");
      }

      const incoming = (json.data.items ?? []) as FeedPost[];
      setItems((previous) => {
        const seen = new Set(previous.map((post) => post.id));
        return [...previous, ...incoming.filter((post) => !seen.has(post.id))];
      });
      setCursor((json.data.nextCursor as string | null) ?? null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal memuat feed.",
      );
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, tab]);

  useEffect(() => {
    const node = sentinelRef.current;
    // Saat error, observer dimatikan supaya retry hanya lewat tombol Coba lagi.
    if (!node || !cursor || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore, error]);

  if (requiresAuth) {
    return (
      <EmptyState
        title="Masuk dulu untuk melihat feed Mengikuti"
        subtitle="Feed ini berisi postingan dari trader yang kamu ikuti."
        cta={
          <Link href="/login?next=%2F%3Ftab%3Dfollowing">
            <Button size="sm">Masuk</Button>
          </Link>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Belum ada postingan di sini"
        subtitle={
          tab === "following"
            ? "Trader yang kamu ikuti belum memposting. Buat sinyal sendiri, atau cek lagi nanti."
            : "Jadilah yang pertama membagikan setup hari ini."
        }
        cta={
          isGuest ? (
            <Link href="/register">
              <Button size="sm">Daftar</Button>
            </Link>
          ) : (
            <Link href="/compose">
              <Button size="sm">Buat sinyal</Button>
            </Link>
          )
        }
      />
    );
  }

  return (
    <div>
      {items.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      <div ref={sentinelRef} className="py-6 text-center">
        {loading && (
          <span className="inline-flex items-center gap-2 text-[13px] text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            Memuat postingan…
          </span>
        )}
        {error && (
          <div className="space-y-2">
            <p className="text-[13px] text-short">{error}</p>
            <Button size="sm" variant="secondary" onClick={loadMore}>
              Coba lagi
            </Button>
          </div>
        )}
        {!loading && !error && !cursor && (
          <p className="text-[13px] text-text-muted">
            Kamu sudah melihat semuanya
          </p>
        )}
      </div>
    </div>
  );
}
