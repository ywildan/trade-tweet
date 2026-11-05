import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

/** Kartu statistik dashboard. */
export function StatTile({
  label,
  value,
  delta,
  hint,
  spark,
}: {
  label: string;
  value: string;
  /** Persen perubahan vs 30 hari sebelumnya. */
  delta?: number;
  /** Keterangan kecil di bawah angka (mis. definisi metrik). */
  hint?: string;
  spark?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-bg-elev p-4 border border-border">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] text-text-muted">{label}</div>
          <div className="mt-1 text-[28px] leading-8 font-bold text-text tabular">
            {value}
          </div>
          {delta != null && (
            <div className="mt-1 flex items-center gap-1 text-[13px]">
              {delta >= 0 ? (
                <TrendingUp size={14} aria-hidden className="text-long" />
              ) : (
                <TrendingDown size={14} aria-hidden className="text-short" />
              )}{" "}
              <span className="font-semibold text-text tabular">
                {Math.abs(delta).toLocaleString("id-ID")}%
              </span>{" "}
              <span className="text-text-muted font-normal">
                vs 30 hari lalu
              </span>
            </div>
          )}
          {hint && (
            <div className="mt-1 text-[13px] text-text-muted">{hint}</div>
          )}
        </div>
        {spark && <div className="self-end">{spark}</div>}
      </div>
    </div>
  );
}

/** State kosong untuk list. */
export function EmptyState({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle?: string;
  cta?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 py-16 px-6 text-center"
    >
      <div className="text-[20px] font-bold text-text">{title}</div>
      {subtitle && <div className="text-[15px] text-text-muted">{subtitle}</div>}
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}
