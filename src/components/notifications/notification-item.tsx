import Link from "next/link";
import {
  AtSign,
  Award,
  Heart,
  MessageCircle,
  Repeat2,
  Target,
  UserPlus,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { formatPnl, formatRelativeTime } from "@/lib/format";
import type { NotificationItemData } from "@/types/notification";

const MESSAGES: Record<string, string> = {
  like: "menyukai postinganmu",
  repost: "merepost postinganmu",
  reply: "membalas postinganmu",
  follow: "mengikuti kamu",
  signal_resolved: "Sinyal kamu selesai",
  badge_awarded: "Kamu mendapat badge baru",
  mention: "menyebut kamu",
};

/** Item notifikasi (spesifikasi.md §4 Phase 3, DESIGN.md §3). */
export function NotificationItem({
  notification,
}: {
  notification: NotificationItemData;
}) {
  const { actor, post } = notification;
  const href = post
    ? `/post/${post.id}`
    : actor
      ? `/@${actor.username}`
      : "/notifications";

  const message = notificationMessage(notification);
  const unread = notification.readAt === null;

  const snippet = post
    ? post.deletedAt
      ? "Postingan dihapus"
      : post.content.trim().slice(0, 120) || "(postingan sinyal)"
    : null;

  return (
    <Link
      href={href}
      className={`flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-text/[0.03] ${
        unread ? "bg-accent/[0.04]" : ""
      }`}
    >
      <span className="relative h-fit shrink-0">
        {actor ? (
          <Avatar name={actor.name} src={actor.avatarUrl} size={40} />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Target size={20} />
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-bg bg-bg-elev p-1">
          <TypeIcon type={notification.type} />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-5">
          {actor ? (
            <>
              <b className="font-semibold">{actor.name}</b>{" "}
              <span className="text-text-muted">{message}</span>
            </>
          ) : (
            <span className="font-semibold">{message}</span>
          )}
          {unread && (
            <span
              aria-label="Belum dibaca"
              className="ml-2 inline-block h-2 w-2 rounded-full bg-accent align-middle"
            />
          )}
        </p>

        {snippet && (
          <p className="mt-1 line-clamp-2 text-[13px] text-text-muted">
            {snippet}
          </p>
        )}

        <p
          className="mt-1 text-[13px] text-text-muted"
          suppressHydrationWarning
        >
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </Link>
  );
}

function notificationMessage(notification: NotificationItemData): string {
  if (notification.type === "signal_resolved") {
    const post = notification.post;
    if (post?.isSignal && post.symbol) {
      const pnl = post.pnlPercent != null ? ` ${formatPnl(post.pnlPercent)}` : "";
      if (post.status === "TP_HIT") {
        return `Sinyal ${post.symbol} kamu TP tercapai 🎯${pnl}`;
      }
      if (post.status === "SL_HIT") {
        return `Sinyal ${post.symbol} kamu kena SL${pnl}`;
      }
      if (post.status === "EXPIRED") {
        return `Sinyal ${post.symbol} kamu kedaluwarsa${pnl}`;
      }
    }
    return "Sinyal kamu selesai";
  }
  return MESSAGES[notification.type] ?? "berinteraksi denganmu";
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case "like":
      return <Heart size={12} className="text-like" fill="currentColor" />;
    case "repost":
      return (
        <Repeat2 size={12} className="text-repost" strokeWidth={2.4} />
      );
    case "reply":
      return <MessageCircle size={12} className="text-accent" />;
    case "follow":
      return <UserPlus size={12} className="text-accent" />;
    case "mention":
      return <AtSign size={12} className="text-accent" />;
    case "badge_awarded":
      return <Award size={12} className="text-gold" />;
    default:
      return <Target size={12} className="text-long" />;
  }
}
