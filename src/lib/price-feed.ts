import { request as httpsRequest } from "node:https";
import type { MarketName } from "@/lib/symbols";

export type Quote = { symbol: string; price: number; ts: number };

export type PriceRange = {
  symbol: string;
  high: number;
  low: number;
  last: number;
  ts: number;
};

export type Candle = {
  t: number;
  high: number;
  low: number;
  close: number;
};

/**
 * Abstraksi feed harga (spesifikasi.md §2 & §4 Phase 4).
 * Resolver TIDAK boleh tahu provider mana yang dipakai.
 */
export interface PriceFeed {
  getQuote(symbol: string): Promise<Quote>;
  getRange(symbol: string, from: Date, to: Date): Promise<PriceRange>;
  getCandles(symbol: string, from: Date, to: Date): Promise<Candle[]>;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: unknown; expires: number }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} dari ${new URL(url).host}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function intervalForSpan(spanMs: number): string {
  const hours = spanMs / 3_600_000;
  if (hours <= 2) return "1m";
  if (hours <= 12) return "5m";
  if (hours <= 48) return "15m";
  if (hours <= 24 * 7) return "1h";
  if (hours <= 24 * 30) return "4h";
  return "1d";
}

/**
 * Interval Yahoo terpisah dari Binance: Yahoo tidak mendukung "4h".
 * Interval Yahoo yang valid antara lain 1m/5m/15m/1h/1d, jadi rentang
 * >7 hari sampai 30 hari memakai 1h, bukan 4h.
 */
function intervalForYahoo(spanMs: number): string {
  const hours = spanMs / 3_600_000;
  if (hours <= 2) return "1m";
  if (hours <= 12) return "5m";
  if (hours <= 48) return "15m";
  if (hours <= 24 * 30) return "1h";
  return "1d";
}

/* ------------------------------------------------------------------ */
/* Binance (CRYPTO)                                                   */
/* ------------------------------------------------------------------ */

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

class BinanceFeed implements PriceFeed {
  private readonly base = "https://api.binance.com";

