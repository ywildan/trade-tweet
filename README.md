# SPMTrade

Media sosial sinyal trading — post setup seperti tweet, dengan reputasi yang
terukur lewat win-rate, badge, dan kartu share saat profit.

Spesifikasi produk: [`spesifikasi.md`](./spesifikasi.md) · Desain: [`DESIGN.md`](./DESIGN.md).

## Stack

- Next.js 16 (App Router, Cache Components) + TypeScript strict
- Tailwind CSS v4 (token di `src/app/globals.css`)
- PostgreSQL + Prisma 7 (`@prisma/adapter-pg`, client di `src/generated/prisma`)
- NextAuth v5 / Auth.js: credentials, Google, X/Twitter
- Zod untuk validasi client & server

## Menjalankan

```bash
pnpm install
cp .env.example .env      # isi DATABASE_URL + AUTH_SECRET

# butuh PostgreSQL lokal, contoh:
# createdb spmtrade

pnpm db:migrate           # prisma migrate dev
pnpm db:seed              # user dummy + admin
pnpm dev                  # http://localhost:3000
```

Build produksi:

```bash
pnpm build
pnpm start
```

## Akun seed

Semua akun memakai password **`spmtrade123`**.

| Email | Username | Role |
|---|---|---|
| admin@spmtrade.local | `@admin` | admin |
| papa@spmtrade.local | `@papaeemas` | USER |
| ibukoin@spmtrade.local | `@ibukoin` | USER |
| whalex@spmtrade.local | `@whalex` | USER |
| risetkucing@spmtrade.local | `@risetkucing` | USER |

## OAuth (opsional)

Isi `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` dan/atau `X_CLIENT_ID`/
`X_CLIENT_SECRET` di `.env`. Tombol OAuth otomatis muncul di `/login` dan
`/register` hanya jika kredensial tersedia.

Callback URL:

- Google: `http://localhost:3000/api/auth/callback/google`
- X/Twitter: `http://localhost:3000/api/auth/callback/twitter`

## Status fase

- Phase 0 — Bootstrap & design token: selesai
- Phase 1 — Auth & profil dasar: selesai
- Phase 2 — Post sinyal & feed: selesai
- Phase 3 — Interaksi sosial: selesai
- Phase 4 — Siklus sinyal, badge & kartu share: selesai
- Phase 5 — Analitik & notifikasi lanjutan: selesai
- Phase 6 — Polish (search, simbol, OG, rate limit, admin badge): selesai

## Fitur Phase 2

- Compose sinyal/post di `/compose`, modal dari feed, dan FAB mobile.
- Sinyal CRYPTO & METAL dengan autocomplete simbol, arah LONG/SHORT,
  entry/TP/SL, timeframe; validasi Zod yang sama di client & server.
- Feed **Untuk Kamu** (skor recency/follow/engagement/win-rate) dan
  **Mengikuti**, dengan infinite scroll.
- Detail `/post/[id]` + thread balasan, statistik tayangan, dan view dedupe
  harian.
- Profil menampilkan postingan terbaru pengguna.
- Post contoh otomatis dari seed (2 sinyal XAUUSD, 2 BTCUSDT, catatan,
  2 balasan) supaya feed langsung berisi.

## Fitur Phase 3

- Like, repost (termasuk kutip), simpan, dan balas dengan update optimistis
  dan rollback + toast saat gagal.
- Repost menu: Repost / Batalkan repost / Kutip postingan.
- Simpanan di `/bookmarks`; follow/unfollow di profil dan kartu user
  (hover "Berhenti ikuti").
- Tab profil **Sinyal / Balasan / Repost / Simpan** (Simpan hanya pemilik).
- Notifikasi in-app (like, repost, balasan, follow) + badge unread di nav,
  filter Semua/Belum dibaca, dan "Tandai semua dibaca".

## Fitur Phase 4

- **Auto-resolve** sinyal lewat cron: Binance untuk crypto, Yahoo Finance
  untuk metal/forex/saham (metal memakai futures Yahoo: XAUUSD→`GC=F`).
  TP/SL touch, EXPIRED 3× timeframe, `pnlPercent`, `SignalStat`, dan
  notifikasi sistem.
- **Override manual** oleh pembuat sinyal: Tandai TP / SL / Batalkan +
  catatan; override yang bertentangan dengan snapshot feed ditandai
  `disputed` dan tidak bisa dibagikan.
- **Badge otomatis**: sniper, konsisten, profit hunter, analyst sesuai §9.
- **Kartu share SVG** 1200×675 di `/api/share-card/[postId]` (unduh dengan
  `?download=1`) + menu Bagikan Hasil (unduh, buka, salin tautan).
- Seed menambah satu sinyal uji XAUUSD LONG (admin) dengan TP/SL tipis;
  jalankan cron sekali untuk melihatnya resolve otomatis.

### Menjalankan cron resolve

```bash
curl -X POST http://localhost:3000/api/cron/signal-check \
  -H "Authorization: Bearer $CRON_SECRET"
```

Di produksi, jadwalkan endpoint yang sama tiap 1–5 menit (Vercel Cron
mengirim header `Authorization: Bearer $CRON_SECRET`). Batch dibatasi
20 simbol unik per run dan hasil feed di-cache 60 detik.

## Fitur Phase 5

- **Dashboard `/dashboard`** (khusus pemilik akun): tayangan 30 hari + delta,
  follower + sparkline, engagement rate, win-rate, R:R rata-rata, tabel
  sinyal per status, grafik tayangan & interaksi per hari, dan postingan
  terbaik. Chart dibuat SVG manual tanpa library tambahan.
- **API analitik**: `GET /api/dashboard/summary`,
  `GET /api/dashboard/timeseries`, dan `GET /api/posts/[id]/analytics`
  (hanya pemilik post; 401/403 sesuai §5).
- **Panel analitik per post** untuk pemilik di halaman `/post/[id]`.
- **Notifikasi lanjutan**: `signal_resolved` menampilkan simbol + PnL,
  `badge_awarded`, dan mention `@username` (maks 5 per post) yang diparse
  saat posting.
- **Rollup harian** `DailyStat` lewat cron; dashboard tetap menghitung live
  bila cache hari itu belum ada.

### Menjalankan rollup harian

```bash
# default: kemarin UTC
curl -X POST http://localhost:3000/api/cron/daily-stats \
  -H "Authorization: Bearer $CRON_SECRET"

# isi ulang hari tertentu
curl -X POST "http://localhost:3000/api/cron/daily-stats?day=2026-11-03" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Fitur Phase 6

- **Pencarian `/search`**: tab Utama / Trader / Sinyal; mencari username &
  nama, isi post, dan simbol katalog. Kotak cari aktif di right rail dan
  ikon cari di header mobile. API: `GET /api/search?q=`.
- **Halaman simbol `/symbol/[symbol]`**: harga live (poll 30 detik lewat
  `GET /api/symbols/[symbol]`) + feed sinyal & analisa simbol tersebut.
  **Simbol trending** 7 hari tampil di right rail.
- **OG image dinamis** per post: `GET /api/og/[postId]` (PNG 1200×630 via
  `next/og`) dipasang sebagai `og:image` + Twitter card.
- **Rate limiting DB** (`RateLimit`): login/register 10/menit per IP,
  posting 10/menit per user → `429` dengan header `Retry-After`. Baris lama
  dibersihkan cron `daily-stats`.
- **Admin badge `/admin/badges`** (role `admin`): beri/cabut badge manual
  `verified` & `curator`. Admin seed: `admin@spmtrade.local`.
- Katalog simbol: `GET /api/symbols?q=` (awalan simbol & awal kata nama).
