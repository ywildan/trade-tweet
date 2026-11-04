# SPMTRADE — Spesifikasi Desain, Layout & UI

> Pendamping file `spesifikasi.md`. Semua keputusan visual ada di sini.
> **Prinsip:** tiru tata letak & pola interaksi **X.com**, tapi identitas visual trader: hijau/merah PnL, tipografi monotone, dark-mode-first.
> Nama komponen di §4 dipakai konsisten di seluruh fase (agent wajib memakai nama ini).

---

## 1. Layout Global (seperti X.com)

```
┌────────────────────────────────────────────────────────────────────┐
│  [sidebar kiri]      [kolom tengah 600px]   [sidebar kanan 350px]   │
│                                                                    │
│  (logo di atas)      ┌─ Sticky Header ─┐      ┌─ Search box ─┐     │
│  🏠 Utama            │ kembali/brand + │      │  Cari trader │     │
│  🔥 Untuk Kamu       │      tab        │      └──────────────┘     │
│  🔔 Notifikasi       ├─────────────────┤                           │
│  🔖 Simpanan         │   Compose box   │     ┌─ Kartu "Trader ───┐ │
│  👤 Profil           ├─────────────────┤     │  minggu ini" ─────┘ │
│  ⚙ Kelola            │   Feed list     │     ┌─ Kartu "Siapa di- ┐│
│  [Tombol Post besar] │   (infinite)    │     │  ikuti" ─────────┘│
│  [akun bawah kiri]   │                 │     └─ SPMTrade footer   │
└────────────────────────────────────────────────────────────────────┘
```

| Breakpoint | Behaviour |
|---|---|
| `< 1024px` (mobile/tablet portrait) | Sidebar kiri = **bottom nav bar** ikon saja; sidebar kanan SEMBUNYI. Tombol Post = **FAB** (floating action button) kanan-bawah. |
| `1024–1280px` | Sidebar kiri ikon saja (tanpa label); kolom tengah; sidebar kanan `hidden xl:block`. |
| `>= 1280px` | Full layout; sidebar kiri dengan label. |
| Max-width seluruh area konten | 1265px, centered. |

- Sticky topbar di kolom tengah: `backdrop-blur` + background alpha 65% (seperti X); tinggi 53px.
- Border antar item feed & kolom = 1px warna `--border`.
- Konten tengah (`<main>`): `min-height: 100vh`, `border-x` 1px, tidak pernah lebih lebar 600px.

---

## 2. Design Token

> **Catatan implementasi (Tailwind v4, Phase 0):** token di bawah diimplement di `src/app/globals.css` sebagai CSS variables + blok `@theme inline` (Tailwind v4 tidak memakai `tailwind.config.ts`). Utilitas class hasilnya: `bg-bg`, `bg-bg-elev`, `border-border`, `text-text`, `text-text-muted`, `text-accent`, `bg-long`, `text-short`, dll.

### 2.1 Warna

Dark mode default (vibe gelap X.com + aksen brand):

```css
:root (dark = default) {
  --bg:          #000000;   /* body "lights out" */
  --bg-elev:     #16181c;   /* card, modal, panel */
  --bg-input:    #202327;
  --border:      #2f3336;
  --text:        #e7e9ea;
  --text-muted:  #71767b;
  --accent:      #1d9bf0;   /* biru aktif (tautan, follow, dsb) */
  --accent-hover:#1a8cd8;
  --like:        #f91880;   /* like pink */
  --repost:      #00ba7c;   /* repost hijau */
  --save:        #1d9bf0;   /* bookmark biru */
  --long:        #00ba7c;   /* arah LONG / TP → hijau */
  --short:       #f4212e;   /* arah SHORT / SL → merah */
  --gold:        #d4a017;   /* badge curated/emas */
  --verified:    #1d9bf0;   /* checkmark biru */
}
[data-theme="light"] {
  --bg:          #ffffff;
  --bg-elev:     #f7f9f9;
  --bg-input:    rgba(0,0,0,0.03);
  --border:      #eff3f4;
  --text:        #0f1419;
  --text-muted:  #536471;
}
```

- Kontras teks utama vs `--bg` minimal AA (4.5:1). Warna di atas sudah aman.
- PnL WAJIB pakai `--long`/`--short` (jangan pakai `--accent`).
- Toggle tema disimpan di localStorage `theme`, set `data-theme` ke `<html>` sebelum paint (script inline kecil anti-flash).

### 2.2 Tipografi

