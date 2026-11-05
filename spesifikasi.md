# SPMTRADE — Spesifikasi Produk & Teknis

> **Nama produk (working title):** SPMTrade — "Media sosial sinyal trading".
> **Analogi:** X.com (Twitter), tetapi kontennya adalah **sinyal & analisa trading**, dan reputasi trader terukur & terbukti.
> **Audience:** trader crypto/metal/forex yang membagikan setup, dan follower yang mencari ide trading.
> **Dokumen pendamping:** semua spesifikasi visual ada di `DESIGN.md`.

---

## 0. Cara Membaca Dokumen Ini

Dokumen ini ditulis untuk **dibangun bertahap oleh agent yang berbeda-beda**. Aturan:

1. Setiap fase (Phase 0–6) adalah satu unit kerja mandiri. Agent yang mengerjakan satu fase WAJIB membaca semua bagian yang dirujuk fase tersebut, plus `DESIGN.md` untuk semua hal UI.
2. Semua kode **dibuat di dalam folder project** (Next.js app di root: `medsos-trade/`).
3. Setiap fase WAJIB berakhir dengan: build sukses (`pnpm build`), migrasi/seed jalan, dan daftar acceptance criteria fase itu terpenuhi.
4. Ketika mengubah perilaku produk, update dokumen ini juga (dokumen = source of truth).
5. BATASI SCOPE: agent hanya boleh mengerjakan item fase yang ditugaskan. Jangan "sekalian" mengerjakan fase berikutnya.

---

## 1. Ringkasan Produk

Satu kalimat: **kamu bisa nge-post sinyal trading seperti nge-tweet, dan kualitas sinyalmu terbukti lewat badge, win-rate, dan kartu share otomatis saat profit.**

Pilar produk:

| Pilar | Penjelasan |
|---|---|
| **Sinyal sebagai konten** | Post = tweet + struktur data trading (pasangan, arah, entry, TP/SL, timeframe). |
| **Reputasi terukur** | Sinyal punya siklus hidup (OPEN → TP HIT / SL HIT / EXPIRED) yang di-update otomatis dari feed harga + override manual. |
| **Bukti sosial** | Badge, win-rate, dan **kartu share SVG** otomatis digenerate saat sinyal TP → dibagikan ke mana pun sebagai bukti. |
| **Interaksi X-style** | Like, repost, komen, simpan (bookmark), follow. |
| **Analitik** | Views, followers, engagement, performa sinyal untuk pembuat sinyal. |

**Market utama:** crypto, **plus metal (XAUUSD emas, XAGUSD perak) sebagai kelas kedua**. Saham/forex lain disiapkan struktur datanya. Feed harga per market pakai provider berbeda (lihat §2 dan §8).

---

## 2. Tech Stack (TERKUNCI)

| Layer | Pilihan | Catatan |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Satu repo, fullstack. |
| Bahasa | **TypeScript (strict)** | Wajib. |
| DB + ORM | **PostgreSQL + Prisma 7** | Di env ini Prisma 7 wajib driver adapter (`@prisma/adapter-pg`), URL koneksi di `prisma.config.ts`, client generate ke `src/generated/prisma`. Instance client: `import { prisma } from "@/lib/db"`. Klien diinstal & tergenerate sejak Phase 0; migrasi jalan saat DB tersedia (Phase 1). |
| Styling | **Tailwind CSS v4** | Token di `src/app/globals.css` via CSS variables + `@theme inline` (Tailwind v4 = CSS-first, tidak ada `tailwind.config.ts`). Konvensi class util color: `bg-bg`, `bg-bg-elev`, `border-border`, `text-text-muted`, `text-accent`, `text-long`, `text-short`, dll. |
| Auth | **NextAuth (Auth.js) credentials + OAuth (Google, X/Twitter)** | Password hash bcrypt/argon2. |
| Validasi | **Zod** | Schema validasi dipakai ulang client & server. |
| State/data client | **fetch langsung + IntersectionObserver** | Tanpa Redux; TanStack Query tidak dipakai (tidak ada di package.json). |
| Feed harga | **Abstraksi `PriceFeed`** per market — implementasi: (1) **CRYPTO → Binance public REST** (`/api/v3/ticker`, kline) tanpa API key; (2) **METAL/FOREX/STOCK → Yahoo Finance chart endpoint** (`query1.finance.yahoo.com/v8/finance/chart/GC=F` untuk XAUUSD, `SI=F` untuk XAGUSD — simbol spot `XAUUSD=X` sudah delisted Yahoo) tanpa API key (data bisa delay beberapa menit — acceptable, bisa dioverride manual). Semua provider cache 60s + rate-limit sederhana. | Mendukung sinyal crypto & metal sejak Phase 4. |
| Ikon | **lucide-react**. Font: stack sistem (lihat DESIGN.md). | |
| Testing (fase akhir) | Vitest (unit/util) — opsional untuk fase awal | |

**Monorepo TIDAK diperlukan.** Satu Next.js app. Worker harga berupa route `/api/cron/*` + verifikasi secret (kompatibel Vercel Cron).

---

## 3. Data Model (Prisma — definisikan persis seperti ini)

