import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 pb-16 text-center">
      <Logo size={40} />
      <div>
        <p className="text-[13px] font-semibold text-text-muted">404</p>
        <h1 className="mt-1 text-[26px] font-bold">Halaman tidak ditemukan</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-text-muted">
          Tautan yang kamu buka tidak ada, atau profilnya sudah tidak tersedia.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-[15px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Kembali ke beranda
      </Link>
      <Link href="/login" className="text-[15px] font-semibold text-accent hover:underline">
        Masuk ke Neuraly
      </Link>
    </main>
  );
}
