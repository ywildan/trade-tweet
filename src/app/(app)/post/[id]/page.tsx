import type { Metadata } from "next";
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
import { PostCard, QuoteCard, RichContent } from "@/components/post/post-card";
import { SignalCard } from "@/components/post/signal-card";
import { hasSignalShape } from "@/lib/post-guards";
import { getPostAnalytics } from "@/lib/analytics";
import { formatCount, formatPostDate, formatRelativeTime } from "@/lib/format";
import { getPostDetail } from "@/lib/posts";
import { getSession } from "@/lib/session";
import { recordPostView } from "@/lib/views";
import { prisma } from "@/lib/db";

export const instant = false;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const row = await prisma.post.findFirst({
    where: { id, deletedAt: null },
    select: {
      content: true,
      isSignal: true,
      symbol: true,
      author: { select: { name: true, username: true } },
    },
  });

  if (!row) return { title: "Postingan tidak ditemukan" };

  const snippet =
    row.content.trim().replace(/\s+/g, " ").slice(0, 70) ||
    (row.isSignal && row.symbol
      ? `Sinyal ${row.symbol} dari @${row.author.username}`
      : `Postingan @${row.author.username}`);

  const title = `${snippet} — @${row.author.username}`;
  const description = `Postingan ${row.author.name} di SPMTrade.`;

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
          alt: `Postingan @${row.author.username} di SPMTrade`,
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
  const session = await getSession();
  const detail = await getPostDetail(id, session?.user.id ?? null);
  if (!detail) notFound();

  let viewed = false;
  try {
    viewed = await recordPostView(id, session?.user.id ?? null);
  } catch {
    // Kegagalan pencatatan view tidak boleh menggagalkan halaman.
  }

  const { post, replies, parent } = detail;
  const signal = hasSignalShape(post) ? post : null;
  const views = post.views + (viewed ? 1 : 0);
  const isOwner = session?.user.id === post.author.id;
  const analytics = isOwner ? await getPostAnalytics(post.id) : null;

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
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-4 border-b border-border bg-bg/65 px-3 backdrop-blur">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="-ml-2 rounded-full p-2 text-[20px] transition-colors hover:bg-text/10"
        >
          ←
        </Link>
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
                <b className="text-text">{formatCount(views)}</b> tayangan
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

            {isOwner && analytics && (
              <section className="mt-3 rounded-2xl border border-border bg-bg-elev p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold">
                    Analitik postingan
                  </h2>
                  <Link
                    href="/dashboard"
                    className="text-[13px] text-accent hover:underline"
                  >
                    Dashboard
                  </Link>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1 text-center">
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
                      <div className="text-[11px] text-text-muted">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
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

            {post.status === "TP_HIT" && !post.disputed && (
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

      {replies.length > 0 ? (
        replies.map((reply) => <PostCard key={reply.id} post={reply} />)
      ) : (
        <p className="px-4 py-10 text-center text-[15px] text-text-muted">
          Belum ada balasan. Jadilah yang pertama.
        </p>
      )}
    </>
  );
}
