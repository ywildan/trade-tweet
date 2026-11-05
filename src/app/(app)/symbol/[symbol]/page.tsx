import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/demo/stat-tile";
import { PostCard } from "@/components/post/post-card";
import { SymbolPrice } from "@/components/symbol/symbol-price";
import { getSymbolPosts } from "@/lib/posts";
import { getPriceFeed } from "@/lib/price-feed";
import { getSessionUser } from "@/lib/session";
import { findSymbolEntry } from "@/lib/symbols";

export const instant = false;

type PageProps = { params: Promise<{ symbol: string }> };

function normalizeSymbol(raw: string): string {
  try {
    return decodeURIComponent(raw).toUpperCase();
  } catch {
    return raw.toUpperCase();
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { symbol: raw } = await params;
  const symbol = normalizeSymbol(raw);
  const entry = findSymbolEntry(symbol);
  return {
    title: `$${symbol}${entry ? ` — ${entry.name}` : ""}`,
    description: `Sinyal dan analisa ${symbol} di Neuraly.`,
  };
}

export default async function SymbolPage({ params }: PageProps) {
  const { symbol: raw } = await params;
  const symbol = normalizeSymbol(raw);
  if (!/^[A-Z0-9]{2,20}$/.test(symbol)) notFound();

  const user = await getSessionUser();
  const entry = findSymbolEntry(symbol);
  // Simbol di luar katalog bukan halaman kosong yang seolah valid.
  if (!entry) notFound();
  const market = entry.market;

  const [posts, initialQuote] = await Promise.all([
    getSymbolPosts(symbol, user?.id ?? null),
    getPriceFeed(market)
      .getQuote(symbol)
      .catch(() => null),
  ]);

  const openSignals = posts.filter(
    (post) => post.isSignal && post.status === "OPEN",
  ).length;

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-3 border-b border-border bg-bg/65 px-3 backdrop-blur">
        <BackButton />
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-bold leading-6">
            ${symbol}
          </h1>
          <p className="truncate text-[13px] leading-4 text-text-muted">
            {entry?.name ?? market} · {market}
          </p>
        </div>
      </header>

      <section className="border-b border-border p-4">
        <SymbolPrice symbol={symbol} initial={initialQuote} />
        <p className="mt-2 text-[13px] text-text-muted">
          {posts.length} postingan · {openSignals} sinyal terbuka
        </p>
      </section>

      <section>
        <h2 className="px-4 pt-3 text-[20px] font-bold">Sinyal & analisa</h2>
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <EmptyState
            title={`Belum ada postingan $${symbol}`}
            subtitle="Jadilah yang pertama membagikan setup untuk simbol ini."
            cta={
              <Link
                href="/compose"
                className="rounded-2xl bg-accent px-4 py-2 text-[15px] font-semibold text-white"
              >
                Tulis sinyal
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}
