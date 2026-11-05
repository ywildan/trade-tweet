"use client";

import { useRouter } from "next/navigation";

/** Tombol kembali ke halaman sebelumnya (bukan selalu ke beranda). */
export function BackButton({ label = "Kembali" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      className="-ml-1 rounded-full p-2 text-[20px] transition-colors hover:bg-text/10"
    >
      ←
    </button>
  );
}