  async getQuote(symbol: string): Promise<Quote> {
    const upper = symbol.toUpperCase();
    return cached(`binance:quote:${upper}`, async () => {
      const data = await fetchJson<{ symbol: string; price: string }>(
        `${this.base}/api/v3/ticker/price?symbol=${encodeURIComponent(upper)}`,
      );
      const price = Number(data.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Harga Binance tidak valid untuk ${upper}`);
      }
      return { symbol: upper, price, ts: Date.now() };
    });
  }

  async getRange(symbol: string, from: Date, to: Date): Promise<PriceRange> {
    const upper = symbol.toUpperCase();
    const start = Math.max(0, from.getTime());
    const end = Math.max(start + 60_000, to.getTime());
    const key = `binance:range:${upper}:${start}:${end}`;

    return cached(key, async () => {
      const candles = await this.getCandles(upper, new Date(start), new Date(end));
      if (candles.length === 0) {
        const quote = await this.getQuote(upper);
        return {
          symbol: upper,
          high: quote.price,
          low: quote.price,
          last: quote.price,
          ts: quote.ts,
        };
      }

      let high = candles[0].high;
      let low = candles[0].low;
      for (const candle of candles) {
        high = Math.max(high, candle.high);
        low = Math.min(low, candle.low);
      }

      return {
        symbol: upper,
        high,
        low,
        last: candles[candles.length - 1].close,
        ts: Date.now(),
      };
    });
  }

  async getCandles(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<Candle[]> {
    const upper = symbol.toUpperCase();
    const start = Math.max(0, from.getTime());
    const end = Math.max(start + 60_000, to.getTime());
    const key = `binance:candles:${upper}:${start}:${end}`;

    return cached(key, async () => {
      const interval = intervalForSpan(end - start);
      const rows = await fetchJson<BinanceKline[]>(
        `${this.base}/api/v3/klines?symbol=${encodeURIComponent(
          upper,
        )}&interval=${interval}&startTime=${start}&endTime=${end}&limit=1000`,
      );

      return rows
        .map((row) => ({
          t: Number(row[0]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
        }))
        .filter(
          (candle) =>
            Number.isFinite(candle.high) &&
            Number.isFinite(candle.low) &&
            Number.isFinite(candle.close) &&
            candle.high > 0 &&
            candle.low > 0,
        );
    });
  }
}

/* ------------------------------------------------------------------ */
/* Yahoo Finance (METAL / FOREX / STOCK)                              */
/* ------------------------------------------------------------------ */

const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/**
 * Yahoo tidak lagi menyediakan XAUUSD=X (delisted). Untuk metal, coba
 * mapping spot lalu futures COMEX/ NYMEX sebagai fallback yang masih Yahoo.
 */
const YAHOO_SYMBOLS: Record<string, string[]> = {
  XAUUSD: ["GC=F"],
  XAGUSD: ["SI=F"],
  XPTUSD: ["PL=F"],
  XPDUSD: ["PA=F"],
};

function yahooCandidates(symbol: string): string[] {
  const upper = symbol.toUpperCase();
  const mapped = YAHOO_SYMBOLS[upper];
  if (mapped) return mapped;
  if (/^[A-Z]{6}$/.test(upper)) return [`${upper}=X`];
  return [upper];
}

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
};

function fetchYahooCookies(): Promise<string> {
  return new Promise((resolve) => {
    const request = httpsRequest(
      "https://fc.yahoo.com",
      { method: "GET", headers: { "User-Agent": YAHOO_UA } },
      (response) => {
        const raw = response.headers["set-cookie"] ?? [];
        const pairs = raw
          .map((cookie) => cookie.split(";")[0])
          .filter((pair) => pair.includes("="));
        resolve(pairs.join("; "));
        response.resume();
      },
    );
    request.on("error", () => resolve(""));
    request.setTimeout(10_000, () => {
      request.destroy();
      resolve("");
    });
    request.end();
  });
}

class YahooFeed implements PriceFeed {
  private cookieHeader = "";
  private cookieExpires = 0;
  private nextRequestAt = 0;

  private async ensureCookie(force = false) {
    if (!force && this.cookieHeader && this.cookieExpires > Date.now()) return;

    try {
      // node:https agar tidak terkena pembungkusan fetch Next saat membaca Set-Cookie.
      const header = await fetchYahooCookies();
      if (header) {
        this.cookieHeader = header;
        this.cookieExpires = Date.now() + 5 * 60_000;
      }
    } catch {
      // Tanpa cookie pun chart kadang masih bisa; lanjut saja.
    }
  }

  private async gate() {
    const wait = this.nextRequestAt - Date.now();
    if (wait > 0) await sleep(wait);
    this.nextRequestAt = Date.now() + 250;
  }

  private async request(query: string): Promise<YahooChart> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.ensureCookie(attempt > 0);
      await this.gate();

      const host =
        attempt === 2 ? "query2.finance.yahoo.com" : "query1.finance.yahoo.com";
      const headers: Record<string, string> = {
        "User-Agent": YAHOO_UA,
        Accept: "application/json,text/plain,*/*",
      };
      if (this.cookieHeader) headers.Cookie = this.cookieHeader;

      const response = await fetch(`https://${host}/v8/finance/chart/${query}`, {
        headers,
        cache: "no-store",
      });

      if (response.ok) {
        return (await response.json()) as YahooChart;
      }

      const body = await response.text().catch(() => "");
      const rateLimited =
        response.status === 429 ||
        response.status === 401 ||
        /too many requests|rate limit|edge/i.test(body);
      // Yahoo kadang membalas 404 "No data found" saat cookie-nya basi.
      const retryable = rateLimited || response.status === 404;
      lastError = new Error(
        `HTTP ${response.status} dari Yahoo Finance: ${body.slice(0, 80)}`,
      );

      if (!retryable) throw lastError;
      await sleep(800 * (attempt + 1));
    }

    throw lastError ?? new Error("Yahoo Finance tidak merespons.");
  }

  private parse(
    chart: YahooChart,
  ): { high: number; low: number; last: number } | null {
    const result = chart.chart?.result?.[0];
    if (!result) return null;

    const highs = result.indicators?.quote?.[0]?.high ?? [];
    const lows = result.indicators?.quote?.[0]?.low ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];

    let high = -Infinity;
    let low = Infinity;
    let last = NaN;

    for (const value of highs) {
      if (typeof value === "number" && Number.isFinite(value)) {
        high = Math.max(high, value);
      }
    }
    for (const value of lows) {
      if (typeof value === "number" && Number.isFinite(value)) {
        low = Math.min(low, value);
      }
    }
    for (const value of closes) {
      if (typeof value === "number" && Number.isFinite(value)) last = value;
    }

    const marketPrice = result.meta?.regularMarketPrice;
    if (typeof marketPrice === "number" && Number.isFinite(marketPrice)) {
      last = marketPrice;
      if (!Number.isFinite(high)) high = marketPrice;
      if (!Number.isFinite(low)) low = marketPrice;
    }