```css
font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
             "InterVariable", Inter, system-ui, sans-serif;
```
| Elemen | Ukuran |
|---|---|
| Body default | 15px / 20px, weight 400 |
| Post content | 15px (halaman detail post: 17px) |
| Nama di Post | 15px semibold; handle · waktu: 15px regular `--text-muted` |
| Header halaman (page title) | 20px semibold |
| Button utama | 15px semibold |
| Angka besar kartu share & dashboard | 120px (kartu share) / 32px (dashboard), bold |
| Meta kecil (badge, timestamp) | 13px |

- Truncasi nama panjang: 1 baris `text-ellipsis`; handle boleh truncate (`@verylon…`).
- Angka ringkas ala X: `1.234` → `1,2 rb`; `2.300.000` → `2,3 jt`. Buat helper `formatCount()`.

### 2.3 Spacing & Bentuk
- Radius: post card 0 (flat, pakai divider), tombol/modal 16px, avatar bulat penuh, kartu quote/sinyal 16px, input 8px, FAB 50%.
- Padding compose: 16px. Grid post: avatar 40px + gutter 12px + konten flex-1.
- Z-index: tooltip 10; sticky header 20; modal overlay 50; dropdown 60; toast 70.
- Motion: `transition 150ms ease` hover; `200ms ease-out` modal fade+scale 0.96→1; like pop keyframe `scale(1)→1.3→1` 300ms. Kurva: `cubic-bezier(0, 0, 0.2, 1)`.

---

## 3. Halaman & Isi (per halaman: komponen)

| Path | Isi |
|---|---|
| `/` | Feed + 2 tab (Untuk Kamu / Mengikuti) ala X. Kanan: Search + Simbol trending + "Trader minggu ini" + "Siapa diikuti". Untuk tamu: hero kecil di atas feed + tombol Masuk/Daftar. |
| `/login`, `/register` | 2 kolom ala X (kiri ilustrasi & logo, kanan form). Error inline warna `--short`. |
| `@/[username]` | Banner 3:1 → avatar 120px overlap -60px → nama+badge → handle → bio → meta (join date, lokasi, jumlah following/followers klik → modal list) → tombol Follow/Edit profil → statistik strip mini (win-rate, total sinyal, avg pnl) → tab: Sinyal \| Balasan \| Repost \| Simpan (jika self view) |
| `/post/[id]` | Root post besar (konten 17px) + statistik strip (views, repost, quote, like, bookmark, waktu) + compose reply inline + list reply. |
| `/compose` (modal & halaman) | Avatar + textarea autosize (max 280) + counter bulat + toggle "Ini sinyal" → form grid 2 kolom (lihat §6). |
| `/notifications` | tab Semua \| Disematkan. Item: ikon jenis aksi (like pink, repost hijau, follow biru, sinyal resolve 🎯) + teks + post terkait kecil. |
| `/bookmarks` | list simpanan + tombol hapus dari simpanan. |
| `/dashboard` | grid kartu 2×2 + grafik 2 baris (detail Phase 5 di spesifikasi.md). |
| `/admin/badges` | khusus admin: daftar user + tombol beri/cabut badge manual. |
| `/symbol/[symbol]` | feed sinyal suatu simbol + header ticker + harga singkat (poll 30s; on Phase 4). Metalkan juga: `/symbol/XAUUSD`. |
| `/search?q=` | tab Utama \| Trader \| Sinyal (Phase 6). |
| `/styleguide` (internal) | Showcase semua token, tombol, badge, kartu & contoh share-card inline. |

---

## 4. Komponen (daftar wajib, nama konsisten)

| Nama | Dipakai di | Keterangan |
|---|---|---|
| `PostCard` | feed, profil, reply, search | Anatomi di §5.1 |
| `SignalCard` | PostCard bila isSignal | Panel sinyal di dalam post (§5.2) |
| `QuoteCard` | PostCard quote | Kartu kutipan di dalam post (§5.3) |
| `ComposeBox` | halaman compose & modal | |
| `FollowButton` | profil, UserCard | 3 status: Follow / Following (hover→"Unfollow" merah) / Self→Edit |
| `UserCard` | trend "Siapa diikuti", hasil search, modal follower | |
| `Badge` | nama user di mana-mana | §7 |
| `ShareCardButton` | post TP_HIT | download SVG & copy-link |
| `EngagementBar` | footer PostCard | like/repost/balas/simpan + bagikan |
| `NavSidebar` / `NavMobile` | global | |
| `RightRail` | global desktop | |
| `NotificationItem` | halaman notifikasi | |
| `StatTile`, `LineChart`, `Sparkline` | dashboard | |
| `EmptyState` | semua list kosong | "Belum ada apa pun di sini… belum" + CTA |
| `Modal`, `Toast` | global | |

