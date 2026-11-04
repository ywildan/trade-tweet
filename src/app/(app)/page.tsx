import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoMark } from "@/components/ui/logo";
import { ComposeLauncher } from "@/components/post/compose-launcher";
import { Feed } from "@/components/post/feed";
import { getFeed, type FeedTab } from "@/lib/posts";
import { getSessionUser } from "@/lib/session";

type SearchParams = Promise<{
  tab?: string | string[];
}>;

export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <header className="sticky top-0 z-20 flex h-[53px] items-center justify-between border-b border-border bg-bg/65 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="lg:hidden">
            <LogoMark size={28} />
          </span>
          <h1 className="text-[20px] font-bold">Utama</h1>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href="/search"
            aria-label="Cari"
            className="rounded-full p-2 transition-colors hover:bg-text/10"
          >
            <Search size={20} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function HomeContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: FeedTab = rawTab === "following" ? "following" : "foryou";

  const user = await getSessionUser();
  const feed = await getFeed({
    tab,
    cursor: null,
    viewerId: user?.id ?? null,
  });

  return (
    <>
      {user ? (
        <ComposeLauncher
          user={{
            name: user.name ?? user.username,
            avatarUrl: user.image ?? null,
          }}
        />
      ) : (
        <GuestHero />
      )}

      <Tabs active={tab} />

      <Feed
        key={tab}
        initialItems={feed.items}
        initialCursor={feed.nextCursor}
        tab={tab}
        isGuest={!user}
        requiresAuth={feed.requiresAuth}
      />
    </>
  );
}

function Tabs({ active }: { active: FeedTab }) {
  const tabs: Array<{ id: FeedTab; label: string; href: string }> = [
    { id: "foryou", label: "Untuk Kamu", href: "/" },
    { id: "following", label: "Mengikuti", href: "/?tab=following" },
  ];

  return (
    <nav
      aria-label="Tab feed"
      className="sticky top-[53px] z-10 flex border-b border-border bg-bg/85 backdrop-blur"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex-1 py-3 text-center text-[15px] transition-colors hover:bg-text/[0.03] ${
              isActive ? "font-bold text-text" : "text-text-muted"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-accent" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function GuestHero() {
  return (
    <section className="border-b border-border px-6 py-6">
      <h2 className="text-[23px] font-bold leading-7">
        Sinyal trading,
        <br />
        dengan bukti.
      </h2>
      <p className="mt-2 max-w-[440px] text-[15px] text-text-muted">
        Posting setup seperti tweet. Kualitasmu terbukti lewat badge, win-rate,
        dan kartu share saat profit.
      </p>
      <div className="mt-4 flex gap-2">
        <Link href="/register">
          <Button>Daftar</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Masuk</Button>
        </Link>
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-bg-input" />
        <div className="h-5 w-56 animate-pulse rounded bg-bg-input" />
      </div>
      <div className="flex border-b border-border">
        <div className="flex-1 border-b-2 border-accent py-3">
          <div className="mx-auto h-4 w-24 animate-pulse rounded bg-bg-input" />
        </div>
        <div className="flex-1 py-3">
          <div className="mx-auto h-4 w-20 animate-pulse rounded bg-bg-input" />
        </div>
      </div>
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex gap-3 border-b border-border p-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-bg-input" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-bg-input" />
            <div className="h-4 w-full animate-pulse rounded bg-bg-input" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-bg-input" />
          </div>
        </div>
      ))}
    </div>
  );
}