```prisma
model User {
  id            String   @id @default(cuid())
  username      String   @unique            // handle @username, lowercase, regex ^[a-z0-9_]{3,15}$
  name          String                      // display name, max 50
  email         String   @unique
  passwordHash  String?                     // null jika OAuth-only
  bio           String?  @db.Text           // max 160
  avatarUrl     String?
  bannerUrl     String?
  location      String?
  createdAt     DateTime @default(now())

  posts         Post[]
  following     Follow[] @relation("follower")
  followers     Follow[] @relation("following")
  likes         Like[]
  bookmarks     Bookmark[]
  notifications Notification[] @relation("recipient")
  signalStats   SignalStat?
  badges        UserBadge[]
}

enum Market { CRYPTO METAL FOREX STOCK }   // METAL: XAUUSD/XAGUSD; Phase 2 aktif: CRYPTO & METAL. STOCK/FOREX-lain bisa post, resolve manual hingga feed tersedia.
enum Direction { LONG SHORT }
enum SignalStatus { OPEN TP_HIT SL_HIT EXPIRED CANCELLED }

model Post {
  id          String   @id @default(cuid())
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  content     String   @db.Text            // max 280 (fitur sinyal menambah struktur, bukan menambah panjang)
  quoteOfId   String?                      // untuk Quote Repost
  replyToId   String?                      // untuk Komen (reply) — buat reply-thread
  createdAt   DateTime @default(now())
  editedAt    DateTime?
  deletedAt   DateTime?                    // soft delete: tampilkan "postingan dihapus" di thread

  /// Bagian sinyal (HANYA jika isSignal=true)
  isSignal    Boolean  @default(false)
  market      Market?
  symbol      String?                      // "BTCUSDT" / "XAUUSD" (uppercase)
  direction   Direction?
  entry       Float?
  takeProfit  Float?                       // multi-TP = fase lanjut; fase 2 single TP
  stopLoss    Float?
  timeframe   String?                      // "4H", "1D", ...
  status      SignalStatus? @default(OPEN) // hanya relevan jika isSignal
  resolvedAt  DateTime?
  resolvedBy  String?                      // "auto" | userId
  pnlPercent  Float?                       // diisi saat resolve: (+% utk TP, -% utk SL)

  views       Int      @default(0)         // bertambah per render detail + view dedupe feed (lihat §7)

  likes       Like[]
  reposts     Repost[]
  bookmarks   Bookmark[]
  notify      Notification[]

  @@index([authorId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([symbol, createdAt(sort: Desc)])
}

model Like    { id String @id @default(cuid()); userId String; postId String; createdAt DateTime @default(now()); @@unique([userId, postId]) }
model Repost  { id String @id @default(cuid()); userId String; postId String; createdAt DateTime @default(now()); @@unique([userId, postId]) }
model Bookmark{ id String @id @default(cuid()); userId String; postId String; createdAt DateTime @default(now()); @@unique([userId, postId]) }

model Follow {
  id String @id @default(cuid())
  followerId String          // yang menekan Follow
  followingId String         // yang diikuti
  createdAt DateTime @default(now())
  @@unique([followerId, followingId])
}

model UserBadge {
  id String @id @default(cuid())
  userId String
  type   String          // daftar badge & syarat lihat §9
  awardedAt DateTime @default(now())
  @@unique([userId, type])
}

model SignalStat {          // statistik gabungan per user, di-update saat resolve
  userId String @id
  totalSignals Int @default(0)
  tpsHit Int @default(0)
  slsHit Int @default(0)
  expired Int @default(0)
  winRate Float @default(0)      // tpsHit / (tpsHit+slsHit), update saat resolve
  avgPnl Float @default(0)
}

model Notification {
  id String @id @default(cuid())
  recipientId String
  actorId String?                 // pembuat aksi (null utk sistem)
  type String                      // "like" | "repost" | "reply" | "follow" | "signal_resolved" | "badge_awarded" | "mention"
  postId String?
  readAt DateTime?
  createdAt DateTime @default(now())
  @@index([recipientId, createdAt(sort: Desc)])

  recipient User @relation("recipient", fields: [recipientId], references: [id])
  actor     User? @relation("actor", fields: [actorId], references: [id])
  post      Post? @relation(fields: [postId], references: [id])
}
```

Rules tambahan model:
- `content` TIDAK boleh melebihi 280 karakter (hitung: emoji = 2 seperti X.com).
- Reply (`replyToId`) hanya boleh 1 level dari root untuk timeline utama; thread detail menampilkan nested reply (flat, sorted by createdAt).
- Quote repost: `quoteOfId` menunjuk post lain; render sebagai kartu kutipan di DALAM post baru.
- Soft delete: isi `deletedAt`, JANGAN hapus baris; thread tetap utuh.
- Tabel tambahan yang dibutuhkan fase lanjutan (buat sekalian di Phase 2 karena murah): `PostView(postId, viewerKey, day, count)` unique `[postId, viewerKey, day]`, `ProfileView(profileId, viewerKey, day)` unique `[profileId, viewerKey, day]`, `SignalCheck(postId, ts, price)` (log harga worker), `DailyStat(userId, day, views, profileViews, likes, reposts, replies)`.

---

## 4. Fase Build (Roadmap untuk agent)

> Setiap fase = tugas 1 agent. **Order WAJIB berurutan.**

### Phase 0 — Bootstrap & Design Token
Buat scaffold Next.js (App Router + TS + Tailwind + Prisma), gayakan design token dari `DESIGN.md §2` ke `tailwind.config.ts` + CSS variables, halaman contoh (`/` = placeholder brand, `/styleguide` = semua komponen dasar dari DESIGN.md §5 dengan warna, spacing, tipografi, tombol, badge, dark mode toggle).
- **Acceptance:** build sukses; `/styleguide` menampilkan seluruh token & komponen DESIGN.md; dark mode default; switch terang/gelap berfungsi.

> ✅ **Status:** SELESAI (2026-11-04). `pnpm build` ✔; `/` + `/styleguide` prerendered; token dark-default via `globals.css`; `ThemeToggle` berfungsi; Prisma client tergenerate. Migrasi DB diselesaikan di Phase 1 (`20261104132731_init`, PostgreSQL 16 lokal).

