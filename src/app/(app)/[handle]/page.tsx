import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { UserBadges } from "@/components/ui/badge";
import { EmptyState } from "@/components/demo/stat-tile";
import { PostCard } from "@/components/post/post-card";
import { FollowButton } from "@/components/user/follow-button";
import { formatPnl } from "@/lib/format";
import { getIsFollowing } from "@/lib/follows";
import {
  getUserBookmarks,
  getUserPosts,
  getUserReplies,
  getUserReposts,
} from "@/lib/posts";
import { getSession } from "@/lib/session";
import { getUserByUsername } from "@/lib/users";

// Profil harus menunggu DB agar username tak dikenal bisa mengembalikan 404 asli.
export const instant = false;

/** Parameter page bisa tiba sebagai "%40handle" — metadata sudah ter-decode. */
function decodeHandle(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await props.params;
  const decoded = decodeHandle(handle);
  if (!decoded.startsWith("@")) notFound();

  const username = decoded.slice(1).toLowerCase();
  if (!/^[a-z0-9_]{3,15}$/.test(username)) notFound();

  const user = await getUserByUsername(username);
  if (!user) notFound();

  return {
    title: `${user.name} (@${user.username})`,
    description: user.bio ?? undefined,
  };
}

export default function ProfilePage(props: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  return (
    <ProfileView params={props.params} searchParams={props.searchParams} />
  );
}

type ProfileTab = "signals" | "replies" | "reposts" | "bookmarks";

const PROFILE_TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "signals", label: "Sinyal" },
  { id: "replies", label: "Balasan" },
  { id: "reposts", label: "Repost" },
  { id: "bookmarks", label: "Simpan" },
];

async function ProfileView({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const decoded = decodeHandle(handle);
  if (!decoded.startsWith("@")) notFound();

  const username = decoded.slice(1).toLowerCase();
  if (!/^[a-z0-9_]{3,15}$/.test(username)) notFound();

  const [user, session] = await Promise.all([
    getUserByUsername(username),
    getSession(),
  ]);
  if (!user) notFound();

  const isSelf = session?.user.id === user.id;
  const viewerId = session?.user.id ?? null;

  const rawTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const requested = PROFILE_TABS.some((tab) => tab.id === rawTab)
    ? (rawTab as ProfileTab)
    : "signals";
  const tab: ProfileTab =
    requested === "bookmarks" && !isSelf ? "signals" : requested;

  const [posts, isFollowing] = await Promise.all([
    tab === "replies"
      ? getUserReplies(user.id, viewerId)
      : tab === "reposts"
        ? getUserReposts(user.id, viewerId)
        : tab === "bookmarks"
          ? getUserBookmarks(user.id, viewerId)
          : getUserPosts(user.id, viewerId),
    viewerId && !isSelf
      ? getIsFollowing(viewerId, user.id)
      : Promise.resolve(false),
  ]);

  const stats = user.signalStat;
  const joined = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(user.createdAt));

  const visibleTabs = PROFILE_TABS.filter(
    (item) => item.id !== "bookmarks" || isSelf,
  );

  const emptyCopy: Record<
    ProfileTab,
    { title: string; subtitle: string }
  > = {
    signals: {
      title: "Belum ada postingan",
      subtitle: "Sinyal dan analisa yang dibagikan akan tampil di sini.",
    },
    replies: {
      title: "Belum ada balasan",
      subtitle: "Balasan yang kamu tulis di thread akan tampil di sini.",
    },
    reposts: {
      title: "Belum ada repost",
      subtitle: "Postingan yang direpost akan tampil di sini.",
    },
    bookmarks: {
      title: "Belum ada simpanan",
      subtitle: "Simpan postingan dari feed untuk membacanya nanti.",
    },
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-4 border-b border-border bg-bg/65 px-3 backdrop-blur">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="-ml-2 rounded-full p-2 text-[20px] transition-colors hover:bg-text/10"
        >
          ←
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-bold leading-6">{user.name}</h1>
          <p className="text-[13px] leading-4 text-text-muted">
            {user.counts.posts} postingan
          </p>
        </div>
      </header>

      <div className="relative aspect-[3/1] w-full overflow-hidden bg-bg-input">
        {user.bannerUrl ? (
          // URL banner bebas domain, jadi pakai img biasa.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.bannerUrl}
            alt={`Banner ${user.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                "linear-gradient(135deg, rgba(29,155,240,0.35), rgba(0,186,124,0.22) 55%, rgba(0,0,0,0))",
            }}
          />
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-[60px] flex items-end justify-between gap-3">
          <Avatar
            name={user.name}
            src={user.avatarUrl}
            size={120}
            className="ring-4 ring-bg"
          />
          <div className="pb-1">
            <ProfileAction
              isSelf={isSelf}
              isGuest={!session?.user}
              username={user.username}
              initialFollowing={isFollowing}
            />
          </div>
        </div>

        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-[20px] font-bold leading-6">{user.name}</h2>
            <UserBadges types={user.badges} />
          </div>
          <p className="text-[15px] text-text-muted">@{user.username}</p>

          {user.bio && (
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-5">
              {user.bio}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={17} />
              Bergabung {joined}
            </span>
            {user.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={17} />
                {user.location}
              </span>
            )}
          </div>

          <div className="mt-3 flex gap-4 text-[15px] text-text-muted">
            <span>
              <b className="text-text">{user.counts.following}</b> Mengikuti
            </span>
            <span>
              <b className="text-text">{user.counts.followers}</b> Pengikut
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat
              label="Win-rate"
              value={`${Math.round((stats?.winRate ?? 0) * 100)}%`}
            />
            <MiniStat
              label="Total sinyal"
              value={String(stats?.totalSignals ?? 0)}
            />
            <MiniStat
              label="Avg PnL"
              value={formatPnl(stats?.avgPnl ?? 0)}
              tone={(stats?.avgPnl ?? 0) >= 0 ? "long" : "short"}
            />
          </div>
        </div>
      </div>

      <nav
        aria-label="Tab profil"
        className="sticky top-[53px] z-10 flex border-b border-border bg-bg/85 backdrop-blur"
      >
        {visibleTabs.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={`/@${user.username}?tab=${item.id}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 py-3 text-center text-[15px] transition-colors hover:bg-text/[0.03] ${
                active ? "font-bold text-text" : "text-text-muted"
              }`}
            >
              {item.label}
              {active && (
                <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <EmptyState
          title={emptyCopy[tab].title}
          subtitle={emptyCopy[tab].subtitle}
          cta={
            isSelf && tab === "signals" ? (
              <Link href="/compose">
                <Button size="sm">Buat sinyal</Button>
              </Link>
            ) : undefined
          }
        />
      )}
    </>
  );
}

function ProfileAction({
  isSelf,
  isGuest,
  username,
  initialFollowing,
}: {
  isSelf: boolean;
  isGuest: boolean;
  username: string;
  initialFollowing: boolean;
}) {
  if (isSelf) {
    return (
      <Link href="/settings/profile">
        <Button variant="secondary">Edit profil</Button>
      </Link>
    );
  }

  return (
    <FollowButton
      username={username}
      initialFollowing={initialFollowing}
      isGuest={isGuest}
    />
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "long" | "short";
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev px-3 py-2.5">
      <div className="text-[12px] text-text-muted">{label}</div>
      <div
        className={`mt-0.5 text-[17px] font-bold tabular ${
          tone === "long" ? "text-long" : tone === "short" ? "text-short" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

