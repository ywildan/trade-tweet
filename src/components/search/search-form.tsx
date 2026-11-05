import { Search } from "lucide-react";

/** Form pencarian GET /search — dipakai header pencarian dan right rail. */
export function SearchForm({
  defaultValue = "",
  autoFocus = false,
  tab,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  /** Tab aktif di halaman pencarian: dipertahankan saat mencari ulang. */
  tab?: string;
}) {
  return (
    <form action="/search" method="get" role="search" className="w-full">
      {tab && tab !== "top" && (
        <input type="hidden" name="tab" value={tab} />
      )}
      <label className="flex items-center gap-2 rounded-full bg-bg-input px-4 py-2.5 text-text-muted focus-within:ring-1 focus-within:ring-accent/50">
        <Search size={18} aria-hidden />
        <span className="sr-only">Cari trader, postingan, atau simbol</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="Cari trader, $simbol, atau isi post"
          className="w-full bg-transparent text-[15px] text-text placeholder:text-text-muted outline-none"
        />
      </label>
    </form>
  );
}
