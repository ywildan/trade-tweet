"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

type Quote = { price: number; ts: number };

/** Harga simbol dengan polling 30 detik (DESIGN.md §3: /symbol/[symbol]). */
export function SymbolPrice({
  symbol,
  initial,
}: {
  symbol: string;
  initial: Quote | null;
}) {
  const [quote, setQuote] = useState<Quote | null>(initial);
  const [error, setError] = useState(initial === null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/symbols/${encodeURIComponent(symbol)}`,
          { cache: "no-store" },
        );
        const body = await response.json();
        if (cancelled) return;
        if (body?.ok) {
          setQuote({ price: body.data.price, ts: body.data.ts });
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [symbol]);

  return (
    <div className="rounded-2xl border border-border bg-bg-elev p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-text-muted">Harga saat ini</span>
        <span className="text-[13px] text-text-muted">
          {error ? "delay feed" : "live · 30 dtk"}
        </span>
      </div>
      <div className="mt-1 text-[32px] font-bold leading-9 tabular">
        {quote ? formatPrice(quote.price) : "—"}
      </div>
      <p className="mt-1 text-[13px] text-text-muted" suppressHydrationWarning>
        {quote
          ? `Diperbarui ${new Date(quote.ts).toLocaleTimeString("id-ID")}`
          : "Harga belum tersedia dari feed."}
      </p>
    </div>
  );
}
