"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChartNoAxesColumn, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function UserMenu({
  user,
}: {
  user: {
    name: string;
    username: string;
    avatarUrl: string | null;
    role?: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-full p-2 text-left transition-colors hover:bg-text/10"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={40} />
        <span className="hidden min-w-0 flex-1 lg:block">
          <span className="block truncate text-[15px] font-semibold">
            {user.name}
          </span>
          <span className="block truncate text-[13px] text-text-muted">
            @{user.username}
          </span>
        </span>
        <span className="hidden text-text-muted lg:inline">⋯</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-[60] mb-2 w-[250px] overflow-hidden rounded-2xl border border-border bg-bg-elev py-1 shadow-2xl"
        >
          <Link
            href={`/@${user.username}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[15px] transition-colors hover:bg-text/10"
          >
            <UserRound size={18} />
            Lihat profil
          </Link>
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[15px] transition-colors hover:bg-text/10"
          >
            <ChartNoAxesColumn size={18} />
            Analitik
          </Link>
          <Link
            href="/settings/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[15px] transition-colors hover:bg-text/10"
          >
            <Settings size={18} />
            Kelola profil
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin/badges"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[15px] transition-colors hover:bg-text/10"
            >
              <ShieldCheck size={18} />
              Admin badge
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            disabled={busy}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] transition-colors hover:bg-text/10 disabled:opacity-50"
          >
            <LogOut size={18} />
            {busy ? "Keluar…" : "Keluar"}
          </button>
        </div>
      )}
    </div>
  );
}
