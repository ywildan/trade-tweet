import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignalCard } from "@/components/post/signal-card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden border-r border-border bg-bg-elev lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-md">
          <Logo size={44} />
          <h2 className="mt-8 text-[38px] font-bold leading-[1.1]">
            Reputasi trader,
            <br />
            bukan sekadar klaim.
          </h2>
          <p className="mt-3 text-[15px] text-text">
            Setiap sinyal punya siklus hidup dan hasil yang tercatat. TP
            tercapai berarti bukti yang bisa dibagikan.
          </p>
          <div className="mt-8 max-w-sm">
            <SignalCard
              symbol="XAUUSD"
              market="METAL"
              direction="LONG"
              entry={2312.5}
              takeProfit={2340}
              stopLoss={2290}
              timeframe="4H"
              status="TP_HIT"
              pnlPercent={1.19}
            />
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-4 lg:hidden">
          <Logo size={32} />
          <ThemeToggle />
        </div>
        <div className="absolute right-4 top-4 hidden lg:block">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        <p className="px-6 pb-6 text-center text-[13px] text-text-muted">
          Neuraly · Media sosial sinyal trading
          <br />
          <Link href="/privacy" className="hover:underline">
            Privasi
          </Link>
          {" · "}
          <Link href="/terms" className="hover:underline">
            Syarat
          </Link>
        </p>
      </main>
    </div>
  );
}
