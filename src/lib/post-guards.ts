import type { MarketName } from "@/lib/symbols";
import type {
  DirectionName,
  FeedPost,
  SignalStatusName,
} from "@/types/post";

export type SignalPost = FeedPost & {
  market: MarketName;
  symbol: string;
  direction: DirectionName;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  timeframe: string;
  status: SignalStatusName;
};

/** Post sinyal yang semua field wajibnya terisi (aman dirender SignalCard). */
export function hasSignalShape(post: FeedPost): post is SignalPost {
  return (
    post.isSignal &&
    post.market != null &&
    post.symbol != null &&
    post.direction != null &&
    post.entry != null &&
    post.takeProfit != null &&
    post.stopLoss != null &&
    post.timeframe != null &&
    post.status != null
  );
}
