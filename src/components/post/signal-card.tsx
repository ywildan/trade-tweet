import Link from "next/link";

import { formatPrice, formatPnl } from "@/lib/format";
import { SignalStatusChip } from "@/components/ui/badge";
import type { MarketName } from "@/lib/symbols";
import type { DirectionName, SignalStatusName } from "@/types/post";

/**
 * SignalCard — panel sinyal di dalam PostCard (DESIGN.md §5.2).
 * Server-safe; dipakai feed, detail, dan styleguide.
 */
export function SignalCard({
  symbol,
  direction,
  entry,
  takeProfit,
  stopLoss,
  timeframe,
  status = "OPEN",
  pnlPercent,
  market = "CRYPTO",
}: {
  symbol: string;
  direction: DirectionName;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  timeframe: string;
  status?: SignalStatusName;
  /** pnl aktual saat resolved (signed). Bila null & OPEN → tampilkan Potensi. */
  pnlPercent?: number | null;
  market?: MarketName;
}) {
  const isLong = direction === "LONG";
  const isCancelled = status === "CANCELLED";
  const potentialPct = isLong
    ? ((takeProfit - entry) / entry) * 100
    : ((entry - takeProfit) / entry) * 100;

  const pnl = pnlPercent ?? potentialPct;
  const pnlLabel = isCancelled
    ? "Status"
    : pnlPercent == null
      ? "Potensi"
      : "Hasil";
  const pnlColor =
    status === "SL_HIT" || pnl < 0 ? "text-short" : "text-long";

  return (
    <div className="my-1.5 rounded-2xl border border-border bg-bg-elev p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/symbol/${symbol}`}
          className="text-[15px] font-bold text-text hover:underline"
        >
          {symbol}
        </Link>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-[2px] text-xs font-semibold ${
            isLong ? "bg-long/15 text-long" : "bg-short/15 text-short"
          }`}
        >
          {isLong ? "▲ LONG" : "▼ SHORT"}
        </span>
        <span className="text-[13px] text-text-muted">
          · {timeframe.toUpperCase()}
          {market === "METAL" && <>&nbsp;· metal</>}
        </span>
        <span className="ml-auto">
          <SignalStatusChip status={status} />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 tabular">
        <Cell label="Entry" value={formatPrice(entry)} />
        {/* Panah mengikuti arah harga, bukan label: untuk SHORT, TP ada di
            bawah entry (▼) dan SL di atas entry (▲) — sebelumnya terbalik. */}
        <Cell
          label="TP"
          value={formatPrice(takeProfit)}
          arrow={isLong ? "▲" : "▼"}
          color="text-long"
        />
        <Cell
          label="Stop Loss"
          value={formatPrice(stopLoss)}
          arrow={isLong ? "▼" : "▲"}
          color="text-short"
        />
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-muted">{pnlLabel}</span>
          <span className={`ml-auto text-[15px] font-bold ${pnlColor}`}>
            {isCancelled ? "—" : formatPnl(pnl)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  arrow,
  color,
}: {
  label: string;
  value: string;
  arrow?: string;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className="ml-auto text-[15px] font-semibold text-text">
        {value}
        {arrow && (
          <span className={`ml-1 text-[12px] ${color ?? "text-text-muted"}`}>
            {arrow}
          </span>
        )}
      </span>
    </div>
  );
}
