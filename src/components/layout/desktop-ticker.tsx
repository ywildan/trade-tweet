import Link from "next/link";
import { connection } from "next/server";
import { Flame } from "lucide-react";
import { getTrendingSymbols } from "@/lib/trending";

// Strip ticker pasar di atas feed, desktop saja (hidden di bawah lg).
// Memakai ulang getTrendingSymbols yang sama dengan RightRail, tanpa
// API atau query baru.
export async function DesktopTicker() {
  // connection() dulu: getTrendingSymbols memakai Date.now(), dan tanpa
  // akses dinamis prerenderer Next menolak komponen ini saat build.
  await connection();
  const trending = await getTrendingSymbols();
  if (trending.length === 0) return null;

  return (
    <div
      aria-label="Simbol trending"
      className="hidden items-center gap-1 overflow-x-auto border-b border-border bg-bg px-4 py-2 lg:flex"
    >
      <span className="mr-1 inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-text-muted">
        <Flame size={14} className="text-short" aria-hidden />
        Pasar
      </span>
      {trending.map((item) => (
        <Link
          key={item.symbol}
          href={`/symbol/${item.symbol}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1 text-[13px] transition-colors hover:border-text-muted"
        >
          <b>${item.symbol}</b>
          <span className="text-text-muted">
            {item.signals} sinyal
          </span>
        </Link>
      ))}
    </div>
  );
}
