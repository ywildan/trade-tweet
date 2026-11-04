import Link from "next/link";
import { Flame, TrendingUp, Trophy } from "lucide-react";
import { SearchForm } from "@/components/search/search-form";
import { UserCard } from "@/components/user/user-card";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getTrendingSymbols } from "@/lib/trending";

export async function RightRail() {
  const sessionUser = await getSessionUser();

  const [users, follows, trending] = await Promise.all([
    prisma.user.findMany({
      take: 12,
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        badges: { select: { type: true } },
        signalStats: { select: { winRate: true, totalSignals: true } },
        _count: { select: { followers: true } },
      },
    }),
    sessionUser
      ? prisma.follow.findMany({
          where: { followerId: sessionUser.id },
          select: { followingId: true },
        })
      : Promise.resolve([]),
    getTrendingSymbols(),
  ]);

  const followed = new Set(follows.map((row) => row.followingId));
  const candidates = users.filter((user) => user.id !== sessionUser?.id);

  const topTraders = [...candidates]
    .sort(
      (a, b) =>
        (b.signalStats?.winRate ?? 0) - (a.signalStats?.winRate ?? 0) ||
        (b.signalStats?.totalSignals ?? 0) - (a.signalStats?.totalSignals ?? 0),
    )
    .slice(0, 3);

  const suggested = [...candidates]
    .sort(
      (a, b) =>
        Number(followed.has(a.id)) - Number(followed.has(b.id)) ||
        b._count.followers - a._count.followers,
    )
    .slice(0, 3);

  return (
    <div className="space-y-4 py-2">
      <SearchForm />

      <RailCard
        icon={<Flame size={18} className="text-short" />}
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
        icon={<Trophy size={18} className="text-gold" />}
        title="Trader minggu ini"
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
        icon={<TrendingUp size={18} className="text-repost" />}
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
        SPMTrade · Media sosial sinyal trading
        <br />
        Sinyal punya bukti. Reputasi punya angka.
      </p>
    </div>
  );
}

function RailCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-elev/60">
      <h2 className="flex items-center gap-2 px-4 pt-4 text-[19px] font-bold">
        {icon}
        {title}
      </h2>
      <div className="px-2 py-2">{children}</div>
    </section>
  );
}
