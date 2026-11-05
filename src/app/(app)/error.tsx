"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="p-4 text-center">
      <TriangleAlert
        size={28}
        aria-hidden="true"
        className="mx-auto text-short"
      />
      <h2 className="mt-3 text-[19px] font-bold">Halaman gagal dimuat</h2>
      <p className="mx-auto mt-1 max-w-sm text-[14px] text-text-muted">
        Terjadi kesalahan saat memuat halaman ini. Coba muat ulang, atau
        kembali ke beranda dan buka lagi dari sana.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-accent px-4 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-[14px] font-semibold transition-colors hover:bg-bg-input"
        >
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