### Phase 1 — Auth & Profil Dasar
NextAuth (credentials + Google + X OAuth), registrasi, login, halaman profil `@username`, edit profil (name, bio, avatar, banner), 404 handle. Seed beberapa user dummy + 1 admin.
- **Acceptance:** register/login/logout; profil tampil dengan banner+avatar+bio; edit profil persist; guest bisa LIHAT feed/detail tapi aksi yang butuh auth diarahkan ke `/login`.

> ✅ **Status:** SELESAI (2026-11-04). NextAuth v5 (JWT) dengan credentials + Google/X opsional (tombol muncul bila env diisi). API JSON `POST /api/auth/register|login|logout`, `GET /api/auth/me`, `GET/PATCH /api/users/[username]` (envelope `{ok,...}` + Zod). Profil `@username` (banner 3:1, avatar 120, bio, badge, statistik signal), `/settings/profile` untuk edit (name, bio, lokasi, avatar/banner URL) + logout, 404 asli untuk handle tak dikenal, redirect guest `/settings/*` → `/login`. Migrasi `20261104132731_init` + seed 5 akun (1 admin, 4 dummy) berjalan. `pnpm build` ✔.

### Phase 2 — Post Sinyal & Feed (inti produk)
- **Compose** (halaman `/compose` + modal kecil di UI): text 280-char + toggle "Ini sinyal" → tampilkan form sinyal (market: CRYPTO & METAL aktif; symbol dengan autocomplete dari `SYMBOL_CATALOG`, mis. BTCUSDT maupun XAUUSD; direction LONG/SHORT, entry, TP, SL, timeframe). Validasi Zod: TP ≠ SL ≠ entry; LONG → TP > entry, SL < entry; SHORT → TP < entry, SL > entry. (STOCK/FOREX-lain tampil tapi ditandai "segera" — resolve manual.)
- **Feed halaman utama:** 2 tab: **Untuk Kamu** (rekomendasi sederhana, lihat §6) dan **Mengikuti** (post dari user yang di-follow, terbaru dulu). Infinite scroll.
- **Detail post** `/post/[id]` + thread reply.
- **API:** `POST /api/posts`, `GET /api/feed?tab=&cursor=`, `GET /api/posts/[id]`.
- **Acceptance:** bisa compose sinyal (dan post biasa), muncul di feed, detail + reply works, validasi entry/TP/SL sesuai logika LONG/SHORT ditolak server-side juga.

> ✅ **Status:** SELESAI (2026-11-04). Compose `/compose` + modal feed + FAB mobile; `SYMBOL_CATALOG` (30 crypto + 4 metal) dengan autocomplete & auto-market; Zod `postSchema` menolak TP/SL salah arah, TP=SL, simbol beda market, dan market FOREX/STOCK. Feed 2 tab dengan skor §6 (`getFeed`), infinite scroll (`Feed` + IntersectionObserver), Mengikuti memakai cursor id. Detail `/post/[id]` + thread balasan (balasan ke balasan diratakan ke root), compose balasan, view dedupe `PostView`/hari, statistik strip. API `POST /api/posts`, `GET /api/feed`, `GET /api/posts/[id]` + envelope §5. Profil menampilkan post terbaru. Migrasi `20261104134508_post_reply_quote_relations` (relasi balasan/kutipan) + seed 8 post contoh (termasuk XAUUSD & BTCUSDT). `pnpm build` ✔, `pnpm lint` ✔.

### Phase 3 — Interaksi Sosial
Like, Repost (repost ke profil + quote), Komen (reply), Simpan (bookmark + halaman `/bookmarks`), Follow/Unfollow (tombol di profil + kartu user). Semua optimis-update UI, idempotent (unique constraint). Halaman profil menambah tab: **Sinyal / Balasan / Repost / Simpan (milik sendiri saja)**. Counter live di semua komponen post (DESIGN.md §5.1). Notifikasi in-app untuk: like, repost, reply, follow.
- **Acceptance:** seluruh aksi toggle dari UI; badge angka muncul di nav; notification bell menampilkan list + unread dot.

> ✅ **Status:** SELESAI (2026-11-04). Like/repost/simpan toggle optimistis dengan rollback + toast global ([`toast.tsx`](src/components/ui/toast.tsx), [`post-actions.tsx`](src/components/post/post-actions.tsx)); menu repost berisi Repost/Batalkan + **Kutip postingan** (compose `/compose?quote=` dengan preview). Simpanan di `/bookmarks`; follow/unfollow di profil + UserCard right rail (hover "Berhenti ikuti" merah). Profil menambah tab Sticky **Sinyal / Balasan / Repost / Simpan** (Simpan hanya self). Notifikasi in-app untuk like/repost/reply/follow + badge unread di nav desktop/mobile, halaman `/notifications` dengan filter Semua/Belum dibaca dan "Tandai semua dibaca". API baru: `POST/DELETE /api/posts/[id]/like|repost|bookmark`, `GET /api/posts/[id]/replies`, `POST/DELETE /api/users/[username]/follow`, `GET /api/notifications`, `POST /api/notifications/read-all`, `GET /api/users/[username]/posts?tab=`. Seed menambah 3 repost, 3 simpanan, 9 notifikasi. `pnpm build` ✔, `pnpm lint` ✔.

