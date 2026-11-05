import { connection } from "next/server";
import { apiOk, handleApiError } from "@/lib/api";
import {
  MARKETS,
  searchCatalog,
  searchSymbols,
  type MarketName,
} from "@/lib/symbols";

/** GET /api/symbols?q=&market=: autocomplete simbol (spesifikasi.md §5). */
export async function GET(request: Request) {
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    const rawMarket = searchParams.get("market");
    const market = (MARKETS as readonly string[]).includes(rawMarket ?? "")
      ? (rawMarket as MarketName)
      : null;

    const items = market
      ? searchSymbols(query, market, 10)
      : searchCatalog(query, 10);

    return apiOk({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
