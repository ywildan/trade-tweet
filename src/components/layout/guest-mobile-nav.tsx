"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Bookmark, ChartNoAxesColumn, X } from "lucide-react";

import { MobileNavLink } from "@/components/layout/nav-link";
import { Button } from "@/components/ui/button";

// Bottom nav tamu (mobile): tanpa item Masuk/Daftar. Fitur yang butuh
// login membuka popup masuk/daftar dengan tujuan yang dipertahankan
// lewat ?next=, bukan lewat item nav.
export function GuestMobileNav() {
  const [prompt, setPrompt] = useState<{
    label: string;
    next: string;
  } | null>(null);

  useEffect(() => {
    if (!prompt) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPrompt(null);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [prompt]);

  const protectedItems = [
    { icon: Bell, label: "Notifikasi", next: "/notifications" },
    { icon: Bookmark, label: "Simpanan", next: "/bookmarks" },
    { icon: ChartNoAxesColumn, label: "Analitik", next: "/dashboard" },
  ];

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <MobileNavLink href="/" icon="home" label="Utama" exact />
        {protectedItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setPrompt({ label: item.label, next: item.next })}
            aria-label={`${item.label} (perlu masuk)`}
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] text-text-muted transition-colors hover:bg-text/10 hover:text-text active:bg-text/10"
          >
            <item.icon size={24} strokeWidth={1.8} aria-hidden />
            {item.label}
          </button>
        ))}
      </nav>

      {prompt && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPrompt(null);
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Masuk atau daftar"
            className="w-full max-w-[400px] rounded-xl border border-border bg-bg p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[19px] font-bold leading-6">
                Masuk dulu untuk {prompt.label.toLowerCase()}
              </h2>
              <button
                type="button"
                onClick={() => setPrompt(null)}
                aria-label="Tutup"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-text/10 hover:text-text"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-[15px] leading-5 text-text-muted">
              {prompt.label} hanya tersedia untuk akun yang sudah masuk.
            </p>
            <div className="mt-5 flex gap-2">
              <Link
                href={`/login?next=${encodeURIComponent(prompt.next)}`}
                className="flex-1"
              >
                <Button className="w-full">Masuk</Button>
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(prompt.next)}`}
                className="flex-1"
              >
                <Button variant="secondary" className="w-full">
                  Daftar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
