"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { UserBadges } from "@/components/ui/badge";
import { PostActions } from "@/components/post/post-actions";
import { SignalCard } from "@/components/post/signal-card";
import { hasSignalShape } from "@/lib/post-guards";
import { formatRelativeTime } from "@/lib/format";
import type { FeedPost } from "@/types/post";

/**
 * PostCard — anatomi feed X.com (DESIGN.md §5.1).
 * Klik area kosong membuka detail; tautan di dalamnya tidak ikut navigasi.
 */
export function PostCard({
  post,
  detail = false,
}: {
  post: FeedPost;
  detail?: boolean;
}) {
  const router = useRouter();
  const href = `/post/${post.id}`;

  function openPost(event: React.MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a,button")) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  }

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Postingan ${post.author.name}`}
      onClick={openPost}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      className="group relative cursor-pointer border-b border-border p-4 transition-colors duration-150 hover:bg-text/[0.03] focus-visible:bg-text/[0.03] focus-visible:outline-none"
    >
      <div className="flex gap-3">
        <Link
          href={`/@${post.author.username}`}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Profil ${post.author.name}`}
          className="h-fit rounded-full"
        >
          <Avatar
            name={post.author.name}
            src={post.author.avatarUrl}
            size={40}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1 text-[15px]">
            <Link
              href={`/@${post.author.username}`}
              onClick={(event) => event.stopPropagation()}
              className="truncate font-semibold hover:underline"
            >
              {post.author.name}
            </Link>
            <UserBadges types={post.author.badges} size="sm" />
            <Link
              href={`/@${post.author.username}`}
              onClick={(event) => event.stopPropagation()}
              className="ml-1 truncate text-text-muted hover:underline"
            >
              @{post.author.username}
            </Link>
            <span className="text-text-muted">·</span>
            <time
              dateTime={post.createdAt}
              suppressHydrationWarning
              className="shrink-0 text-text-muted"
              title={new Date(post.createdAt).toLocaleString("id-ID")}
            >
              {formatRelativeTime(post.createdAt)}
            </time>
          </div>

          {post.content && (
            <RichContent
              text={post.content}
              className={`mt-1 ${
                detail ? "text-[17px] leading-6" : "text-[15px] leading-5"
              }`}
            />
          )}

          {hasSignalShape(post) && (
            <SignalCard
              symbol={post.symbol}
              direction={post.direction}
              market={post.market}
              entry={post.entry}
              takeProfit={post.takeProfit}
              stopLoss={post.stopLoss}
              timeframe={post.timeframe}
              status={post.status}
              pnlPercent={post.pnlPercent}
            />
          )}

          {post.quote && <QuoteCard quote={post.quote} />}

          <PostActions post={post} />
        </div>
      </div>
    </article>
  );
}

export function QuoteCard({ quote }: { quote: NonNullable<FeedPost["quote"]> }) {
  return (
    <Link
      href={`/post/${quote.id}`}
      onClick={(event) => event.stopPropagation()}
      className="mt-2 block rounded-2xl border border-border p-3 transition-colors hover:border-text-muted"
    >
      <span className="flex items-center gap-1.5 text-[13px]">
        <Avatar name={quote.author.name} src={quote.author.avatarUrl} size={20} />
        <span className="font-semibold">{quote.author.name}</span>
        <span className="truncate text-text-muted">
          @{quote.author.username}
        </span>
        <span className="text-text-muted">·</span>
        <time
          dateTime={quote.createdAt}
          suppressHydrationWarning
          className="shrink-0 text-text-muted"
        >
          {formatRelativeTime(quote.createdAt)}
        </time>
      </span>
      {quote.content && (
        <span className="mt-1 line-clamp-2 block text-[13px] text-text-muted">
          {quote.content}
        </span>
      )}
      {quote.isSignal && quote.symbol && (
        <span className="mt-1 block text-[12px] font-semibold text-accent">
          {quote.symbol}
          {quote.direction ? ` · ${quote.direction}` : ""}
        </span>
      )}
    </Link>
  );
}

const TOKEN_PATTERN =
  /(https?:\/\/[^\s]+|@[a-z0-9_]{1,15}|\$[A-Za-z0-9]{2,20})/g;

/** Konten post: mention & $SIMBOL clickable, sisanya teks biasa. */
export function RichContent({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const nodes = useMemo(() => {
    const result: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(TOKEN_PATTERN)) {
      const token = match[0];
      const index = match.index ?? 0;
      if (index > lastIndex) {
        result.push(text.slice(lastIndex, index));
      }

      if (token.startsWith("@")) {
        result.push(
          <Link
            key={`${index}-mention`}
            href={`/@${token.slice(1).toLowerCase()}`}
            onClick={(event) => event.stopPropagation()}
            className="text-accent hover:underline"
          >
            {token}
          </Link>,
        );
      } else if (token.startsWith("$")) {
        result.push(
          <span
            key={`${index}-symbol`}
            title="Halaman simbol hadir di Phase 6"
            className="font-semibold text-accent"
          >
            {token.toUpperCase()}
          </span>,
        );
      } else {
        result.push(
          <a
            key={`${index}-url`}
            href={token}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            className="text-accent hover:underline"
          >
            {token}
          </a>,
        );
      }

      lastIndex = index + token.length;
    }

    if (lastIndex < text.length) result.push(text.slice(lastIndex));
    return result;
  }, [text]);

  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>{nodes}</div>
  );
}
