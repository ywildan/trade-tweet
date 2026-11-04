import type { MarketName } from "@/lib/symbols";

export type DirectionName = "LONG" | "SHORT";
export type SignalStatusName =
  | "OPEN"
  | "TP_HIT"
  | "SL_HIT"
  | "EXPIRED"
  | "CANCELLED";

export type PostAuthor = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  badges: string[];
};

export type QuotePost = {
  id: string;
  content: string;
  createdAt: string;
  author: PostAuthor;
  isSignal: boolean;
  symbol: string | null;
  direction: DirectionName | null;
  status: SignalStatusName | null;
};

export type PostCounts = {
  likes: number;
  reposts: number;
  bookmarks: number;
  replies: number;
  quotes: number;
};

/** Status interaksi viewer pada satu post (null untuk guest). */
export type ViewerState = {
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
};

export type FeedPost = {
  id: string;
  content: string;
  createdAt: string;
  views: number;
  replyToId: string | null;
  quoteOfId: string | null;
  isSignal: boolean;
  market: MarketName | null;
  symbol: string | null;
  direction: DirectionName | null;
  entry: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  timeframe: string | null;
  status: SignalStatusName | null;
  pnlPercent: number | null;
  disputed: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolveNote: string | null;
  author: PostAuthor;
  counts: PostCounts;
  viewer: ViewerState | null;
  quote: QuotePost | null;
};

export type FeedResult = {
  items: FeedPost[];
  nextCursor: string | null;
  requiresAuth?: boolean;
};

export type PostDetail = {
  post: FeedPost;
  replies: FeedPost[];
  parent: { id: string; author: PostAuthor } | null;
};