### Phase 4 — Siklus Sinyal, Badge & Kartu Share (FITUR PENJUAL UTAMA)
1. **Auto-resolve:** route `/api/cron/signal-check` (dipanggil cron tiap 1–5 menit) mem-batch semua `status=OPEN`: fetch harga symbol lewat `PriceFeed` sesuai market (CRYPTO → Binance; METAL/FOREX/STOCK → Yahoo Finance chart, simbol termap: `XAUUSD`→`GC=F`, `XAGUSD`→`SI=F`), cek touch TP/SL (high/low rentang entry-time→now), set `TP_HIT`/`SL_HIT`, hitung `pnlPercent`, notifikasi pembuat sinyal. 2. **Override manual:** pembuat sinyal bisa finalisasi bila API/data delay atau tidak akurat ("Close Manual" + alasan). 3. **EXPIRED:** bila lebih 3× timeframe tanpa touch TP/SL, tandai EXPIRED (pnl = perubahan harga saat itu).
   - **Breakdown teknis:** buat interface `PriceFeed { getQuote(symbol): { price, ts } }` + factory pilih provider dari `Post.market`. Jangan hardcode Binance di logic resolve. Yahoo rate-limited: worker kerjakan batch max 20 simbol per menit, pakai cache. Feed gagal → logging normal, sinyal tetap OPEN, retry siklus berikutnya.
2. **Badge otomatis** sesuai tabel §9 (Query gate dihitung dari SignalStat).
3. **Kartu Share SVG:** endpoint `GET /api/share-card/[postId]` → `image/svg+xml` (1200×675), layout sesuai DESIGN.md §5.4 (brand, ticker, arah, entry→TP/SL, pnl besar, win-rate pembuat, handle @username). Tombol "Bagikan Hasil" di post yang TP_HIT: download SVG (header `Content-Disposition`) + Copy-link.
- **Acceptance:** sinyal test resolve otomatis + bisa override; **termasuk 1 sinyal XAUUSD yang resolve otomatis melalui Yahoo feed** (contoh seed: sinyal XAUUSD arah LONG dengan selisih TP/SL tipis agar cepat tersentuh); badge non-earned tidak tampil; kartu SVG bisa diunduh dan visual sesuai DESIGN.md §5.4; win-rate profil ter-update.

> ✅ **Status:** SELESAI (2026-11-04). [`price-feed.ts`](src/lib/price-feed.ts): `PriceFeed` dengan Binance (CRYPTO) + Yahoo (METAL/FOREX/STOCK), cache 60 detik, cookie Yahoo via `node:https`, retry+query2, dan mapping metal ke futures Yahoo (`XAUUSD→GC=F`, karena `XAUUSD=X` sudah delisted). [`signal-resolver.ts`](src/lib/signal-resolver.ts): cron batch max 20 simbol, touch TP/SL (SL diprioritaskan bila keduanya), EXPIRED 3× timeframe, update `SignalStat` (winRate/avgPnl), `SignalCheck` snapshot, dan notifikasi sistem. Cron: `GET/POST /api/cron/signal-check` dengan `Authorization: Bearer $CRON_SECRET`. Override manual `POST /api/posts/[id]/resolve` (TP/SL/Cancel + catatan, `disputed` bila bertentangan dengan snapshot feed) + form "Kelola sinyal" di detail. Badge otomatis §9 ([`badges.ts`](src/lib/badges.ts)) + notifikasi badge. Kartu `GET /api/share-card/[postId]?download=1` (SVG 1200×675, ditolak untuk disputed) + menu Bagikan Hasil (unduh/buka/salin tautan). Seed menambah sinyal uji XAUUSD admin yang resolve otomatis TP via Yahoo. `pnpm build` ✔, `pnpm lint` ✔.

### Phase 5 — Analitik & Notifikasi Lanjutan
- **Dashboard `/dashboard`** (khusus pemilik akun): kartu ringkas — total views (30 hari), followers (tren + grafik sparkline), engagement rate, win-rate, R:R rata-rata; tabel sinyal per status; grafik line views & engagement per hari; top performing post.
- **Notifikasi lanjutan:** tipe `signal_resolved` & `badge_awarded` + mention `@username` di konten (parse + tipe `mention`).
- **Analytics per post:** `GET /api/posts/[id]/analytics` (owner-only): views, likes, reposts, bookmarks, replies.
- **Acceptance:** angka dashboard konsisten dengan data DB; notifikasi signal_resolved/badge tampil; chart render tanpa library heavy (SVG manual atau ringan).

> ✅ **Status:** SELESAI (2026-11-04). [`dashboard.ts`](src/lib/dashboard.ts): ringkasan 30 hari (tayangan + delta periode sebelumnya, follower kumulatif + tren, engagement rate = interaksi ÷ tayangan, win-rate dari `SignalStat`, R:R rata-rata) + timeseries harian; angka cache `DailyStat` dipakai bila ada, selain itu query langsung (hari berjalan selalu live). Cron rollup baru `GET/POST /api/cron/daily-stats` (secret sama, `?day=YYYY-MM-DD` opsional) dengan lib [`daily-stats.ts`](src/lib/daily-stats.ts). API baru: `GET /api/dashboard/summary`, `GET /api/dashboard/timeseries`, `GET /api/posts/[id]/analytics` (401 guest, 403 non-owner). Halaman `/dashboard` owner-only berisi 5 `StatTile` + `Sparkline`, tabel status sinyal, 2 `LineChart` SVG manual ([`line-chart.tsx`](src/components/dashboard/line-chart.tsx), tanpa library chart), dan kartu postingan terbaik; panel analitik per post tampil untuk pemilik di `/post/[id]`. Parser mention `@username` ([`mentions.ts`](src/lib/mentions.ts), maks 5, skip diri sendiri & penerima notif yang sama) membuat notifikasi `mention`; pesan `signal_resolved` kini menyertakan simbol + PnL. Navigasi "Analitik" ditambahkan di sidebar, mobile nav, dan menu akun. Seed menambah ~1.400 baris `PostView` tersebar 30 hari untuk 5 post demo + 3 notifikasi contoh (`signal_resolved`, `badge_awarded`, `mention`), serta menyamakan `Post.views` dengan jumlah view seed. `pnpm build` ✔, `pnpm lint` ✔, `tsc --noEmit` ✔.

