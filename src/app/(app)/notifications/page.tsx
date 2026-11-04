import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/demo/stat-tile";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationItem } from "@/components/notifications/notification-item";
import { getNotifications } from "@/lib/notifications";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Notifikasi",
};

export const instant = false;

type PageProps = {
  searchParams: Promise<{ filter?: string | string[] }>;
};

export default async function NotificationsPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fnotifications");

  const params = await searchParams;
  const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const unreadOnly = raw === "unread";

  const { items, unreadCount } = await getNotifications({
    userId: user.id,
    unreadOnly,
  });

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/65 backdrop-blur">
        <div className="flex h-[53px] items-center justify-between gap-3 px-4">
          <div>
            <h1 className="text-[20px] font-bold leading-6">Notifikasi</h1>
            {unreadCount > 0 && (
              <p className="text-[13px] leading-4 text-text-muted">
                {unreadCount} belum dibaca
              </p>
            )}
          </div>
          {unreadCount > 0 && <MarkAllReadButton />}
        </div>
      </header>

      <nav
        aria-label="Filter notifikasi"
        className="sticky top-[53px] z-10 flex border-b border-border bg-bg/85 backdrop-blur"
      >
        {[
          { id: "all", label: "Semua", href: "/notifications" },
          {
            id: "unread",
            label: "Belum dibaca",
            href: "/notifications?filter=unread",
          },
        ].map((tab) => {
          const active = (tab.id === "unread") === unreadOnly;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 py-3 text-center text-[15px] transition-colors hover:bg-text/[0.03] ${
                active ? "font-bold text-text" : "text-text-muted"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {items.length > 0 ? (
        items.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))
      ) : (
        <EmptyState
          title={unreadOnly ? "Tidak ada yang belum dibaca" : "Belum ada notifikasi"}
          subtitle="Suka, repost, balasan, dan pengikut baru akan muncul di sini."
          cta={
            <Link
              href="/"
              className="rounded-2xl bg-accent px-4 py-2 text-[15px] font-semibold text-white"
            >
              Jelajahi feed
            </Link>
          }
        />
      )}
    </>
  );
}
