import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Syarat Layanan",
  description:
    "Syarat layanan Neuraly: aturan akun, konten, dan batasan tanggung jawab.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[19px] font-bold">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-7 text-text">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-5 pb-16 pt-10">
      <Logo size={36} />
      <h1 className="mt-6 text-[28px] font-bold leading-9">Syarat Layanan</h1>
      <p className="mt-1 text-[14px] text-text-muted">
        Terakhir diperbarui: 5 November 2026 · Neuraly
        (trade-tweet.vercel.app)
      </p>

      <Section title="Layanan">
        <p>
          Neuraly adalah media sosial untuk membagikan setup dan sinyal
          trading, dengan reputasi yang terukur lewat win-rate, badge, dan
          kartu hasil. Kamu memakai layanan ini dengan sukarela dan atas
          risikomu sendiri.
        </p>
      </Section>

      <Section title="Bukan nasihat investasi">
        <p>
          Semua sinyal, analisa, dan konten di Neuraly adalah opini pengguna
          masing-masing, bukan nasihat investasi, rekomendasi, atau ajakan
          membeli dan menjual aset apa pun. Trading mengandung risiko
          kerugian. Selalu lakukan risetmu sendiri sebelum mengikuti sinyal
          siapa pun.
        </p>
      </Section>

      <Section title="Akun">
        <p>
          Kamu bertanggung jawab atas akun dan kata sandimu. Satu orang
          memakai satu akun. Jangan berpura-pura menjadi orang lain, jangan
          memakai nama pengguna yang meniru orang atau merek lain, dan jangan
          membagikan akses akunmu ke pihak lain.
        </p>
      </Section>

      <Section title="Konten">
        <p>
          Kamu tetap pemilik konten yang kamu posting, dan kamu memberi
          Neuraly izin untuk menampilkannya di dalam layanan. Dilarang
          memposting spam, penipuan, konten yang memanipulasi hasil (misalnya
          mengklaim profit palsu), ujaran kebencian, atau konten yang
          melanggar hukum. Konten yang melanggar dapat dihapus dan akunnya
          dapat ditangguhkan.
        </p>
      </Section>

      <Section title="Ketersediaan dan tanggung jawab">
        <p>
          Layanan disediakan &ldquo;sebagaimana adanya&rdquo; dan dapat
          berubah atau berhenti sewaktu-waktu. Neuraly tidak bertanggung jawab
          atas kerugian trading, kehilangan data, atau gangguan layanan.
        </p>
      </Section>

      <Section title="Perubahan syarat">
        <p>
          Syarat ini dapat diperbarui sewaktu-waktu; tanggal di atas
          menunjukkan versi terakhir. Bila kamu terus memakai layanan setelah
          perubahan, berarti kamu menyetujui syarat yang baru.
        </p>
      </Section>

      <Section title="Hubungi kami">
        <p>
          Pertanyaan tentang syarat ini:{" "}
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
        <Link className="text-accent underline" href="/privacy">
          Kebijakan Privasi
        </Link>
        {" · "}
        <Link className="text-accent underline" href="/">
          Kembali ke Neuraly
        </Link>
      </p>
    </main>
  );
}
