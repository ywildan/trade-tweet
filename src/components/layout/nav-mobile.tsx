import { MobileNavLink } from "@/components/layout/nav-link";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getSessionUser } from "@/lib/session";

export async function NavMobile() {
  const user = await getSessionUser();
  const unread = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <MobileNavLink href="/" icon="home" label="Utama" exact />
      <MobileNavLink
        href={user ? "/notifications" : "/login?next=%2Fnotifications"}
        icon="bell"
        label="Notifikasi"
        badge={unread}
      />
      <MobileNavLink
        href={user ? "/bookmarks" : "/login?next=%2Fbookmarks"}
        icon="bookmark"
        label="Simpanan"
      />
      <MobileNavLink
        href={user ? "/dashboard" : "/login?next=%2Fdashboard"}
        icon="analytics"
        label="Analitik"
      />
      <MobileNavLink
        href={user ? `/@${user.username}` : "/login"}
        icon="user"
        label={user ? "Profil" : "Masuk"}
        exact
      />
      {user ? (
        <MobileNavLink
          href="/settings/profile"
          icon="settings"
          label="Kelola"
          exact
        />
      ) : (
        <MobileNavLink href="/register" icon="userplus" label="Daftar" />
      )}
    </nav>
  );
}