---

## 5. Anatomi Kartu Utama

### 5.1 PostCard (ala X.com)
```
[avatar 40px]  Nama ✓ @handle · 2 jam
               konten teks (mention & $SYMBOL clickable)
               ┌─ SignalCard bila isSignal ─┐
               └────────────────────────────┘
               ┌─ QuoteCard bila quote ─────┐
               └────────────────────────────┘
  💬 12   🔁 34   ♡ 120   🔖 5     (warna default `--text-muted`)
```
- Klik area post (bukan tombol/mention/simbol) → `/post/[id]`; hover bg alpha 3%.
- Ikon hover state: reply → `--accent`; repost → `--repost`; like → `--like`; bookmark → `--save`. Saat aktif: warna permanen + filled + pop animation.
- Nama/avatar clickable → profil (stopPropagation).

### 5.2 SignalCard (di dalam PostCard)
```
┌────────────────────────────────────────────────┐
│ XAUUSD  ▲ LONG   ·  4H       [OPEN/TP/SL chip] │  ← simbol bold (clickable), arah pill, TF muted
│                                                │
│ Entry     2312,50        TP    2340,00      ▲ │  ← grid 2 kolom; TP hijau, SL merah, tabular-nums
│ Stop Loss 2290,00    ▼   Potensi  +1,19%    ● │  ← pnl Potensi saat OPEN; hasil saat resolved
└────────────────────────────────────────────────┘
```
- Latar `--bg-elev`, radius 16, border 1px `--border`, padding 12.
- LONG pill: bg hijau alpha 15%, teks hijau; SHORT pill: merah alpha 15%, teks merah.
- Status chip: OPEN abu; TP_HIT hijau solid; SL_HIT merah solid; EXPIRED abu tua.
- Simbol clickable → `/symbol/BTCUSDT` atau `/symbol/XAUUSD`.
- Angka `tabular-nums` supaya tidak goyang saat update.

### 5.3 QuoteCard
- Border 1px radius 16, padding 12, hover border `--text-muted`. Isi mini PostCard (avatar 20px, nama, content 15px, line-clamp-2). Klik → post sumber.

### 5.4 ShareCard SVG (kartu bagikan 1200×675)
```
┌──────────────────────────────────────────────────────────┐
│ [logo SPMTrade]                 TRADER TERVERIFIKASI ✓   │  (y 48–80)
│                                                          │
│   XAUUSD · LONG                                          │  (y 120: simbol 64px bold)
│   TP TERCAPAI 🎯                                         │  (y 180: label 28px uppercase, letterspacing 2)
│                                                          │
│   +5,88%                                                 │  (y 260–360: angka 120px bold, hijau #00ba7c)
│                                                          │
│   Entry 2312,50 → TP 2340,00    ·    Stop 2290,00        │  (y 420: 28px, abu muda)
│   ─────────────────────────────────────────              │
│   @username   win-rate 78%   12 sinyal                   │  (y 580–640: footer strip)
└──────────────────────────────────────────────────────────┘
```
- Background: gelap `#0b0f14` + pattern grid halus (garis 1px alpha 4% tiap 60px) + gradasi radial hijau alpha 8% dari kanan-bawah saat TP / merah alpha 8% + label "SL TERSENTUH" saat kalah.
- Font: pakai font-family fallback sistem, JANGAN import font file berat ke SVG.
- Output: `image/svg+xml`, viewBox `0 0 1200 675`, tanpa dependensi eksternal; semua angka & warna dirender server-side dari data post.
- Header response: `Content-Disposition: attachment; filename="spmtrade-XAUUSD-TP-<postid>.svg"` bila query `?download=1`.

### 5.5 StatTile (dashboard)
- Kartu bg-elev radius-16 padding-16; label kecil muted; angka 32px bold; delta chip hijau/merah (▲/▼); sparkline.

---

## 6. Compose Box

1. Baris atas: avatar + `Textarea` autosize + counter.
2. Toggle **"Ini sinyal"** (pill button; aktif = bg `--accent`) → buka grid form:

