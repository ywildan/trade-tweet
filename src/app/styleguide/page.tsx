import Link from "next/link";
import type { Metadata } from "next";
import {
  Home,
  Flame,
  Bell,
  Bookmark,
  User,
  Settings,
  Feather,
  MessageCircle,
  Repeat2,
  Heart,
  Share,
  Trophy,
  Target,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserBadges } from "@/components/ui/badge";
import { DemoPostCard, Avatar } from "@/components/demo/post-card-demo";
import { SignalCard } from "@/components/post/signal-card";
import { StatTile, EmptyState } from "@/components/demo/stat-tile";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = {
  title: "Styleguide",
};

const COLORS: Array<[name: string, cssVar: string]> = [
  ["bg", "--bg"],
  ["bg-elev", "--bg-elev"],
  ["bg-input", "--bg-input"],
  ["border", "--border"],
  ["text", "--text"],
  ["text-muted", "--text-muted"],
  ["accent (aksi tautan/follow)", "--accent"],
  ["like", "--like"],
  ["repost", "--repost"],
  ["save", "--save"],
  ["long (TP/profit)", "--long"],
  ["short (SL/loss)", "--short"],
  ["gold (badge kurator)", "--gold"],
];

const TYPO: Array<[label: string, cls: string, sample: string]> = [
  ["Body 15/20", "text-[15px]", "Para trader setia membagi sinyal dan pengalamannya di sini."],
  ["Nama post 15 semibold", "text-[15px] font-semibold", "Nama Pengguna"],
  ["Header halaman 20 semibold", "text-[20px] font-bold", "Notifikasi"],
  ["Angka besar 32 bold", "text-[32px] font-bold tabular", "+5,88%"],
  ["Meta kecil 13", "text-[13px] text-text-muted", "2 jam · 1,2 rb tayangan"],
];

