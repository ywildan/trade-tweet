"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  ChartNoAxesColumn,
  Home,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { formatCount } from "@/lib/format";

export type NavIconName =
  | "home"
  | "user"
  | "userplus"
  | "bell"
  | "bookmark"
  | "analytics"
  | "admin"
  | "settings"
  | "search";

const ICONS: Record<NavIconName, LucideIcon> = {
  home: Home,
  user: UserRound,
  userplus: UserPlus,
  bell: Bell,
  bookmark: Bookmark,
  analytics: ChartNoAxesColumn,
  admin: ShieldCheck,
  settings: Settings,
  search: Search,
};

function useActive(href: string, exact: boolean) {
  const pathname = usePathname();
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  icon,
  label,
  exact = false,
  badge = 0,
}: {
  href: string;
  icon: NavIconName;
  label: string;
  exact?: boolean;
  badge?: number;
}) {
  const active = useActive(href, exact);
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="flex w-fit items-center justify-center gap-4 rounded-full px-3 py-3 text-text transition-colors hover:bg-text/10 lg:w-full lg:justify-start"
    >
      <span className="relative inline-flex">
        <Icon size={26} strokeWidth={active ? 2.2 : 1.8} />
        <CountBadge count={badge} />
      </span>
      <span
        className={`hidden text-[19px] lg:inline ${
          active ? "font-bold" : "font-normal"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export function MobileNavLink({
  href,
  icon,
  label,
  exact = false,
  badge = 0,
}: {
  href: string;
  icon: NavIconName;
  label: string;
  exact?: boolean;
  badge?: number;
}) {
  const active = useActive(href, exact);
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
        active ? "font-bold text-text" : "text-text-muted"
      }`}
    >
      <span className="relative inline-flex">
        <Icon size={24} strokeWidth={active ? 2.2 : 1.8} />
        <CountBadge count={badge} />
      </span>
      {label}
    </Link>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1.5 min-w-[18px] rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-[18px] text-white tabular">
      {count > 99 ? "99+" : formatCount(count)}
    </span>
  );
}
