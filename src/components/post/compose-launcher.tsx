"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PenLine, X } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { ComposeBox } from "@/components/post/compose-box";

type LauncherUser = { name: string; avatarUrl: string | null };

/** Modal compose kecil di feed + FAB mobile (spesifikasi.md §4 Phase 2). */
export function ComposeLauncher({
  user,
  variant = "prompt",
}: {
  user: LauncherUser;
  variant?: "prompt" | "fab";
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const draftRef = useRef(false);

  // DESIGN.md §9: konfirmasi "Buang postingan?" bila ada draf belum terkirim.
  const requestClose = useCallback(() => {
    if (
      draftRef.current &&
      !window.confirm("Buang postingan? Draf yang belum terkirim akan hilang.")
    ) {
      return;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, requestClose]);

  if (variant === "fab") {
    if (
      pathname === "/compose" ||
      pathname === "/notifications" ||
      pathname === "/bookmarks" ||
      pathname.startsWith("/post/") ||
      pathname.startsWith("/settings")
    ) {
      return null;
    }
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buat postingan"
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-colors hover:bg-accent-hover lg:hidden"
        >
          <PenLine size={23} />
        </button>
        {open && <ComposeModal user={user} onClose={requestClose} onDraftChange={(hasDraft) => { draftRef.current = hasDraft; }} onPosted={() => { setOpen(false); router.refresh(); }} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-text/[0.03]"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={40} />
        <span className="flex-1 truncate text-[19px] text-text-muted">
          Ada setup apa hari ini?
        </span>
        <span className="rounded-full bg-accent px-4 py-1.5 text-[15px] font-semibold text-white">
          Posting
        </span>
      </button>
      {open && <ComposeModal user={user} onClose={requestClose} onDraftChange={(hasDraft) => { draftRef.current = hasDraft; }} onPosted={() => { setOpen(false); router.refresh(); }} />}
    </>
  );
}

function ComposeModal({
  user,
  onClose,
  onDraftChange,
  onPosted,
}: {
  user: LauncherUser;
  onClose: () => void;
  onDraftChange: (hasDraft: boolean) => void;
  onPosted: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/60 p-3 sm:p-6 sm:pt-[8vh]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buat postingan"
        className="w-full max-w-[600px] overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
      >
        <div className="flex h-[53px] items-center justify-between border-b border-border px-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-2 transition-colors hover:bg-text/10"
          >
            <X size={20} />
          </button>
          <span className="text-[15px] font-bold">Buat postingan</span>
          <span className="w-9" aria-hidden />
        </div>
        <ComposeBox user={user} autoFocus onPosted={onPosted} onDraftChange={onDraftChange} />
      </div>
    </div>
  );
}
