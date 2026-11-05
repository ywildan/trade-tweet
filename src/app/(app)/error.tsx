"use client";

import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-4 text-center">
      <h2 className="text-[19px] font-bold">Terjadi kesalahan</h2>
      <p className="mt-1 text-[14px] text-text-muted">
        Halaman ini gagal dimuat. Coba lagi, atau kembali ke beranda.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl bg-accent px-4 py-2 text-[14px] font-semibold text-white"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="rounded-2xl border border-border px-4 py-2 text-[14px] font-semibold"
        >
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
