import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan privasi Neuraly: data apa yang kami kumpulkan, untuk apa, dan bagaimana kamu mengelolanya.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[19px] font-bold">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-7 text-text-muted">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-5 py-10">
      <Logo size={36} />
      <h1 className="mt-6 text-[28px] font-bold leading-9">Kebijakan Privasi</h1>
      <p className="mt-1 text-[14px] text-text-muted">
        Terakhir diperbarui: 5 November 2026 · Neuraly
        (trade-tweet.vercel.app)
      </p>

      <Section title="Data yang kami kumpulkan">
        <p>
          Saat kamu membuat akun, kami menyimpan nama, username, alamat
          email, dan foto profil bila ada. Bila kamu masuk dengan Google,
          Google mengirimkan nama, alamat email, dan foto profil akun
          Google-mu — hanya itu yang kami terima dari Google, dan kami tidak
          mengakses email, kontak, atau data Google-mu yang lain.
        </p>
        <p>
          Di dalam aplikasi, kami menyimpan konten yang kamu buat (postingan
          dan sinyal trading), interaksi (suka, repost, simpan, ikuti), serta
          data penggunaan seperti jumlah tayangan profil dan postingan untuk
          menghitung statistik dan badge.
        </p>
      </Section>

      <Section title="Untuk apa data dipakai">
        <p>
          Data dipakai untuk menjalankan layanan: menampilkan akun dan
          kontenmu, menghitung win-rate dan badge, mengirim notifikasi, dan
          menjaga keamanan (misalnya membatasi percobaan login yang
          berlebihan). Kami tidak menjual data pribadi dan tidak
          menampilkannya ke pengiklan.
        </p>
      </Section>

      <Section title="Pihak ketiga">
        <p>
          Layanan ini berjalan di infrastruktur Vercel (hosting) dan
          PostgreSQL (basis data), serta memakai Google hanya sebagai
          penyedia login. Data tidak dibagikan ke pihak lain kecuali bila
          diwajibkan hukum.
        </p>
      </Section>

      <Section title="Cookie dan sesi">
        <p>
          Kami memakai cookie sesi untuk membuatmu tetap masuk, dan
          penyimpanan lokal di browser untuk preferensi tema. Tidak ada
          cookie pelacak iklan.
        </p>
      </Section>

      <Section title="Hak kamu">
        <p>
          Kamu bisa mengubah nama, bio, dan foto profil dari halaman profil.
          Untuk menghapus akun beserta datanya, hubungi kami lewat email di
          bawah — penghapusan bersifat permanen dan tidak dapat dibatalkan.
        </p>
      </Section>

      <Section title="Hubungi kami">
        <p>
          Pertanyaan tentang kebijakan ini:{" "}
          <a
            className="text-accent underline"
            href="mailto:yuwiaffa@gmail.com"
          >
            yuwiaffa@gmail.com
          </a>
          .
        </p>
      </Section>

      <p className="mt-10 border-t border-border pt-4 text-[13px] text-text-muted">
        <Link className="text-accent underline" href="/terms">
          Syarat Layanan
        </Link>
        {" · "}
        <Link className="text-accent underline" href="/">
          Kembali ke Neuraly
        </Link>
      </p>
    </main>
  );
}
