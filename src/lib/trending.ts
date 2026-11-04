import { prisma } from "@/lib/db";
import {
  findSymbolEntry,
  inferMarket,
  type MarketName,
} from "@/lib/symbols";

export type TrendingSymbol = {
  symbol: string;
  name: string | null;
  market: MarketName;
  signals: number;
};

/** Simbol dengan sinyal terbanyak dalam N hari terakhir. */
export async function getTrendingSymbols(
  days = 7,
  take = 5,
): Promise<TrendingSymbol[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.post.groupBy({
    by: ["symbol"],
    where: {
      deletedAt: null,
      isSignal: true,
      symbol: { not: null },
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });

  return rows
    .filter((row) => row.symbol != null)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, take)
    .map((row) => {
      const symbol = row.symbol as string;
      const entry = findSymbolEntry(symbol);
      return {
        symbol,
        name: entry?.name ?? null,
        market: entry?.market ?? inferMarket(symbol),
        signals: row._count._all,
      };
    });
}
