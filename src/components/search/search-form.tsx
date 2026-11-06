import { useId } from "react";
import { Search } from "lucide-react";

/** Form pencarian GET /search, dipakai header pencarian dan right rail. */
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
  const inputId = useId();
  return (
    <form action="/search" method="get" role="search" className="w-full">
      {tab && tab !== "top" && (
        <input type="hidden" name="tab" value={tab} />
      )}
      {/* Label disembunyikan dari tampilan tapi tetap ada untuk screen reader. */}
      <label htmlFor={inputId} className="sr-only">
        Cari trader, postingan, atau simbol
      </label>
      <span className="flex min-h-11 items-center gap-2 rounded-lg bg-bg-input px-4 py-2.5 text-text-muted focus-within:ring-1 focus-within:ring-accent/50">
        <Search size={18} aria-hidden />
        <input
          id={inputId}
          type="search"
          name="q"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="Cari trader, $simbol, atau isi post"
          className="w-full bg-transparent text-[15px] text-text placeholder:text-text-muted"
        />
      </span>
    </form>
  );
}
