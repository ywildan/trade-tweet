import Link from "next/link";
import { Flame, Target, TrendingUp, Trophy } from "lucide-react";
import { SearchForm } from "@/components/search/search-form";
import { UserCard } from "@/components/user/user-card";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getTrendingSymbols } from "@/lib/trending";

export async function RightRail() {
  const sessionUser = await getSessionUser();

  const [follows, trending] = await Promise.all([
    sessionUser
      ? prisma.follow.findMany({
          where: { followerId: sessionUser.id },
          select: { followingId: true },
        })
      : Promise.resolve([]),
    getTrendingSymbols(),
  ]);

  const followed = new Set(follows.map((row) => row.followingId));
  const excludeIds = [
    ...(sessionUser ? [sessionUser.id] : []),
    ...followed,
  ];

  const userSelect = {
    id: true,
    username: true,
    name: true,
    avatarUrl: true,
    badges: { select: { type: true } },
    signalStats: { select: { winRate: true, totalSignals: true } },
    _count: { select: { followers: true } },
  } as const;

  // Urutkan di database, bukan 12 user pertama yang urutannya acak.
  // Judul lama "Trader minggu ini" menyesatkan karena datanya win-rate
  // lifetime, bukan mingguan.
  const [topTraders, suggested] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(sessionUser ? { id: { not: sessionUser.id } } : {}),
        signalStats: { totalSignals: { gt: 0 } },
      },
      orderBy: [
        { signalStats: { winRate: "desc" } },
        { signalStats: { totalSignals: "desc" } },
      ],
      take: 3,
      select: userSelect,
    }),
    prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      orderBy: { followers: { _count: "desc" } },
      take: 3,
      select: userSelect,
    }),
  ]);

  const topSignal = trending[0] ?? null;

  return (
    <div className="space-y-4 py-2">
      <SearchForm />

      {/* Sorotan satu sinyal teratas dari data trending yang sama, bukan
          query baru dan bukan duplikat daftar "Simbol trending". */}
      {topSignal && (
        <RailCard
          icon={<Target size={18} className="text-long" aria-hidden />}
          title="Sinyal teratas minggu ini"
        >
          <Link
            href={`/symbol/${topSignal.symbol}`}
            className="block rounded-xl border-l-2 border-long px-3 py-2.5 transition-colors hover:bg-text/[0.03]"
          >
            <span className="block text-[19px] font-bold leading-6">
              ${topSignal.symbol}
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-text-muted">
              {topSignal.name ?? topSignal.market}
            </span>
            <span className="mt-1.5 block text-[13px]">
              <b className="text-long">{topSignal.signals} sinyal</b>
              <span className="text-text-muted"> · 7 hari terakhir</span>
            </span>
            <span className="mt-1 block text-[13px] font-semibold text-accent">
              Lihat sinyal →
            </span>
          </Link>
        </RailCard>
      )}

      <RailCard
        variant="plain"
        icon={<Flame size={18} className="text-short" aria-hidden />}
        title="Simbol trending"
      >
        {trending.length === 0 ? (
          <p className="px-2 py-4 text-[13px] text-text-muted">
            Belum ada sinyal minggu ini.
          </p>
        ) : (
          trending.map((item, index) => (
            <Link
              key={item.symbol}
              href={`/symbol/${item.symbol}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-text/[0.03]"
            >
              <span className="w-4 text-[13px] font-semibold text-text-muted">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">
                  ${item.symbol}
                </span>
                <span className="block truncate text-[13px] text-text-muted">
                  {item.name ?? item.market}
                </span>
              </span>
              <span className="shrink-0 text-[13px] text-text-muted">
                {item.signals} sinyal
              </span>
            </Link>
          ))
        )}
      </RailCard>

      <RailCard
        icon={<Trophy size={18} className="text-gold" aria-hidden />}
        title="Trader teratas"
      >
        {topTraders.length === 0 ? (
          <p className="py-4 text-[13px] text-text-muted">
            Belum ada data trader.
          </p>
        ) : (
          topTraders.map((user) => (
            <UserCard
              key={user.id}
              user={{
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
                badges: user.badges.map((badge) => badge.type),
              }}
              isFollowing={followed.has(user.id)}
              isGuest={!sessionUser}
              detail={`Win-rate ${Math.round((user.signalStats?.winRate ?? 0) * 100)}%`}
            />
          ))
        )}
      </RailCard>

      <RailCard
        variant="plain"
        icon={<TrendingUp size={18} className="text-repost" aria-hidden />}
        title="Siapa untuk diikuti"
      >
        {suggested.length === 0 ? (
          <p className="py-4 text-[13px] text-text-muted">
            Belum ada trader lain.
          </p>
        ) : (
          suggested.map((user) => (
            <UserCard
              key={user.id}
              user={{
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
                badges: user.badges.map((badge) => badge.type),
              }}
              isFollowing={followed.has(user.id)}
              isGuest={!sessionUser}
              detail={`${user._count.followers} pengikut`}
            />
          ))
        )}
      </RailCard>

      <p className="px-2 text-[13px] leading-5 text-text-muted">
        Neuraly · Media sosial sinyal trading
        <br />
        Sinyal punya bukti. Reputasi punya angka.
        <br />
        <Link href="/privacy" className="hover:underline">
          Privasi
        </Link>
        {" · "}
        <Link href="/terms" className="hover:underline">
          Syarat
        </Link>
      </p>
    </div>
  );
}

// Dua perlakuan mengikuti isi: "card" berbingkai untuk sorotan dan
// peringkat, "plain" daftar terbuka untuk deret yang dibaca berurutan.
function RailCard({
  icon,
  title,
  variant = "card",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  variant?: "card" | "plain";
  children: React.ReactNode;
}) {
  if (variant === "plain") {
    return (
      <section>
        <h2 className="flex items-center gap-2 px-2 pt-2 text-[19px] font-bold">
          {icon}
          {title}
        </h2>
        <div className="px-2 py-2">{children}</div>
      </section>
    );
  }
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg">
      <h2 className="flex items-center gap-2 px-4 pt-4 text-[19px] font-bold">
        {icon}
        {title}
      </h2>
      <div className="px-2 py-2">{children}</div>
    </section>
  );
}
