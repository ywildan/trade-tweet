"use client";

import { Moon, Sun } from "lucide-react";

/**
 * ThemeToggle — switch terang/gelap (DESIGN.md §2.1 & §10).
 * Ikon dipilih lewat CSS berdasarkan data-theme di <html>, jadi tidak perlu
 * state React yang disinkronkan dari DOM saat mount.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage bisa diblokir; tema tetap berubah untuk sesi ini.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Ganti tema terang atau gelap"
      title="Ganti tema"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-text transition-colors duration-150 hover:bg-bg-input/60 cursor-pointer"
      type="button"
    >
      <Sun size={18} strokeWidth={2} className="theme-icon-sun" />
      <Moon size={18} strokeWidth={2} className="theme-icon-moon" />
    </button>
  );
}
