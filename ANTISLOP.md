# ANTISLOP — Arah rombakan UI/UX Neuraly

Catatan arah ini ditulis karena DESIGN.md sengaja diabaikan atas perintah
pemilik produk (2026-11-05). Skill antislop v3.2.26 aktif dalam mode DURING
(pilihan sesi). File ini adalah Design Read + alasan satu baris tiap keputusan
(R-31), bukan pengganti DESIGN.md.

## Design Read

> Reading this as: a social trading app for Indonesian retail traders, in a
> calm professional terminal language, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

- ENERGY 1, karena trader membaca angka dengan tenang, layar tidak boleh
  berteriak.
- RHYTHM 2, karena layar aplikasi konsisten dengan beberapa jeda yang disengaja
  (sinyal unggulan, dashboard).
- MOTION 1, karena hanya hover state, tidak ada yang bergerak tanpa aksi
  pengguna.

## Token

- Palet adalah identitas produk, bukan default: hijau LONG #00ba7c, merah
  SHORT #f4212e, biru aksen #1d9bf0, sisanya netral hitam/putih/abu. Aksen biru
  hanya di momen kunci (aksi utama, tautan), bukan di semua elemen.
- Radius berskala 4/8/12 (input 8, kartu 12, tombol 8). Pil hanya untuk chip
  status kecil, bukan semua elemen.
- Bayangan hanya satu tingkat elevasi untuk menu/dialog, dengan alasan
  tertulis. Selain itu permukaan rata.
- Tanpa gradien, tanpa glow, tanpa grid latar. Kaca (backdrop-blur)
  dihapus dari semua header sticky, diganti latar solid.
- Tipografi: system sans stack, karena bawaan perangkat, cepat, dan terbaca
  untuk angka rapat. Angka harga/PnL memakai tabular-nums agar tidak
  bergeser. Tanpa heading monospace, tanpa label uppercase dengan tracking
  lebar.
- Tema gelap tetap default dengan toggle yang berfungsi, karena ini terminal
  trading yang ditatap lama dan gelap mengurangi silau (R-21). Toggle harus
  bekerja penuh di kedua mode (R-34).

## Shell dan layout (R-30: jangan lagi meniru X)

- Tiga wilayah tetap ada, tetapi karakternya bukan tiruan X: rel kiri adalah
  navigasi berlabel per seksi, kolom tengah sedikit lebih lebar dengan header
  halaman yang nyata, rel kanan adalah panel "Pasar" (ticker, simbol trending,
  trader teratas) dengan perlakuan kartu yang bervariasi mengikuti isi.
- Satu focal point per layar: kartu sinyal adalah bintangnya, angka dulu,
  hiasan kemudian.
- Feed bervariasi mengikuti isi (RHYTHM 2): sinyal yang sudah resolve mendapat
  perlakuan berbeda dari baris standar, bukan semua kartu identik.
- Dashboard dibangun di sekitar satu keputusan ("sinyal mana yang butuh
  perhatian"), bukan deret stat default. Tile stat hanya angka nyata dengan
  periode pembanding yang bernama; delta tanpa pembanding nyata dihapus.
- Mobile adalah layout sendiri, bukan desktop yang diperkecil: tiga keadaan
  lebar (kolom tunggal, dua kolom, shell penuh), tanpa overflow horizontal,
  target sentuh minimal 44px dengan jarak, navigasi bawah tidak menutupi
  konten terakhir.

## Copy (Bahasa Indonesia tetap)

- Tanpa em dash di teks mana pun (R-02). Pemisah judul memakai "·" atau koma.
- Tanpa buzzword (R-16), tanpa CTA generik (R-15), tanpa angka tanpa sumber
  (R-17), tanpa testimoni fiktif (R-18).
- State kosong, loading, dan error menyebut penyebab dan aksi berikutnya.
- Status tidak pernah hanya warna: arah dan status selalu berpasangan dengan
  teks atau ikon.

## Aksesibilitas

- Lapisan dasar: semua kontrol aktif `cursor: pointer`, nonaktif
  `cursor: not-allowed`.
- Indikator fokus `:focus-visible` yang terlihat, kontras 3:1, di kedua tema.
- Setiap field punya `<label>` terlihat; tombol ikon saja punya `aria-label`;
  semua kontrol bisa dijangkau keyboard dan dialog bisa ditutup Escape.
- Gerakan non-esensial mati di `prefers-reduced-motion`.
- Setiap pasangan warna teks dicek dengan contrast-check.py dan dicatat.

## Ikon

- Lucide tetap dipakai dengan alasan tertulis: goresan 24px yang konsisten
  cocok untuk terminal padat, dan tiap ikon dipilih karena relevan dengan
  isinya, bukan karena pustakanya. Ikon generik (sparkle, petir, robot)
  dilarang.

## Batasan

- Jangan ubah logika bisnis: resolusi sinyal, harga, auth, cron, kontrak API,
  skema Prisma. Jangan tambah dependensi. Jangan ubah DESIGN.md (abaikan saja)
  dan jangan hapus file apa pun yang tidak diganti.
- Semua rute, copy Bahasa Indonesia, merek Neuraly, dan mark lilin tetap.
  Halaman privasi/syarat hanya di-skin ulang, isinya tetap.
- Komentar kode di file yang disentuh dipangkas ke yang membawa info
  (antislop-code); kode tidak diubah kecuali untuk UI.
- Verifikasi: tsc, eslint, next build, cek kontras tercatat, click-through
  lewat browser (lebar mobile + kedua tema), lalu laporan Delivery Gate
  empat blok sebelum diserahkan.
