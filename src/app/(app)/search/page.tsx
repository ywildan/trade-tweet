import type { Metadata } from "next";
import Link from "next/link";

import { PostCard } from "@/components/post/post-card";
import { SearchForm } from "@/components/search/search-form";
import { Avatar } from "@/components/ui/avatar";
import { UserBadges } from "@/components/ui/badge";
import { EmptyState } from "@/components/demo/stat-tile";
import { formatCount } from "@/lib/format";
import { searchAll, type SearchUser } from "@/lib/search";
import { getSessionUser } from "@/lib/session";
import type { SymbolEntry } from "@/lib/symbols";

export const metadata: Metadata = { title: "Pencarian" };

export const instant = false;

type SearchTab = "top" | "users" | "posts";

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; tab?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const query = (rawQuery ?? "").trim();
  const tab: SearchTab =
    rawTab === "users" || rawTab === "posts" ? rawTab : "top";

  const user = await getSessionUser();
  const results = await searchAll(query, user?.id ?? null);

  const hasResults =
    results.users.length > 0 ||
    results.posts.length > 0 ||
    results.symbols.length > 0;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/65 backdrop-blur">
        <div className="flex h-[53px] items-center gap-3 px-3">
          <Link
            href="/"
            aria-label="Kembali ke beranda"
            className="-ml-1 rounded-full p-2 text-[20px] transition-colors hover:bg-text/10"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <SearchForm defaultValue={query} autoFocus />
          </div>
        </div>
      </header>

      <nav
        aria-label="Tab pencarian"
        className="sticky top-[53px] z-10 flex border-b border-border bg-bg/85 backdrop-blur"
      >
        {(
          [
            { id: "top", label: "Utama" },
            { id: "users", label: "Trader" },
            { id: "posts", label: "Sinyal" },
          ] as Array<{ id: SearchTab; label: string }>
        ).map((item) => {
          const href =
            item.id === "top"
              ? `/search?q=${encodeURIComponent(query)}`
              : `/search?q=${encodeURIComponent(query)}&tab=${item.id}`;
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 py-3 text-center text-[15px] transition-colors hover:bg-text/[0.03] ${
                active ? "font-bold text-text" : "text-text-muted"
              }`}
            >
              {item.label}
              {active && (
                <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {query.length < 2 ? (
        <EmptyState
          title="Cari sesuatu"
          subtitle="Ketik minimal 2 karakter: nama trader, @handle, $simbol, atau isi postingan."
        />
      ) : !hasResults ? (
        <EmptyState
          title={`Tidak ada hasil untuk “${query}”`}
          subtitle="Coba kata kunci lain atau periksa ejaan simbol."
          cta={
            <Link
              href="/"
              className="rounded-2xl bg-accent px-4 py-2 text-[15px] font-semibold text-white"
            >
              Kembali ke feed
            </Link>
          }
        />
      ) : (
        <div className="pb-8">
          {(tab === "top" || tab === "users") && results.users.length > 0 && (
            <section className="border-b border-border">
              <h2 className="px-4 pt-3 text-[20px] font-bold">Trader</h2>
              {(tab === "top" ? results.users.slice(0, 3) : results.users).map(
                (item) => (
                  <SearchUserRow key={item.id} user={item} />
                ),
              )}
            </section>
          )}

          {(tab === "top" || tab === "users") &&
            results.symbols.length > 0 && (
              <section className="border-b border-border px-4 py-4">
                <h2 className="text-[20px] font-bold">Simbol</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {results.symbols.map((symbol) => (
                    <SymbolChip key={symbol.symbol} entry={symbol} />
                  ))}
                </div>
              </section>
            )}

          {(tab === "top" || tab === "posts") && results.posts.length > 0 && (
            <section className="border-b border-border">
              <h2 className="px-4 pt-3 text-[20px] font-bold">Postingan</h2>
              {(tab === "top" ? results.posts.slice(0, 5) : results.posts).map(
                (post) => (
                  <PostCard key={post.id} post={post} />
                ),
              )}
            </section>
          )}

          {tab === "users" && results.users.length === 0 && (
            <EmptyState
              title="Trader tidak ditemukan"
              subtitle="Coba nama atau username lain."
            />
          )}
          {tab === "posts" && results.posts.length === 0 && (
            <EmptyState
              title="Postingan tidak ditemukan"
              subtitle="Coba kata kunci atau simbol lain."
            />
          )}
        </div>
      )}
    </>
  );
}

function SearchUserRow({ user }: { user: SearchUser }) {
  return (
    <Link
      href={`/@${user.username}`}
      className="flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-text/[0.03]"
    >
      <Avatar name={user.name} src={user.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="truncate font-semibold">{user.name}</span>
          <UserBadges types={user.badges} size="sm" />
          <span className="text-[13px] text-text-muted">@{user.username}</span>
        </div>
        {user.bio && (
          <p className="mt-0.5 line-clamp-2 text-[13px] text-text-muted">
            {user.bio}
          </p>
        )}
        <p className="mt-1 text-[13px] text-text-muted">
          {formatCount(user.followers)} pengikut · win-rate{" "}
          {Math.round(user.winRate * 100)}% · {formatCount(user.totalSignals)}{" "}
          sinyal
        </p>
      </div>
    </Link>
  );
}

function SymbolChip({ entry }: { entry: SymbolEntry }) {
  return (
    <Link
      href={`/symbol/${entry.symbol}`}
      className="rounded-full border border-border bg-bg-elev px-3 py-1.5 text-[13px] transition-colors hover:border-text-muted"
    >
      <b className="font-semibold">${entry.symbol}</b>
      <span className="ml-1 text-text-muted">{entry.market}</span>
    </Link>
  );
}
