import type { PostAuthor } from "@/types/post";

export type NotificationType =
  | "like"
  | "repost"
  | "reply"
  | "follow"
  | "signal_resolved"
  | "badge_awarded"
  | "mention";

export type NotificationItemData = {
  id: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  actor: PostAuthor | null;
  post: {
    id: string;
    content: string;
    deletedAt: string | null;
    isSignal: boolean;
    symbol: string | null;
    status: string | null;
    pnlPercent: number | null;
  } | null;
};
