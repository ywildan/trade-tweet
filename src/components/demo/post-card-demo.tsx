import {
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Share,
  User,
} from "lucide-react";
import { formatCount } from "@/lib/format";
import { UserBadges } from "@/components/ui/badge";
import { SignalCard } from "@/components/post/signal-card";

/**
 * Demo statis PostCard untuk /styleguide. Data contoh, bukan data nyata.
 */

const ENG = [
  { key: "reply", Icon: MessageCircle, label: "Balas", count: 12, hover: "hover:text-accent" },
  { key: "repost", Icon: Repeat2, label: "Repost", count: 34, hover: "hover:text-repost" },
  { key: "like", Icon: Heart, label: "Suka", count: 120, hover: "hover:text-like" },
  { key: "save", Icon: Bookmark, label: "Simpan", count: 5, hover: "hover:text-save" },
  { key: "share", Icon: Share, label: "Bagikan", count: null, hover: "hover:text-accent" },
] as const;

export function DemoPostCard({ symbol = "XAUUSD" }: { symbol?: string }) {
  return (
    <article className="border-b border-border p-4 hover:bg-text/3 transition-colors duration-150">
      <div className="flex gap-3">
        <Avatar name="Papa Emas" />
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-center gap-1 text-[15px]">
            <span className="font-semibold truncate">Papa Emas</span>
            <UserBadges types={["verified", "sniper"]} size="sm" />
            <span className="text-text-muted ml-1 truncate">@papaeemas</span>
            <span className="text-text-muted">·</span>
            <time className="text-text-muted">2 jam</time>
          </div>

          <p className="mt-1 text-text">
            Gold mau ngedrop dari area 2335 nya terus patah ke bawah 2320.
            Sell the rip, tunggu konfirmasi H4.
          </p>

          <SignalCard
            symbol={symbol}
            market="METAL"
            direction="SHORT"
            entry={2332.5}
            takeProfit={2312.0}
            stopLoss={2343.0}
            timeframe="4H"
            status="OPEN"
          />

          <div className="mt-2 rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-[13px]">
              <Avatar name="Ibu Koin" size={20} />
              <span className="font-semibold text-[13px]">Ibu Koin</span>
              <span className="text-text-muted">@ibukoin · 5 jam</span>
            </div>
            <p className="mt-1 text-[13px] text-text-muted line-clamp-2">
              BTC sabar dulu sen, struktur korannya belum selesai liquidasi atas spin…
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between max-w-md text-text-muted">
            {ENG.map(({ key, Icon, label, count, hover }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                title={label}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 text-[13px] p-1.5 rounded-lg transition-colors cursor-pointer ${hover}`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {count != null && <span className="tabular">{formatCount(count)}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Avatar demo: ikon orang abu-abu, sama seperti Avatar asli saat pengguna
    tidak mengisi URL avatar. */
export function Avatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-full shrink-0 inline-flex items-center justify-center bg-text-muted text-bg"
      style={{ width: size, height: size }}
      aria-hidden
      title={name}
    >
      <User
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        strokeWidth={2}
      />
    </div>
  );
}
