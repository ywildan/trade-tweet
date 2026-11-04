import type { ReactNode } from "react";

/** StatTile — kartu statistik dashboard (DESIGN.md §5.5). Server-safe. */
export function StatTile({
  label,
  value,
  delta,
  hint,
  spark,
}: {
  label: string;
  value: string;
  /** Persen perubahan vs periode sebelumnya; deltaChip hijau bila positif. */
  delta?: number;
  /** Keterangan kecil di bawah angka (mis. definisi metrik). */
  hint?: string;
  spark?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-bg-elev p-4 border border-border">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] text-text-muted">{label}</div>
          <div className="mt-1 text-[28px] leading-8 font-bold text-text tabular">
            {value}
          </div>
          {delta != null && (
            <div
              className={`mt-1 text-[13px] font-semibold ${
                delta >= 0 ? "text-long" : "text-short"
              }`}
            >
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString("id-ID")}%{" "}
              <span className="text-text-muted font-normal">30 hari</span>
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

/** EmptyState — list kosong (DESIGN.md §4). */
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
    <div className="flex flex-col items-center gap-2 py-16 px-6 text-center">
      <div className="text-[20px] font-bold text-text">{title}</div>
      {subtitle && <div className="text-[15px] text-text-muted">{subtitle}</div>}
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}
