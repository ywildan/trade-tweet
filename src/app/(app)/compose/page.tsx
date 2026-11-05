import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { redirect } from "next/navigation";

import { ComposeBox } from "@/components/post/compose-box";
import { getPostDetail } from "@/lib/posts";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Buat postingan",
};

// Halaman butuh sesi (redirect tamu), jadi jangan divalidasi sebagai instan.
export const instant = false;

type PageProps = {
  searchParams: Promise<{ quote?: string | string[] }>;
};

export default async function ComposePage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fcompose");

  const params = await searchParams;
  const rawQuote = Array.isArray(params.quote) ? params.quote[0] : params.quote;
  const detail = rawQuote ? await getPostDetail(rawQuote, user.id) : null;
  const quoteMissing = Boolean(rawQuote) && !detail;

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[53px] items-center gap-4 border-b border-border bg-bg px-3">
        <BackButton />
        <h1 className="text-[20px] font-bold">
          {detail ? "Kutip postingan" : "Buat postingan"}
        </h1>
      </header>

      {quoteMissing && (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-xl border border-short/40 bg-short/10 px-3 py-2 text-[13px] text-short"
        >
          Postingan yang dikutip tidak ditemukan atau sudah dihapus. Postingan
          ini akan terkirim tanpa kutipan.
        </p>
      )}

      <ComposeBox
        user={{
          name: user.name ?? user.username,
          avatarUrl: user.image ?? null,
        }}
        quote={detail?.post ?? null}
        autoFocus
      />
    </>
  );
}
