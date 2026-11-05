import { Suspense } from "react";
import { NavSidebar } from "@/components/layout/nav-sidebar";
import { NavMobile } from "@/components/layout/nav-mobile";
import { MobileComposeFab } from "@/components/layout/mobile-compose-fab";
import { RightRail } from "@/components/layout/right-rail";

// Tiga keadaan lebar: kolom tunggal di bawah lg, dua kolom (sidebar +
// konten) di lg, shell penuh tiga kolom di xl.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[1400px] justify-center">
        <Suspense fallback={<SidebarFallback />}>
          <NavSidebar />
        </Suspense>

        <main className="min-h-screen w-full min-w-0 max-w-[600px] flex-1 border-x border-border pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:max-w-[640px] lg:pb-0">
          {children}
        </main>

        <aside className="hidden w-[320px] shrink-0 px-4 xl:block xl:w-[350px]">
          <Suspense fallback={<RailFallback />}>
            <RightRail />
          </Suspense>
        </aside>
      </div>

      <Suspense fallback={null}>
        <NavMobile />
      </Suspense>

      <Suspense fallback={null}>
        <MobileComposeFab />
      </Suspense>
    </>
  );
}

function SidebarFallback() {
  return (
    <div className="hidden w-[240px] shrink-0 lg:block xl:w-[275px]" aria-hidden />
  );
}

function RailFallback() {
  return (
    <div className="space-y-4 py-2" aria-hidden>
      <div className="h-11 rounded-lg bg-bg-input" />
      <div className="h-56 rounded-xl bg-bg-elev" />
      <div className="h-56 rounded-xl bg-bg-elev" />
    </div>
  );
}
