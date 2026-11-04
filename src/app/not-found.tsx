import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo size={40} />
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-text-muted">
          404
        </p>
        <h1 className="mt-1 text-[26px] font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 max-w-sm text-[15px] text-text-muted">
          Tautan yang kamu buka tidak ada, atau profilnya sudah tidak tersedia.
        </p>
      </div>
      <Link href="/">
        <Button>Kembali ke Utama</Button>
      </Link>
    </main>
  );
}
