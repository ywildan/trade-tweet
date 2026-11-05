"use client";

import { Moon, Sun } from "lucide-react";

/* ThemeToggle: switch terang/gelap. Ikon dipilih lewat CSS dari data-theme
   di <html>, jadi tidak perlu state React yang disinkronkan saat mount. */
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
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-text transition-colors duration-150 hover:bg-bg-input/60"
      type="button"
    >
      <Sun size={18} strokeWidth={2} className="theme-icon-sun" />
      <Moon size={18} strokeWidth={2} className="theme-icon-moon" />
    </button>
  );
}
