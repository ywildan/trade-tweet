/**
 * formatCount: angka ringkas, lokal Indonesia.
 * 999      -> "999"
 * 1234     -> "1,2 rb"
 * 2300000  -> "2,3 jt"
 */
export function formatCount(n: number): string {
  const fmt = (v: number) => {
    // 1 desimal, buang ",0"
    const s = v.toFixed(1).replace(".", ",").replace(/,0$/, "");
    return s;
  };
  if (n < 1000) return String(n);
  // Pembulatan bisa menaikkan satuan: 999.950 -> "1000 rb" (salah),
  // harusnya "1 jt". Naikkan satuan bila hasil bulatnya mencapai 1000.
  if (n < 1_000_000) {
    const rounded = Number((n / 1000).toFixed(1));
    if (rounded >= 1000) return `${fmt(n / 1_000_000)} jt`;
    return `${fmt(n / 1000)} rb`;
  }
  return `${fmt(n / 1_000_000)} jt`;
}

/** 42.5 -> "42.500,00" sederhana untuk harga (SensorCard menampilkan penuh). */
export function formatPrice(n: number): string {
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/** +5.88 -> "+5,88%" / -1.2 -> "-1,20%" (PPnL selalu dengan tanda). */
export function formatPnl(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

/** Waktu relatif ala feed: "baru saja", "5 mnt", "2 jam", "3 h", "4 Nov". */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const diff = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} h`;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric",
  }).format(date);
}

/** Tanggal lengkap di halaman detail: "4 November 2026 pukul 20.15". */
export function formatPostDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** 1234 -> "1.234" untuk angka kecil yang tidak diringkas. */
export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}
