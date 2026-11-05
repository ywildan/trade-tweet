import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "Neuraly — Media sosial sinyal trading",
    template: "%s — Neuraly",
  },
  description:
    "Post sinyal trading seperti tweet. Kualitasmu terbukti lewat badge, win-rate, dan kartu share otomatis saat profit.",
};

/**
 * Anti-flash theme (DESIGN.md §10):
 * Tema disimpan di localStorage `theme`; bila belum pernah di-set,
 * ikuti prefers-color-scheme. Dijalankan SEBELUM paint.
 */
const themeScript = `(() => {
  try {
    const stored = localStorage.getItem("theme");
    const theme = stored || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
