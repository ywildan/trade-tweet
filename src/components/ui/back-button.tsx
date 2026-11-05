"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/* Tombol kembali ke halaman sebelumnya (bukan selalu ke beranda). */
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text transition-colors hover:bg-text/10"
    >
      <ArrowLeft size={20} aria-hidden />
    </button>
  );
}
