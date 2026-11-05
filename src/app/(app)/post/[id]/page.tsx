import type { Metadata } from "next";
import { Suspense } from "react";
import { after } from "next/server";
import { BackButton } from "@/components/ui/back-button";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { UserBadges } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComposeBox } from "@/components/post/compose-box";
import { PostActions } from "@/components/post/post-actions";
import { ShareResultButton } from "@/components/post/share-result-button";
import { SignalResolveForm } from "@/components/post/signal-resolve-form";
import { QuoteCard, RichContent } from "@/components/post/post-card";
import { RepliesList } from "@/components/post/replies-list";
import { SignalCard } from "@/components/post/signal-card";
import { hasSignalShape } from "@/lib/post-guards";
import { getPostAnalytics } from "@/lib/analytics";
import { formatCount, formatPostDate, formatRelativeTime } from "@/lib/format";
import { getPostDetail, getPostReplies, getPostRow } from "@/lib/posts";
import { getSession } from "@/lib/session";
import {
  getPostViewContext,
  recordPostViewWithContext,
} from "@/lib/views";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  // Satu query dengan halaman (React cache di getPostRow).
  const row = await getPostRow(id);

  if (!row) return { title: "Postingan tidak ditemukan" };

  const snippet =
    row.content.trim().replace(/\s+/g, " ").slice(0, 70) ||
    (row.isSignal && row.symbol
      ? `Sinyal ${row.symbol} dari @${row.author.username}`
      : `Postingan @${row.author.username}`);

  const title = `${snippet} · @${row.author.username}`;
  const description = `Postingan ${row.author.name} di Neuraly.`;

  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/api/og/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Postingan @${row.author.username} di Neuraly`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  // Sesi (JWT, tanpa query DB) dan baris post jalan bersamaan; baris post
  // dipakai lagi oleh getPostDetail lewat cache yang sama.
  const [session, row] = await Promise.all([getSession(), getPostRow(id)]);
  if (!row) notFound();
  // Balasan tidak ikut di sini (repliesTake 0): dimuat seksi streaming
  // sendiri di bawah, supaya konten postingan tidak menunggunya.
  const detail = await getPostDetail(id, session?.user.id ?? null, {
    repliesTake: 0,
  });
  if (!detail) notFound();

  // Konteks view dibaca saat render; pencatatan jalan setelah response
  // terkirim (after) dan tidak menahan render. Angka views yang tampil
  // adalah kolom views — boleh tertinggal 1 di kunjungan pertama.
  const viewContext = await getPostViewContext(session?.user.id ?? null);
  after(async () => {
    try {
      await recordPostViewWithContext(
        id,
        viewContext.viewerKey,
        viewContext.day,
      );
    } catch {
      // Kegagalan pencatatan view tidak boleh menggagalkan halaman.
    }
  });

  const { post, parent } = detail;
  const viewerId = session?.user.id ?? null;
  const signal = hasSignalShape(post) ? post : null;
  const isOwner = session?.user.id === post.author.id;

  const replyTarget = parent
    ? {
        id: parent.id,
        username: parent.author.username,
        name: parent.author.name,
      }
    : {
        id: post.id,
        username: post.author.username,
        name: post.author.name,
      };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-4 border-b border-border bg-bg px-3">
        <BackButton />
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold leading-6">Postingan</h1>
          <p className="text-[13px] leading-4 text-text-muted">
            {post.counts.replies} balasan
          </p>
        </div>
      </header>

      {parent && (
        <Link
          href={`/post/${parent.id}`}
          className="block border-b border-border px-4 py-2 text-[13px] text-text-muted transition-colors hover:bg-text/[0.03]"
        >
          Membalas{" "}
          <span className="text-accent">@{parent.author.username}</span> ·
          lihat thread
        </Link>
      )}

      <article className="border-b border-border px-4 py-4">
        <div className="flex gap-3">
          <Link
            href={`/@${post.author.username}`}
            aria-label={`Profil ${post.author.name}`}
            className="h-fit rounded-full"
          >
            <Avatar
              name={post.author.name}
              src={post.author.avatarUrl}
              size={48}
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <Link
                href={`/@${post.author.username}`}
                className="truncate font-bold hover:underline"
              >
                {post.author.name}
              </Link>
              <UserBadges types={post.author.badges} />
              <Link
                href={`/@${post.author.username}`}
                className="text-[15px] text-text-muted hover:underline"
              >
                @{post.author.username}
              </Link>
            </div>

            <div className="mt-0.5 text-[13px] text-text-muted">
              <time
                dateTime={post.createdAt}
                suppressHydrationWarning
                title={new Date(post.createdAt).toLocaleString("id-ID")}
              >
                {formatRelativeTime(post.createdAt)}
              </time>
              {post.disputed && (
                <span className="ml-2 rounded-full bg-gold/10 px-2 py-[1px] text-[11px] font-semibold text-gold">
                  hasil diperdebatkan
                </span>
              )}
            </div>

            {post.content && (
              <RichContent
                text={post.content}
                className="mt-3 text-[17px] leading-6"
              />
            )}

            {signal && (
              <div className="mt-3">
                <SignalCard
                  symbol={signal.symbol}
                  direction={signal.direction}
                  market={signal.market}
                  entry={signal.entry}
                  takeProfit={signal.takeProfit}
                  stopLoss={signal.stopLoss}
                  timeframe={signal.timeframe}
                  status={signal.status}
                  pnlPercent={signal.pnlPercent}
                />
              </div>
            )}

            {post.quote && (
              <div className="mt-3">
                <QuoteCard quote={post.quote} />
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-y border-border py-3 text-[13px] text-text-muted">
              <span>
                <b className="text-text">{formatCount(post.views)}</b> tayangan
              </span>
              <span>
                <b className="text-text">{formatCount(post.counts.reposts)}</b>{" "}
                repost
              </span>
              <span>
                <b className="text-text">{formatCount(post.counts.quotes)}</b>{" "}
                kutipan
              </span>
              <span>
                <b className="text-text">{formatCount(post.counts.likes)}</b>{" "}
                suka
              </span>
              <span>
                <b className="text-text">{formatCount(post.counts.bookmarks)}</b>{" "}
                disimpan
              </span>
            </div>

            {isOwner && (
              <Suspense fallback={null}>
                <PostAnalyticsSection postId={post.id} />
              </Suspense>
            )}

            <p className="mt-3 text-[13px] text-text-muted">
              {formatPostDate(post.createdAt)}
            </p>

            {post.resolveNote && (
              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-bg-elev px-3 py-2 text-[13px] text-text-muted">
                <b className="text-text">Catatan penutupan:</b>{" "}
                {post.resolveNote}
              </p>
            )}

            <PostActions post={post} showShare={false} />

            {(post.status === "TP_HIT" || post.status === "SL_HIT") &&
              !post.disputed && (
              <div className="mt-3">
                <ShareResultButton postId={post.id} variant="full" />
              </div>
            )}
          </div>
        </div>
      </article>

      {isOwner && post.isSignal && post.status === "OPEN" && (
        <section className="border-b border-border px-4 py-4">
          <h2 className="text-[20px] font-bold">Kelola sinyal</h2>
          <p className="mb-3 mt-0.5 text-[13px] text-text-muted">
            Feed delay atau harga tidak akurat? Tutup sinyal secara manual dan
            tulis alasannya.
          </p>
          <SignalResolveForm postId={post.id} />
        </section>
      )}

      <section className="border-b border-border">
        <h2 className="px-4 pt-3 text-[20px] font-bold">Balasan</h2>
        {session?.user ? (
          <ComposeBox
            user={{
              name: session.user.name ?? session.user.username,
              avatarUrl: session.user.image ?? null,
            }}
            replyTo={replyTarget}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
            <p className="text-[15px] text-text-muted">
              Masuk dulu untuk ikut berdiskusi.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/post/${post.id}`)}`}
            >
              <Button size="sm">Masuk</Button>
            </Link>
          </div>
        )}
      </section>

      <Suspense
        fallback={
          <p className="px-4 py-10 text-center text-[15px] text-text-muted">
            Memuat balasan…
          </p>
        }
      >
        <RepliesSection
          postId={post.id}
          viewerId={viewerId}
          totalReplies={post.counts.replies}
          isRoot={post.replyToId === null}
        />
      </Suspense>
    </>
  );
}

/** Panel analitik owner: streaming terpisah, tidak menahan konten postingan. */
async function PostAnalyticsSection({ postId }: { postId: string }) {
  const analytics = await getPostAnalytics(postId);
  if (!analytics) return null;

  return (
    <section className="mt-3 rounded-xl border border-border bg-bg-elev p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Analitik postingan</h2>
        <Link
          href="/dashboard"
          className="text-[13px] text-accent hover:underline"
        >
          Dashboard
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center sm:grid-cols-5">
        {[
          { label: "Tayangan", value: analytics.views },
          { label: "Suka", value: analytics.likes },
          { label: "Repost", value: analytics.reposts },
          { label: "Simpan", value: analytics.bookmarks },
          { label: "Balasan", value: analytics.replies },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-bg-input px-1 py-2"
          >
            <div className="text-[15px] font-bold tabular">
              {formatCount(item.value)}
            </div>
            <div className="text-[11px] text-text-muted">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Balasan halaman pertama (20). Dimuat di sini, bukan di getPostDetail,
 * supaya header + postingan + kolom tulis tampil dulu.
 * Perilaku lama dipertahankan: halaman sebuah balasan tidak menampilkan
 * balasan di bawahnya (balasan di situ membalas induknya).
 */
async function RepliesSection({
  postId,
  viewerId,
  totalReplies,
  isRoot,
}: {
  postId: string;
  viewerId: string | null;
  totalReplies: number;
  isRoot: boolean;
}) {
  if (!isRoot) {
    return (
      <p className="px-4 py-10 text-center text-[15px] text-text-muted">
        Belum ada balasan. Tulis balasan di atas untuk memulai diskusi.
      </p>
    );
  }
  const { items, nextCursor } = await getPostReplies(postId, viewerId, 20);
  return (
    <RepliesList
      postId={postId}
      initialReplies={items}
      initialNextCursor={nextCursor}
      totalReplies={totalReplies}
    />
  );
}