    if (!Number.isFinite(last) || !Number.isFinite(high) || !Number.isFinite(low)) {
      return null;
    }
    return { high, low, last };
  }

  private async loadRange(symbol: string, from: Date, to: Date) {
    const start = Math.max(0, Math.floor(from.getTime() / 1000));
    const end = Math.max(start + 60, Math.floor(to.getTime() / 1000));
    const interval = intervalForYahoo((end - start) * 1000);

    let lastError: unknown = null;
    for (const candidate of yahooCandidates(symbol)) {
      const query = `${encodeURIComponent(
        candidate,
      )}?period1=${start}&period2=${end}&interval=${interval}&includePrePost=false`;
      try {
        const chart = await this.request(query);
        const parsed = this.parse(chart);
        if (parsed) return { ...parsed, source: candidate };
        lastError = new Error(
          chart.chart?.error?.description ?? `Data ${candidate} kosong`,
        );
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(
      `Yahoo gagal untuk ${symbol}: ${
        lastError instanceof Error ? lastError.message : "tidak diketahui"
      }`,
    );
  }

  private parseCandles(chart: YahooChart): Candle[] {
    const result = chart.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    const highs = quote?.high ?? [];
    const lows = quote?.low ?? [];
    const closes = quote?.close ?? [];

    const candles: Candle[] = [];
    for (let index = 0; index < timestamps.length; index += 1) {
      const high = Number(highs[index]);
      const low = Number(lows[index]);
      const close = Number(closes[index]);
      if (
        Number.isFinite(high) &&
        Number.isFinite(low) &&
        Number.isFinite(close) &&
        high > 0 &&
        low > 0
      ) {
        candles.push({ t: timestamps[index] * 1000, high, low, close });
      }
    }

    const marketPrice = result.meta?.regularMarketPrice;
    if (
      candles.length === 0 &&
      typeof marketPrice === "number" &&
      Number.isFinite(marketPrice)
    ) {
      const t = (result.meta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000;
      candles.push({ t, high: marketPrice, low: marketPrice, close: marketPrice });
    }

    return candles;
  }

  private async loadCandles(symbol: string, from: Date, to: Date) {
    const start = Math.max(0, Math.floor(from.getTime() / 1000));
    const end = Math.max(start + 60, Math.floor(to.getTime() / 1000));
    const interval = intervalForYahoo((end - start) * 1000);

    let lastError: unknown = null;
    for (const candidate of yahooCandidates(symbol)) {
      const query = `${encodeURIComponent(
        candidate,
      )}?period1=${start}&period2=${end}&interval=${interval}&includePrePost=false`;
      try {
        const chart = await this.request(query);
        const candles = this.parseCandles(chart);
        if (candles.length > 0) return candles;
        lastError = new Error(
          chart.chart?.error?.description ?? `Data ${candidate} kosong`,
        );
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Yahoo gagal untuk ${symbol}: ${
        lastError instanceof Error ? lastError.message : "tidak diketahui"
      }`,
    );
  }

  async getQuote(symbol: string): Promise<Quote> {
    const upper = symbol.toUpperCase();
    return cached(`yahoo:quote:${upper}`, async () => {
      const to = new Date();
      const from = new Date(to.getTime() - 2 * 3_600_000);
      const range = await this.loadRange(upper, from, to);
      return {
        symbol: upper,
        price: range.last,
        ts: Date.now(),
      };
    });
  }

  async getRange(symbol: string, from: Date, to: Date): Promise<PriceRange> {
    const upper = symbol.toUpperCase();
    const start = Math.max(0, from.getTime());
    const end = Math.max(start + 60_000, to.getTime());
    const key = `yahoo:range:${upper}:${start}:${end}`;

    return cached(key, async () => {
      const candles = await this.getCandles(
        upper,
        new Date(start),
        new Date(end),
      );
      if (candles.length === 0) {
        const quote = await this.getQuote(upper);
        return {
          symbol: upper,
          high: quote.price,
          low: quote.price,
          last: quote.price,
          ts: quote.ts,
        };
      }

      let high = candles[0].high;
      let low = candles[0].low;
      for (const candle of candles) {
        high = Math.max(high, candle.high);
        low = Math.min(low, candle.low);
      }
      return {
        symbol: upper,
        high,
        low,
        last: candles[candles.length - 1].close,
        ts: Date.now(),
      };
    });
  }

  async getCandles(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<Candle[]> {
    const upper = symbol.toUpperCase();
    const start = Math.max(0, from.getTime());
    const end = Math.max(start + 60_000, to.getTime());
    const key = `yahoo:candles:${upper}:${start}:${end}`;

    return cached(key, async () => {
      return this.loadCandles(upper, new Date(start), new Date(end));
    });
  }
}

const binanceFeed = new BinanceFeed();
const yahooFeed = new YahooFeed();

export function getPriceFeed(market: MarketName | null): PriceFeed {
  if (market === "METAL" || market === "FOREX" || market === "STOCK") {
    return yahooFeed;
  }
  return binanceFeed;
}
