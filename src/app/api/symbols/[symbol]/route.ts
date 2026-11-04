import { connection } from "next/server";
import { apiError, apiOk } from "@/lib/api";
import { getPriceFeed } from "@/lib/price-feed";
import { inferMarket } from "@/lib/symbols";

type Context = { params: Promise<{ symbol: string }> };

/** GET /api/symbols/[symbol] — harga terakhir untuk polling 30 detik. */
export async function GET(_request: Request, context: Context) {
  await connection();

  try {
    const { symbol: raw } = await context.params;
    const symbol = decodeURIComponent(raw).toUpperCase();

    if (!/^[A-Z0-9]{2,20}$/.test(symbol)) {
      return apiError("NOT_FOUND", "Simbol tidak valid.", 404);
    }

    const market = inferMarket(symbol);
    const quote = await getPriceFeed(market).getQuote(symbol);

    return apiOk(
      { ...quote, market },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch (error) {
    console.error("[symbols] gagal mengambil harga", error);
    return apiError("INTERNAL", "Harga belum tersedia. Coba lagi.", 503);
  }
}
