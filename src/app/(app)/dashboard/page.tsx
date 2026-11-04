import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LineChart } from "@/components/dashboard/line-chart";
import { Sparkline } from "@/components/dashboard/sparkline";
import { StatTile } from "@/components/demo/stat-tile";
import { getDashboardSummary, getDashboardTimeseries } from "@/lib/dashboard";
import {
  formatCount,
  formatNumber,
  formatRelativeTime,
} from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import type { SignalStatusName } from "@/types/post";

export const metadata: Metadata = { title: "Analitik" };

export const instant = false;

function formatPercent(value: number, digits = 1): string {
  return `${value.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function formatDecimal(value: number, digits = 2): string {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const STATUS_ORDER: Array<{
  key: SignalStatusName;
  label: string;
  tone: string;
}> = [
  { key: "OPEN", label: "Terbuka", tone: "bg-text-muted" },
  { key: "TP_HIT", label: "TP tercapai", tone: "bg-long" },
  { key: "SL_HIT", label: "SL tersentuh", tone: "bg-short" },
  { key: "EXPIRED", label: "Kedaluwarsa", tone: "bg-gold" },
  { key: "CANCELLED", label: "Dibatalkan", tone: "bg-border" },
];

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fdashboard");

  const series = await getDashboardTimeseries(user.id);
  const summary = await getDashboardSummary(user.id, series);

  const labels = series.map((point) => point.day);
  const statusTotal = STATUS_ORDER.reduce(
    (sum, entry) => sum + summary.signals.statuses[entry.key],
    0,
  );
  const statusResolved =
    summary.signals.statuses.TP_HIT +
    summary.signals.statuses.SL_HIT +
    summary.signals.statuses.EXPIRED;
  const careerResolved =
    summary.signals.tpsHit +
    summary.signals.slsHit +
    summary.signals.expired;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/65 backdrop-blur">
        <div className="flex h-[53px] items-center justify-between gap-3 px-4">
          <div>
            <h1 className="text-[20px] font-bold leading-6">Analitik</h1>
            <p className="text-[13px] leading-4 text-text-muted">
              @{user.username} · {summary.periodDays} hari terakhir
            </p>
          </div>
          <Link
            href={`/@${user.username}`}
            className="text-[13px] text-accent hover:underline"
          >
            Lihat profil
          </Link>
        </div>
      </header>

      <section className="grid gap-3 border-b border-border p-4 sm:grid-cols-2">
        <StatTile
          label="Tayangan"
          value={formatCount(summary.views.total)}
          delta={summary.views.delta ?? undefined}
          spark={<Sparkline values={summary.views.series} />}
        />
        <StatTile
          label="Pengikut"
          value={formatCount(summary.followers.total)}
          delta={summary.followers.delta ?? undefined}
          hint={`${formatNumber(summary.followers.newInPeriod)} pengikut baru dalam ${summary.periodDays} hari`}
          spark={
            <Sparkline
              values={summary.followers.series}
              className="text-repost"
            />
          }
        />
        <StatTile
          label="Engagement rate"
          value={
            summary.views.total > 0
              ? formatPercent(summary.engagement.rate)
              : "—"
          }
          hint={`${formatNumber(summary.engagement.total)} interaksi dari ${formatNumber(summary.views.total)} tayangan`}
        />
        <StatTile
          label="Win-rate"
          value={
            careerResolved > 0
              ? formatPercent(summary.signals.winRate * 100)
              : "—"
          }
          hint={`${summary.signals.tpsHit} TP · ${summary.signals.slsHit} SL · ${summary.signals.expired} expired (semua waktu)`}
        />
        <div className="sm:col-span-2">
          <StatTile
            label="Rasio R:R rata-rata"
            value={
              summary.signals.avgRr != null
                ? `1 : ${formatDecimal(summary.signals.avgRr)}`
                : "—"
            }
            hint={
              summary.signals.rrSamples > 0
                ? `Dari ${summary.signals.rrSamples} sinyal dengan Entry, TP & SL`
                : "Belum ada sinyal dengan Entry, TP & SL"
            }
          />
        </div>
      </section>

      <section className="border-b border-border px-4 py-4">
        <h2 className="text-[20px] font-bold">Sinyal per status</h2>
        <p className="mt-0.5 text-[13px] text-text-muted">
          {statusTotal} sinyal · {statusResolved} sudah selesai
        </p>

        <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {STATUS_ORDER.map((entry) => {
            const count = summary.signals.statuses[entry.key];
            const share = statusTotal > 0 ? (count / statusTotal) * 100 : 0;
            return (
              <div key={entry.key} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${entry.tone}`} />
                <span className="flex-1 text-[15px]">{entry.label}</span>
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-bg-input">
                  <span
                    className={`block h-full rounded-full ${entry.tone}`}
                    style={{ width: `${share}%` }}
                  />
                </span>
                <span className="w-10 text-right text-[15px] font-semibold tabular">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-b border-border px-4 py-4">
        <h2 className="text-[20px] font-bold">Grafik {summary.periodDays} hari</h2>

        <div className="mt-3 space-y-3">
          <div className="rounded-2xl border border-border bg-bg-elev p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-semibold">Tayangan per hari</h3>
              <span className="text-[13px] text-text-muted">
                {formatCount(summary.views.total)} total
              </span>
            </div>
            <LineChart
              values={summary.views.series}
              labels={labels}
              label="Tayangan"
              formatValue={formatCount}
            />
          </div>

          <div className="rounded-2xl border border-border bg-bg-elev p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-semibold">Interaksi per hari</h3>
              <span className="text-[13px] text-text-muted">
                {formatNumber(summary.engagement.total)} total
              </span>
            </div>
            <LineChart
              values={series.map((point) => point.engagement)}
              labels={labels}
              label="Interaksi"
              tone="repost"
              formatValue={formatNumber}
            />
            <p className="mt-2 text-[13px] text-text-muted">
              {formatNumber(summary.engagement.likes)} suka ·{" "}
              {formatNumber(summary.engagement.reposts)} repost ·{" "}
              {formatNumber(summary.engagement.replies)} balasan
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-4">
        <h2 className="text-[20px] font-bold">Postingan terbaik</h2>
        {summary.topPost ? (
          <Link
            href={`/post/${summary.topPost.id}`}
            className="mt-3 block rounded-2xl border border-border bg-bg-elev p-4 transition-colors hover:border-text-muted"
          >
            <div className="flex items-center gap-2 text-[13px] text-text-muted">
              {summary.topPost.isSignal && summary.topPost.symbol && (
                <span className="rounded-full bg-bg-input px-2 py-0.5 font-semibold text-text">
                  ${summary.topPost.symbol}
                </span>
              )}
              <span suppressHydrationWarning>
                {formatRelativeTime(summary.topPost.createdAt)}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[15px]">
              {summary.topPost.content.trim() || "(postingan sinyal)"}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-text-muted">
              <span>
                <b className="text-text">{formatCount(summary.topPost.views)}</b>{" "}
                tayangan
              </span>
              <span>
                <b className="text-text">{formatCount(summary.topPost.likes)}</b>{" "}
                suka
              </span>
              <span>
                <b className="text-text">
                  {formatCount(summary.topPost.reposts)}
                </b>{" "}
                repost
              </span>
              <span>
                <b className="text-text">
                  {formatCount(summary.topPost.replies)}
                </b>{" "}
                balasan
              </span>
            </div>
          </Link>
        ) : (
          <p className="mt-3 rounded-2xl border border-border bg-bg-elev px-4 py-6 text-center text-[15px] text-text-muted">
            Belum ada postingan untuk dianalisis.
          </p>
        )}
      </section>
    </>
  );
}
