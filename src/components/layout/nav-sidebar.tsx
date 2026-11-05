import Link from "next/link";
import { PenLine } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NavLink } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getSessionUser } from "@/lib/session";

export async function NavSidebar() {
  const user = await getSessionUser();
  const unread = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col justify-between overflow-y-auto px-2 py-3 lg:flex xl:w-[275px] xl:px-3">
      <div>
        <Link
          href="/"
          aria-label="Neuraly, beranda"
          className="flex w-fit items-center gap-2 rounded-lg p-3 transition-colors hover:bg-text/10"
        >
          <LogoMark size={32} />
          <span className="hidden text-[22px] font-bold tracking-tight lg:inline">
            Neural<span className="text-accent">y</span>
          </span>
        </Link>

        <h2 className="mt-4 px-3 text-[13px] font-semibold text-text-muted">
          Menu
        </h2>
        <nav className="mt-1 space-y-1" aria-label="Navigasi utama">
          <NavLink href="/" icon="home" label="Utama" exact />
          <NavLink href="/search" icon="search" label="Cari" />
          <NavLink
            href={user ? "/notifications" : "/login?next=%2Fnotifications"}
            icon="bell"
            label="Notifikasi"
            badge={unread}
          />
          <NavLink
            href={user ? "/bookmarks" : "/login?next=%2Fbookmarks"}
            icon="bookmark"
            label="Simpanan"
          />
          <NavLink
            href={user ? `/@${user.username}` : "/login"}
            icon="user"
            label={user ? "Profil" : "Masuk"}
            exact
          />
        </nav>

        {/* Trading dipisah dari nav utama supaya sidebar terbaca sebagai
            panel trading, bukan daftar ikon. */}
        <h2 className="mt-5 px-3 text-[13px] font-semibold text-text-muted">
          Trading
        </h2>
        <nav className="mt-1 space-y-1" aria-label="Navigasi trading">
          <NavLink
            href={user ? "/dashboard" : "/login?next=%2Fdashboard"}
            icon="analytics"
            label="Analitik"
          />
          {user && (
            <NavLink
              href="/settings/profile"
              icon="settings"
              label="Kelola"
              exact
            />
          )}
          {user?.role === "admin" && (
            <NavLink
              href="/admin/badges"
              icon="admin"
              label="Admin"
              exact
            />
          )}
        </nav>

        <Link
          href={user ? "/compose" : "/login?next=%2Fcompose"}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          <PenLine size={20} aria-hidden />
          Posting
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-center lg:justify-start lg:px-1">
          <ThemeToggle />
        </div>

        {user ? (
          <UserMenu
            user={{
              name: user.name ?? user.username,
              username: user.username,
              avatarUrl: user.image ?? null,
              role: user.role,
            }}
          />
        ) : (
          <div className="space-y-2 lg:px-1">
            <Link href="/login" className="block">
              <Button className="w-full">Masuk</Button>
            </Link>
            <Link href="/register" className="block">
              <Button variant="secondary" className="w-full">
                Daftar
              </Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