function Section({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-border px-4 py-6 sm:px-6">
      <h2 className="text-[20px] font-bold">{title}</h2>
      {desc && <p className="mt-0.5 text-[13px] text-text-muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[700px] border-x border-border">
      <header className="sticky top-0 z-20 border-b border-border bg-bg">
        <div className="flex h-[53px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Kembali ke beranda"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text transition-colors hover:bg-bg-input"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <h1 className="text-[19px] font-semibold">Styleguide</h1>
          </div>
          <ThemeToggle />
        </div>
        <nav aria-label="Bagian styleguide" className="flex flex-wrap gap-2 px-4 pb-2 text-[13px]">
          {[
            ["warna", "Warna"],
            ["tipografi", "Tipografi"],
            ["tombol", "Tombol"],
            ["badge", "Badge"],
            ["kartu", "Kartu"],
            ["stat", "Stat & Empty"],
            ["ikon", "Ikon"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="flex min-h-11 items-center rounded-lg border border-border px-3 py-1 text-text-muted transition-colors hover:bg-bg-input hover:text-text">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Section id="warna" title="Warna" desc="Token warna dari globals.css. Gelap adalah bawaan, tombol tema di kanan atas beralih ke terang.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          {COLORS.map(([n, v]) => (
            <div key={n} className="overflow-hidden rounded-xl border border-border">
              <div className="h-14" style={{ background: `var(${v})` }} />
              <div className="px-2 py-1.5 text-[12px]">
                <div className="font-semibold">{n.split(" ")[0]}</div>
                <div className="text-text-muted">{n.split(" ").slice(1).join(" ")}</div>
                <code className="text-text-muted">{v}</code>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="tipografi" title="Tipografi" desc="Font stack sistem, tanpa import font berat. Angka harga memakai tabular-nums agar tidak bergeser.">
        <div className="space-y-3">
          {TYPO.map(([label, cls, sample]) => (
            <div key={label}>
              <div className={cls}>{sample}</div>
              <div className="text-[12px] text-text-muted">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[15px] text-text-muted">
          formatCount(): 999 → “{formatCount(999)}” · 1234 → <b className="text-text">“{formatCount(1234)}”</b> · 2300000 → “{formatCount(2300000)}”
        </div>
      </Section>

      <Section id="tombol" title="Tombol & Ukuran" desc="Teks 15px semibold. Semua varian ada di komponen <Button>.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Posting</Button>
          <Button variant="secondary">Ikuti</Button>
          <Button variant="ghost">Batal</Button>
          <Button variant="danger" disabled>Berhenti ikuti</Button>
          <Button disabled>Memproses…</Button>
          <Button size="sm">Simpan</Button>
          <Button size="lg">Posting</Button>
        </div>
      </Section>

      <Section id="badge" title="Badge" desc="Verified memakai check biru. Badge reputasi lain berupa chip kecil, bukan hiasan.">
        <div className="space-y-2 text-[15px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">Papa Emas</span>
            <UserBadges types={["verified"]} />
            <span className="ml-2 font-semibold">Ibu Koin</span>
            <UserBadges types={["sniper", "consistent"]} />
            <span className="ml-2 font-semibold">Whale X</span>
            <UserBadges types={["curator", "profit_hunter"]} />
            <span className="ml-2 font-semibold">Riset Kucing</span>
            <UserBadges types={["analyst"]} />
          </div>
          <div className="text-[13px] text-text-muted">ukuran sm (di dalam PostCard):</div>
          <div className="flex items-center gap-1.5 text-[13px]">
            <Avatar name="Papa Emas" size={20} />
            <span className="text-[13px] font-semibold">Papa Emas</span>
            <UserBadges types={["verified", "sniper"]} size="sm" />
          </div>
        </div>
      </Section>

      <Section id="kartu" title="PostCard + SignalCard + QuoteCard" desc="Anatomi lengkap. Contoh 2 post: XAUUSD (METAL, SHORT) dan BTCUSDT (LONG).">
        <DemoPostCard symbol="XAUUSD" />
        <PostCardVariant />
      </Section>

      <Section id="stat" title="StatTile & EmptyState" desc="Contoh tampilan komponen, bukan data akun nyata.">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Tayangan 30 hari" value="84 rb" delta={12} />
          <StatTile label="Win-rate" value="72%" delta={-3} />
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <EmptyState
            title="Belum ada sinyal di sini… belum"
            subtitle="Jadilah yang pertama dengan mempost sinyal XAUUSD."
            cta={<Button size="sm">Buat sinyal</Button>}
          />
        </div>
      </Section>

      <Section id="ikon" title="Ikon" desc="lucide-react, stroke 2 (nav 1.8), size nav 26 / engagement 18. Setiap ikon dipilih karena relevan dengan isinya.">
        <div className="flex flex-wrap gap-5 text-text">
          {[Home, Flame, Bell, Bookmark, User, Settings, Feather, MessageCircle, Repeat2, Heart, Share, Trophy, Target].map((I, i) => (
            <I key={i} size={i < 6 ? 26 : 18} strokeWidth={i < 6 ? 1.8 : 2} aria-hidden="true" />
          ))}
        </div>
      </Section>

      <footer className="px-6 py-8 text-[13px] text-text-muted">
        Neuraly · Token warna dan radius mengikuti globals.css
      </footer>
    </div>
  );
}

// Contoh PostCard kedua: BTCUSDT LONG yang sudah TP (lihat chip).
function PostCardVariant() {
  return (
    <article className="border-b border-border p-4 transition-colors duration-150 hover:bg-text/3">
      <div className="flex gap-3">
        <Avatar name="Whal" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px]">
            <span className="font-semibold">Whal X</span>
            <UserBadges types={["verified", "curator", "profit_hunter"]} size="sm" />
            <span className="ml-1 text-text-muted">@whalex</span>
            <span className="text-text-muted">·</span>
            <time className="text-text-muted">1 d</time>
          </div>
          <p className="mt-1">Result di sini. TP tercapai 2 hari sejak entry</p>
          <SignalCard
            symbol="BTCUSDT"
            direction="LONG"
            entry={42500}
            takeProfit={45000}
            stopLoss={41000}
            timeframe="1D"
            status="TP_HIT"
            pnlPercent={5.88}
          />
        </div>
      </div>
    </article>
  );
}