### Phase 6 — Polish (jika waktu ada)
Search user & $SYMBOL, halaman `/symbol/[symbol]`, trending simbol, meta OG dinamis per post (og:image = kartu share SVG → render raster via satori/resvg jika perlu), rate limiting sederhana via tabel DB, admin panel badge (role `admin` di User).

> ✅ **Status:** SELESAI (2026-11-04). **Pencarian** `/search` + `GET /api/search` (user by username/nama, isi post, simbol katalog) dengan tab Utama/Trader/Sinyal; kotak cari aktif di right rail + ikon cari di header mobile. **Simbol**: `GET /api/symbols?q=` (katalog, awalan simbol & awal kata nama), `GET /api/symbols/[symbol]` (harga `PriceFeed`), halaman `/symbol/[symbol]` dengan harga polling 30 detik + feed sinyal/analisa, dan **simbol trending** 7 hari di right rail. **OG dinamis** `GET /api/og/[postId]` memakai `ImageResponse` bawaan `next/og` (1200×630, PNG) + `openGraph`/`twitter` di metadata post. **Rate limit** tabel `RateLimit` (migrasi `20261104154952_phase6_rate_limit`): login & register 10/menit per IP, posting 10/menit per user → `429 RATE_LIMITED` + `Retry-After`; baris lama dibersihkan cron `daily-stats`. **Admin badge** `/admin/badges` (role `admin`) + API `POST/DELETE /api/admin/users/[username]/badges` untuk `verified` & `curator`; badge otomatis tetap dikelola cron, notifikasi hanya dibuat saat badge benar-benar baru. Seed tidak berubah. `pnpm build` ✔, `pnpm lint` ✔, `tsc --noEmit` ✔; diuji 401/403/429, OG `image/png`, dan UI search/symbol/admin.

---

## 5. Kontrak API (ringkas)

Semua route di `/api/*` Next.js route handlers. Response JSON standar:

```
{ ok: true,  data: ... }
{ ok: false, error: { code, message, details? } }
```
| Code | Kondisi |
|---|---|
| 400 INVALID | Zod gagal |
| 401 UNAUTH | tidak login |
| 403 FORBIDDEN | bukan owner |
| 404 NOT_FOUND | sumber tidak ada/soft-deleted |
| 409 CONFLICT | duplikat (mis. like dobel) |
| 429 RATE_LIMITED | rate limit |

Endpoint per fase (ringkas; bentuk response HARUS patuh di atas):

- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET/PATCH /api/users/[username]` · `GET /api/users/[username]/posts?tab=signals|replies|reposts|bookmarks`
- `GET /api/feed?tab=foryou|following&cursor=`
- `POST /api/posts` · `GET /api/posts/[id]` · `PATCH /api/posts/[id]` (opsional, edit ≤ 1 jam) · `DELETE /api/posts/[id]` (soft)
- `POST/DELETE /api/posts/[id]/like` · `.../repost` · `.../bookmark` · `GET /api/posts/[id]/replies`
- `POST/DELETE /api/users/[username]/follow`
- `GET /api/notifications?cursor=` · `POST /api/notifications/read-all`
- `POST /api/cron/signal-check` (secret header)
- `GET /api/share-card/[postId]` (SVG)
- `GET /api/dashboard/summary` · `GET /api/dashboard/timeseries`
- `GET /api/search?q=` (Phase 6)
- `GET /api/symbols?q=` (autocomplete simbol: daftar `SYMBOL_CATALOG` — simbol Binance populer (dari `exchangeInfo`, cache 1 jam) + metal `XAUUSD`, `XAGUSD`, `XPTUSD`, `XPDUSD`; catalog disimpan statis di `src/lib/symbols.ts` dan dapat di-refresh via cron harian)
- `GET /api/symbols/[symbol]` (harga terakhir untuk polling 30 detik) · `GET /api/og/[postId]` (PNG 1200×630)
- `POST/DELETE /api/admin/users/[username]/badges` (admin-only; `verified` & `curator`)

Aturan penting server:
- SEMUA mutasi cek auth & ownership.
- SEMUA input lewat Zod.
- Like/repost/bookmark = INSERT ON CONFLICT DO NOTHING / delete → idempotent.
- Jangan pernah expose `passwordHash`; email hanya ke owner.

---

## 6. Algoritma Feed "Untuk Kamu" (fase 2, sengaja sederhana)

Skor = `recencyScore * 1.0 + authorFollowBonus * 2.0 + engagementScore * 0.5 + signalQuality * 1.5`
- recencyScore: `1 / (1 + hoursSincePost / 6)`
- engagementScore: `log(1 + likes*1 + reposts*2 + replies*1.5)` (normalisasi relatif terhadap max batch)
- signalQuality: `winRate penulis (0..1)` untuk isSignal, 0 untuk non-signal
- Tanpa ML, deterministik. Cache 60 detik per user di memori proses cukup untuk fase awal.

---

## 7. Views / Penonton (definisi agar tidak dobel hitung)

- **Post detail view:** +1 per (userId|ipHash, postId) per 24 jam — tabel `PostView`.
- **Profile view:** sama, tabel `ProfileView`.
- Feed impression TIDAK dihitung sebagai view (mengikuti standar X), hanya detail profile/post.
- Dashboard aggregate: SUM per hari (30 hari terakhir) dari `DailyStat`, di-refresh via cron harian, fallback query langsung bila cron belum jalan.

---

## 8. Aturan Siklus Sinyal (detail resolve — WAJIB dibaca agent Phase 4)

1. Sinyal dibuat `OPEN` (hanya `isSignal=true`).
2. Cron cek setiap menit-an, provider per market (CRYPTO → Binance; METAL → Yahoo futures (`GC=F` dll)):
   - LONG: TP_HIT bila `price >= TP`; SL_HIT bila `price <= SL`.
   - SHORT: TP_HIT bila `price <= TP`; SL_HIT bila `price >= SL`.
   - Prioritas SL jika keduanya ter-touch pada rentang candle yang sama (konservatif).
3. `pnlPercent` = `(TP-entry)/entry*100` untuk LONG (positif saat TP, negatif saat SL); SHORT dibalik tanda. SIMPAN SIGNED.
4. EXPIRED bila `now > createdAt + 3 * timeframeToMinutes(timeframe)` dan masih OPEN; pnl dihitung dari harga saat expire.
5. `CANCELLED`: hanya oleh pembuat, sebelum resolve otomatis (typo dsb) — tidak dihitung win-rate.
6. Notifikasi ke pembuat: "Sinyal BTCUSDT kamu TP 🎉 +3.2%". Badge sniper: setelah ≥ 5 TP_HIT dari 10 sinyal resolved terakhir → award `sniper` (cek juga syarat lain di §9).
7. Anti-manipulasi minimal: bila pembuat override hasil ke TP padahal harga feed membantah (snapshot harga worker disimpan di tabel `SignalCheck(postId, ts, price)`) → tandai `disputed` kecil di UI, jangan tampilkan di kartu share. (Phase 6: kelola lebih baik.)

---

## 9. Badge & Syarat

| Badge | ID | Cara dapat | Tampilan |
|---|---|---|---|
| Akun Terverifikasi | `verified` | Manual/admin (atau email verifikasi + OAuth X) | Badge biru check (DESIGN.md §7) |
| Trader Terkurasi | `curator` | Admin / pilihan sinyal terbaik mingguan | Warna emas |
| Sniper | `sniper` | ≥ 5 TP_HIT dan win-rate ≥ 70% (min. 10 sinyal resolved) | 🎯 |
| Konsisten | `consistent` | ≥ 10 sinyal resolved dan win-rate ≥ 60% | 📈 |
| Profit Hunter | `profit_hunter` | avgPnl ≥ +2% dari ≥ 10 sinyal resolved | 💰 |
| Riset | `analyst` | ≥ 20 post non-signal panjang (≥ 200 char) | 🔍 |

Badge tidak diberikan gratis; hanya lewat cron Phase 4 atau admin (tambah kolom `role String @default("USER")` di User, role `admin` diberikan via seed).

---

## 10. Deliverable per fase agent

- Kode fitur + migrasi Prisma + seed bila perlu
- Update log keputusan di §11 bila ada keputusan desain teknis baru
- Checklist fase:

```
Phase 0: [x]
Phase 1: [x]
Phase 2: [x]
Phase 3: [x]
Phase 4: [x]
Phase 5: [x]
Phase 6: [x]
```

---

## 11. Log Keputusan (diisi agent atau penulis)

| Tanggal | Fase | Keputusan | Alasan |
|---|---|---|---|
| 2026-11-04 | - | Stack Next.js + Tailwind + Prisma + Postgres | Pilihan pengguna |
| 2026-11-04 | - | Harga via Binance (crypto) + Yahoo Finance (metal/forex/saham) + override manual | Pilihan pengguna + kebutuhan sinyal XAUUSD |
| 2026-11-04 | - | UI Bahasa Indonesia | Pilihan pengguna |
| 2026-11-04 | - | Tambah dukungan sinyal METAL (XAUUSD, XAGUSD, dll) + abstraksi PriceFeed | Permintaan pengguna: sinyal emas/metal harus bisa auto-resolve, bukan hanya crypto |

| 2026-11-04 | 0 | Prisma 7: driver adapter `@prisma/adapter-pg` + URL di `prisma.config.ts` + client output `src/generated/prisma`; instance via `@/lib/db` | Prisma 7 breaking change; terverifikasi saat generate |
| 2026-11-04 | 0 | Tailwind v4 CSS-first: token di `globals.css` (`@theme inline`), tidak pakai `tailwind.config.ts` | Konvensi Next 16 scaffold; DESIGN.md §2 diadaptasi |
| 2026-11-04 | 0 | Migrasi DB ditunda ke Phase 1 | Tidak ada Postgres/Docker di env build; schema + client sudah siap |
| 2026-11-04 | 1 | NextAuth v5 beta + strategi JWT; OAuth Google/X hanya didaftarkan bila env kredensial ada | Credentials butuh JWT; Next 16 App Router; env ini belum punya kredensial OAuth |
| 2026-11-04 | 1 | X/Twitter OAuth 2 tidak mengirim email → email sintetis stabil `provider-accountId@oauth.spmtrade.local` | Provider X hanya mengirim id/nama/avatar; tetap bisa dipetakan ke tabel `User` |
| 2026-11-04 | 1 | API auth sendiri (`/api/auth/register|login|logout`, `/api/auth/me`) yang membungkus `signIn`/`signOut` NextAuth | Kontrak API §5 mewajibkan envelope `{ok,...}` + Zod; route catch-all NextAuth tetap dipakai untuk OAuth callback |
| 2026-11-04 | 1 | URL profil `/@username` via dynamic segment `[handle]` + decode `%40`, bukan folder `@` | Folder berawalan `@` dipakai App Router untuk parallel route; page menerima handle ter-encode |
| 2026-11-04 | 1 | `instant = false` pada page profil | Agar `notFound()` mengembalikan status 404 asli (bukan 200 + UI 404 karena streaming) |
| 2026-11-04 | 1 | Avatar/banner disimpan sebagai URL/path (belum upload file) | Cukup untuk seed lokal; upload butuh storage (fase lanjut) |
| 2026-11-04 | 1 | `src/proxy.ts` cek cookie sesi optimistis untuk `/settings/*` | Guest mendapat redirect HTTP 307; validasi sesi penuh tetap di page/route |
| 2026-11-04 | 1 | PostgreSQL 16 lokal + migrasi init + seed 5 akun | Memenuhi syarat Phase 1 (migrasi/seed jalan) di environment tanpa Docker |
| 2026-11-04 | 2 | Tambah relasi self `Post.replyTo/replies` & `Post.quoteOf/quotes` + index `replyToId`, `quoteOfId` | Hitungan balasan & QuoteCard cukup satu query; kolom lama tidak berubah (migrasi `20261104134508`) |
| 2026-11-04 | 2 | Cursor feed: Untuk Kamu memakai offset (skor §6 dihitung atas 300 kandidat), Mengikuti memakai id post | Skor tidak stabil jika cursor createdAt; offset deterministik per request |
| 2026-11-04 | 2 | `SignalStat.totalSignals` naik saat sinyal dibuat (dalam transaksi yang sama) | Statistik profil langsung mencerminkan jumlah sinyal; TP/SL tetap dihitung saat resolve (Phase 4) |
| 2026-11-04 | 2 | Balasan ke balasan diratakan ke root (`replyToId = target.replyToId ?? target.id`) | Thread timeline tetap satu level sesuai §3; detail root menampilkan semua balasan |
| 2026-11-04 | 2 | Compose tersedia sebagai halaman `/compose`, modal di feed, dan FAB mobile; proxy menjaga `/compose` | Memenuhi pola X.com + acceptance guest diarahkan ke login |
| 2026-11-04 | 2 | Detail post mencatat view via `PostView` (user id atau hash IP, per hari) | Sesuai §7; render berulang tidak menambah `Post.views` |
| 2026-11-04 | 2 | Seed 8 post contoh (6 root + 2 balasan, likes) idempoten berbasis author + isi | Feed tidak kosong saat demo; aman dijalankan berulang |
| 2026-11-04 | 2 | `GET /api/feed` memanggil `connection()` di luar try/catch | Cache Components mencoba prerender route; sinyal Next tidak boleh tertelan catch |
| 2026-11-04 | 3 | `FeedPost.viewer` (`liked/reposted/bookmarked`) diisi lewat 3 query batch per halaman | UI butuh status awal untuk toggle optimistis; tetap 1 query per tabel, bukan per post |
| 2026-11-04 | 3 | Notifikasi like/repost/follow dihapus lagi saat unlike/unrepost/unfollow | Menghindari notifikasi stale; quote memakai tipe `repost` dengan `postId` post kutipan baru |
| 2026-11-04 | 3 | Tab **Sinyal** menampilkan semua post root (sinyal + catatan non-sinyal) | Agar catatan/analisa tidak hilang dari profil; label mengikuti spesifikasi |
| 2026-11-04 | 3 | Tab **Simpan** hanya dirender untuk pemilik profil; API `?tab=bookmarks` menolak non-owner (403) | Privasi simpanan |
| 2026-11-04 | 3 | Quote diarahkan ke `/compose?quote=[id]` dengan preview, bukan modal terpisah | Reuse ComposeBox + validasi Zod yang sama; mendukung halaman dan navigasi |
| 2026-11-04 | 3 | Toast global lewat `ToastProvider` di root layout | Dipakai lintas halaman (post, follow, mark-all-read) tanpa prop drilling |
| 2026-11-04 | 3 | Mark-as-read via "Tandai semua dibaca" (`POST /api/notifications/read-all`), belum per item | Sesuai endpoint §5; unread dot per item tetap tampil sampai aksi |
| 2026-11-04 | 3 | Seed menambah 3 repost, 3 simpanan, 9 notifikasi (8 unread) | Agar tab profil, badge nav, dan halaman notifikasi langsung terisi saat demo |
| 2026-11-04 | 4 | `PriceFeed` diperluas dengan `getRange` + `getCandles`; resolver memakai candle sejak entry masing-masing sinyal | Touch TP/SL butuh high/low **setelah entry**; range gabungan per simbol bisa salah menandai sinyal baru karena harga sebelum entry |
| 2026-11-04 | 4 | Metal Yahoo memakai futures `GC=F`/`SI=F`/`PL=F`/`PA=F` (bukan `XAUUSD=X`) | Yahoo men-delist simbol spot `XAUUSD=X` (Not Found); futures masih Yahoo dan cukup untuk trigger TP/SL |
| 2026-11-04 | 4 | Cookie Yahoo diambil via `node:https` + retry 404/429 + fallback query2 | `fetch` di server Next tidak konsisten menyimpan Set-Cookie; tanpa cookie Yahoo membalas "No data found" |
| 2026-11-04 | 4 | Satu jalur `resolveSignal()` untuk cron & manual; `updateMany status=OPEN` mencegah double resolve | Idempoten dan konsisten; stats/notifikasi/badge dihitung sekali |
| 2026-11-04 | 4 | Tambah kolom `Post.resolveNote` (migrasi `20261104143113_signal_resolve_note`) | "Close Manual + alasan" butuh tempat menyimpan catatan; `disputed` menandai override yang bertentangan dengan feed |
| 2026-11-04 | 4 | SL diprioritaskan bila TP & SL sama-sama tersentuh pada rentang fetch | Konservatif sesuai §8.2; range tidak memberi urutan candle intra-range |
| 2026-11-04 | 4 | Badge auto hanya menambah; verified/curator tetap manual; analyst dihapus dari seed riset | Menjaga prinsip "badge non-earned tidak tampil"; analyst baru diberikan bila ≥20 post panjang |
| 2026-11-04 | 4 | Kartu share menolak `disputed` dan hanya untuk TP_HIT/SL_HIT | Anti-manipulasi §8.7; tombol utama hanya muncul untuk TP_HIT |
| 2026-11-04 | 4 | Seed sinyal uji XAUUSD LONG entry 4000/TP 4001/SL 3999 oleh `admin` | Selisih tipis menjamin tersentuh cepat; admin stats total 1 sehingga tidak mengacaukan trader demo |
| 2026-11-04 | 4 | Seed tetap snapshot statistik; setelah cron, `pnpm db:seed` akan mereset angka SignalStat | Seed adalah reset demo; status post yang sudah resolved tidak diubah |
| 2026-11-04 | 5 | Engagement rate = (like + repost + balasan diterima) ÷ tayangan × 100; R:R = rata-rata \|TP−Entry\| ÷ \|Entry−SL\| | Definisi tidak dirinci di §4; dipakai konsisten di kartu, timeseries, dan API |
| 2026-11-04 | 5 | Dashboard memakai `DailyStat` bila hari itu punya cache; hari berjalan dan hari tanpa cache dihitung live | Sesuai §7; angka tetap benar saat cron harian belum dijalankan |
| 2026-11-04 | 5 | Interaksi dihitung dari waktu aksi (`Like/Repost/Post.createdAt`), bukan tanggal post | Tren harian mencerminkan kapan interaksi terjadi |
| 2026-11-04 | 5 | Top post = tayangan 30 hari terbanyak; fallback ke `Post.views` lifetime | Selaras dengan metrik tayangan; like/repost/balasan ditampilkan sebagai pendukung |
| 2026-11-04 | 5 | Mention maks 5 per post, unik, tanpa self-mention, dan dilewati bila penerima sudah dapat notif balasan/kutipan di post yang sama | Mencegah spam dan notifikasi ganda |
| 2026-11-04 | 5 | Chart SVG manual (polyline/path), views & engagement dipisah dua chart | Magnitudo beda jauh; acceptance melarang library chart berat |
| 2026-11-04 | 5 | Seed mengisi `PostView` 30 hari untuk 5 post demo dan menyetel `Post.views` = jumlah view seed | Dashboard langsung berisi; seed tetap menjadi "reset demo" seperti Phase 4 |
| 2026-11-04 | 6 | Pencarian memakai Prisma `contains` (case-insensitive); nama simbol dicocokkan per awal kata | "eth" tidak boleh cocok ke semua pasangan "TetherUS" |
| 2026-11-04 | 6 | Harga `/symbol/[symbol]` memakai `PriceFeed` (cache 60 dtk) + polling klien 30 dtk lewat API | Sesuai DESIGN §3; hemat kuota provider |
| 2026-11-04 | 6 | OG PNG memakai `ImageResponse` dari `next/og` (satori/resvg bawaan Next) | Tanpa dependency chart/render baru |
| 2026-11-04 | 6 | Rate limit tabel DB dengan jendela dibulatkan: login/register 10/menit per IP, posting 10/menit per user | Cegah brute-force & spam tanpa Redis; kompatibel multi-instance |
| 2026-11-04 | 6 | Admin hanya mengelola `verified` & `curator`; badge otomatis tetap dari cron; notifikasi hanya saat badge baru | Sesuai §9 dan menghindari notifikasi ganda |
| 2026-11-04 | 6 | URL `og:image` dibangun absolut dari `x-forwarded-host`/`x-forwarded-proto` | Metadata `og:image` wajib URL absolut |
| 2026-11-05 | audit | Perbaikan audit: TP/SL kronologis per candle (prioritas SL hanya dalam candle yang sama), expiry tanpa bergantung feed (PnL null tidak merusak avg), interval Yahoo 1h (bukan 4h yang tidak valid), simbol CRYPTO wajib katalog, resolve manual tanpa bukti feed = disputed, cron signal-check di vercel.json tiap 5 menit, rate limit login diikat IP+email, dan perbaikan UI (feed retry, right rail, token terang, simbol klik, dsb.) | Audit 2026-11-05; terverifikasi tsc --noEmit, eslint, dan next build (build awal sempat gagal karena segment config dynamic tidak kompatibel dengan Cache Components dan prerender /login — keduanya diperbaiki, lihat share-card/og dan halaman login/register) |

### Catatan operasional Phase 1

- Akun seed memakai password `spmtrade123` (lihat README).
- `AUTH_SECRET` wajib diisi; OAuth opsional.
- Guest dapat melihat `/` dan `/@username`; aksi auth (Ikuti, Kelola profil, edit) diarahkan ke `/login`.

---

## 12. Batasan

- Tidak ada fitur DM fase ini (masuk Phase 7 jika diminta).
- Tidak ada pembayaran/subscription.
- Fokus: postingan sinyal + reputasi + kartu share.
- Ide baru saat build → catat ke §11 sebagai "usulan", jangan langsung koding tanpa persetujuan.
