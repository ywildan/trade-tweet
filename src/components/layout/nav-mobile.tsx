import { MobileNavLink } from "@/components/layout/nav-link";
import { GuestMobileNav } from "@/components/layout/guest-mobile-nav";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getSessionUser } from "@/lib/session";

export async function NavMobile() {
  const user = await getSessionUser();

  // Tamu tidak lagi diberi item nav Masuk/Daftar: fitur terproteksi
  // membuka popup masuk/daftar lewat GuestMobileNav.
  if (!user) {
    return <GuestMobileNav />;
  }

  const unread = await getUnreadNotificationCount(user.id);

  // Bottom nav login dibuat compact: 4 item utama saja. Analitik
  // pindah ke halaman profil sendiri, dan Kelola profil sudah
  // terjangkau lewat tombol "Edit profil" di halaman yang sama —
  // keduanya tidak lagi menghabiskan slot nav.
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <MobileNavLink href="/" icon="home" label="Utama" exact />
      <MobileNavLink
        href="/notifications"
        icon="bell"
        label="Notifikasi"
        badge={unread}
      />
      <MobileNavLink href="/bookmarks" icon="bookmark" label="Simpanan" />
      <MobileNavLink
        href={`/@${user.username}`}
        icon="user"
        label="Profil"
        exact
      />
    </nav>
  );
}