| Kolom | Input | Wajib? |
|---|---|---|
| Simbol | input + autocomplete; uppercase auto | Ya |
| Market | segmented **CRYPTO \| METAL \| FOREX \| STOCK** (default CRYPTO; FOREX & STOCK disabled dgn tooltip "Segera"). METAL (XAUUSD, XAGUSD, dll) aktif penuh. | Auto CRYPTO |
| Arah | segmented **LONG (hijau)** \| **SHORT (merah)** | Ya |
| Entry | number | Ya |
| TP / SL | number | Ya |
| Timeframe | dropdown 15m/1h/4h/1d/1w default "4h" | Ya |
3. Tombol kirim: `Posting` primary; disabled saat invalid/kosong/loading (spinner 16px).
4. Validasi LIVE: pesan inline di bawah field yang salah, warna `--short` (mis. "TP harus di atas Entry untuk LONG").

---

## 7. Badge & Chip

| Badge | Bentuk |
|---|---|
| Verified | Lingkaran biru + centang putih (SVG inline 18px di sebelah nama, tooltip "Akun terverifikasi") |
| Curator | Lingkaran emas + bintang |
| Sniper 🎯 | pill, bg `--gold` alpha 12%, teks `--gold`, radius penuh, 12px |
| Konsisten 📈 | pill, bg `--accent` alpha 12% |
| Profit Hunter 💰 | pill |
| Analyst 🔍 | pill |

- Selalu dipasangkan setelah nama di PostCard, profil header, UserCard, dan footer share-card.

---

## 8. Ikonografi

- **lucide-react**: `Home`, `Flame` (Untuk Kamu), `Bell`, `Bookmark`, `User`, `Settings`, `Feather`/`PenLine` (compose), `MessageCircle` (balas), `Repeat2` (repost), `Heart` (like), `Share`, `Trophy`, `Target`.
- Size: nav 26px; engagement 18px; badge check 18px; chip 12px. Stroke-width 2 (nav 1.8).
- Semua ikon-as-action punya `aria-label` + tooltip custom (bukan native title).

---

## 9. Pola Interaksi (micro)

| Aksi | Behaviour |
|---|---|
| Like | optimistic set (pink + pop 300ms), gagal → rollback + toast |
| Follow | tombol langsung "Mengikuti" outline; hover saat sudah mengikuti → teks & border merah "Berhenti ikuti" |
| Repost | klik → dropdown: "Repost" / "Kutip postingan"; kutip → compose dengan quote terisi |
| Simpan | toggle langsung; toast "Ditambahkan ke Simpanan" + tombol "Lihat" |
| Compose modal | ESC tutup; konfirmasi "Buang postingan?" bila ada konten belum terkirim |
| Load thread | skeleton 3 kartu saat loading; tidak flash kosong |
| Infinite scroll | IntersectionObserver + spinner; habis → "Kamu sudah melihat semuanya" |
| Error global | toast kanan-bawah, auto-dismiss 3s, util `toast()` reusable |

---

## 10. Detail Kecil

- Default tema bila belum pernah set: ikut `prefers-color-scheme`.
- Hover baris post: overlay alpha 3% — bukan full color swap.
- Selection color: `--accent` alpha 30%.
- Scrollbar custom tipis (6px, thumb `--border`).
- Focus ring: `ring 2px --accent alpha 40%` (a11y).
- Skeleton: bg `--bg-input`, animate pulse.
- Avatar fallback: inisial 2 huruf dari nama di bg deterministik (hash username → 1 dari 8 warna palet).

---

## 11. Copywriting UI (Bahasa Indonesia — wajib konsisten)

| X.com | Kita |
|---|---|
| Home | Utama |
| For you / Following | Untuk Kamu / Mengikuti |
| Notifications | Notifikasi |
| Bookmarks | Simpanan |
| Profile | Profil |
| What is happening? | Ada setup apa hari ini? |
| Post | Posting |
| Reply | Balas |
| Repost | Repost |
| Quote | Kutip |
| Like | Suka |
| Follow / Unfollow | Ikuti / Berhenti ikuti |
| Followers / Following | Pengikut / Mengikuti |
| Saved | Disimpan |
| Share | Bagikan |
| Win rate | Win-rate |
| Take Profit hit | TP tercapai 🎯 |
| Stop Loss hit | SL tersentuh |
| views | tayangan |

> Istilah trading tetap EN: Long, Short, TP, SL, Entry, Timeframe, PnL, Win-rate. Jangan campur varian (mis. "Regem").
