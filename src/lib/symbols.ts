export const MARKETS = ["CRYPTO", "METAL", "FOREX", "STOCK"] as const;
export type MarketName = (typeof MARKETS)[number];

export const ACTIVE_MARKETS: MarketName[] = ["CRYPTO", "METAL"];

export const TIMEFRAMES = ["15M", "1H", "4H", "1D", "1W"] as const;
export type TimeframeName = (typeof TIMEFRAMES)[number];

export type SymbolEntry = {
  symbol: string;
  name: string;
  market: MarketName;
};

export const METAL_SYMBOLS = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"] as const;

/**
 * Katalog simbol Phase 2 (spesifikasi.md §5, src/lib/symbols.ts).
 * Autocomplete memakai daftar statis; Binance exchangeInfo menyusul di Phase 6.
 */
export const SYMBOL_CATALOG: SymbolEntry[] = [
  { symbol: "BTCUSDT", name: "Bitcoin / TetherUS", market: "CRYPTO" },
  { symbol: "ETHUSDT", name: "Ethereum / TetherUS", market: "CRYPTO" },
  { symbol: "BNBUSDT", name: "BNB / TetherUS", market: "CRYPTO" },
  { symbol: "SOLUSDT", name: "Solana / TetherUS", market: "CRYPTO" },
  { symbol: "XRPUSDT", name: "XRP / TetherUS", market: "CRYPTO" },
  { symbol: "ADAUSDT", name: "Cardano / TetherUS", market: "CRYPTO" },
  { symbol: "DOGEUSDT", name: "Dogecoin / TetherUS", market: "CRYPTO" },
  { symbol: "AVAXUSDT", name: "Avalanche / TetherUS", market: "CRYPTO" },
  { symbol: "LINKUSDT", name: "Chainlink / TetherUS", market: "CRYPTO" },
  { symbol: "DOTUSDT", name: "Polkadot / TetherUS", market: "CRYPTO" },
  { symbol: "MATICUSDT", name: "Polygon / TetherUS", market: "CRYPTO" },
  { symbol: "LTCUSDT", name: "Litecoin / TetherUS", market: "CRYPTO" },
  { symbol: "TRXUSDT", name: "TRON / TetherUS", market: "CRYPTO" },
  { symbol: "TONUSDT", name: "Toncoin / TetherUS", market: "CRYPTO" },
  { symbol: "NEARUSDT", name: "NEAR Protocol / TetherUS", market: "CRYPTO" },
  { symbol: "SUIUSDT", name: "Sui / TetherUS", market: "CRYPTO" },
  { symbol: "APTUSDT", name: "Aptos / TetherUS", market: "CRYPTO" },
  { symbol: "ARBUSDT", name: "Arbitrum / TetherUS", market: "CRYPTO" },
  { symbol: "OPUSDT", name: "Optimism / TetherUS", market: "CRYPTO" },
  { symbol: "INJUSDT", name: "Injective / TetherUS", market: "CRYPTO" },
  { symbol: "PEPEUSDT", name: "Pepe / TetherUS", market: "CRYPTO" },
  { symbol: "SHIBUSDT", name: "Shiba Inu / TetherUS", market: "CRYPTO" },
  { symbol: "WIFUSDT", name: "dogwifhat / TetherUS", market: "CRYPTO" },
  { symbol: "ATOMUSDT", name: "Cosmos / TetherUS", market: "CRYPTO" },
  { symbol: "FILUSDT", name: "Filecoin / TetherUS", market: "CRYPTO" },
  { symbol: "ICPUSDT", name: "Internet Computer / TetherUS", market: "CRYPTO" },
  { symbol: "ETCUSDT", name: "Ethereum Classic / TetherUS", market: "CRYPTO" },
  { symbol: "BCHUSDT", name: "Bitcoin Cash / TetherUS", market: "CRYPTO" },
  { symbol: "UNIUSDT", name: "Uniswap / TetherUS", market: "CRYPTO" },
  { symbol: "AAVEUSDT", name: "Aave / TetherUS", market: "CRYPTO" },
  { symbol: "XAUUSD", name: "Emas / US Dollar", market: "METAL" },
  { symbol: "XAGUSD", name: "Perak / US Dollar", market: "METAL" },
  { symbol: "XPTUSD", name: "Platinum / US Dollar", market: "METAL" },
  { symbol: "XPDUSD", name: "Palladium / US Dollar", market: "METAL" },
];

const METAL_SET = new Set<string>(METAL_SYMBOLS);

export function isMetalSymbol(symbol: string): boolean {
  return METAL_SET.has(symbol.toUpperCase());
}

export function inferMarket(symbol: string): MarketName {
  return isMetalSymbol(symbol) ? "METAL" : "CRYPTO";
}

export function findSymbolEntry(symbol: string): SymbolEntry | undefined {
  const upper = symbol.toUpperCase();
  return SYMBOL_CATALOG.find((entry) => entry.symbol === upper);
}

export function searchSymbols(query: string, market: MarketName, limit = 8) {
  const q = query.trim().toUpperCase();
  return SYMBOL_CATALOG.filter(
    (entry) =>
      entry.market === market &&
      (q === "" ||
        entry.symbol.includes(q) ||
        entry.name.toUpperCase().includes(q)),
  ).slice(0, limit);
}

/**
 * Pencarian katalog lintas market (Phase 6).
 * Awalan simbol diutamakan; nama dicocokkan per awal kata agar "eth"
 * tidak cocok ke semua pasangan "TetherUS".
 */
export function searchCatalog(query: string, limit = 8): SymbolEntry[] {
  const q = query.trim().replace(/^\$/, "").toUpperCase();
  if (q === "") return SYMBOL_CATALOG.slice(0, limit);

  const scored = SYMBOL_CATALOG.map((entry) => {
    const symbolIndex = entry.symbol.indexOf(q);
    const tokens = entry.name.toUpperCase().split(/[^A-Z0-9]+/);
    const nameMatch = tokens.some((token) => token.startsWith(q));
    if (symbolIndex === -1 && !nameMatch) return null;

    return {
      entry,
      score: symbolIndex === 0 ? 0 : symbolIndex > 0 ? 1 : 2,
    };
  }).filter(
    (item): item is { entry: SymbolEntry; score: number } => item !== null,
  );

  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.entry.symbol.length - b.entry.symbol.length ||
        a.entry.symbol.localeCompare(b.entry.symbol),
    )
    .slice(0, limit)
    .map((item) => item.entry);
}
