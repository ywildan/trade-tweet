"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* Tombol kembali ke halaman sebelumnya (bukan selalu ke beranda).
   Bila `href` diisi, tampil sebagai link ke tujuan itu dengan
   tampilan yang sama persis. */
export function BackButton({
  label = "Kembali",
  href,
}: {
  label?: string;
  href?: string;
}) {
  const router = useRouter();
  const className =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text transition-colors hover:bg-text/10";
  const icon = <ArrowLeft size={20} aria-hidden />;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {icon}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      className={className}
    >
      {icon}
    </button>
  );
}
